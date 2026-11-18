import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';
import fs from 'fs';
import {
  IStorageProvider,
  StorageInitUploadResult,
  StorageChunkResult,
  StorageDownloadResult,
} from './IStorageProvider.js';
import { config } from '../../config/index.js';

export class GoogleDriveStorageProvider implements IStorageProvider {
  public readonly name = 'google_drive';
  private drive: drive_v3.Drive | null = null;
  private authClient: any = null;
  private folderCache: Map<string, string> = new Map();

  constructor() {
    this.initializeAuth();
  }

  private initializeAuth(): void {
    try {
      if (config.googleServiceAccountJson) {
        let creds: any;
        if (config.googleServiceAccountJson.trim().startsWith('{')) {
          creds = JSON.parse(config.googleServiceAccountJson);
        } else if (fs.existsSync(config.googleServiceAccountJson)) {
          const content = fs.readFileSync(config.googleServiceAccountJson, 'utf8');
          creds = JSON.parse(content);
        }

        if (creds) {
          this.authClient = new google.auth.JWT({
            email: creds.client_email,
            key: creds.private_key,
            scopes: ['https://www.googleapis.com/auth/drive'],
          });
          this.drive = google.drive({ version: 'v3', auth: this.authClient });
          console.log('[GoogleDriveStorage] Successfully authenticated using Service Account:', creds.client_email);
          return;
        }
      }

      if (config.googleClientId && config.googleClientSecret && config.googleRefreshToken) {
        const oauth2Client = new google.auth.OAuth2(
          config.googleClientId,
          config.googleClientSecret
        );
        oauth2Client.setCredentials({ refresh_token: config.googleRefreshToken });
        this.authClient = oauth2Client;
        this.drive = google.drive({ version: 'v3', auth: this.authClient });
        console.log('[GoogleDriveStorage] Successfully authenticated using OAuth2 refresh token.');
        return;
      }

      console.warn('[GoogleDriveStorage] No Google credentials configured. Google Drive provider will be inactive until credentials are provided.');
    } catch (err) {
      console.error('[GoogleDriveStorage] Error initializing Google Auth:', err);
    }
  }

  public isConfigured(): boolean {
    return this.drive !== null && this.authClient !== null;
  }

  private async getAccessToken(): Promise<string> {
    if (!this.authClient) {
      throw new Error('Google Drive client is not authenticated.');
    }
    const tokenResponse = await this.authClient.getAccessToken();
    const token = typeof tokenResponse === 'string' ? tokenResponse : tokenResponse?.token;
    if (!token) {
      throw new Error('Could not retrieve access token for Google Drive API.');
    }
    return token;
  }

  /**
   * Find or create a folder in Google Drive (supporting Shared Drives)
   */
  public async getOrCreateFolder(folderName: string, parentFolderId?: string): Promise<string> {
    if (!this.drive) throw new Error('Google Drive client not configured');

    const cacheKey = `${parentFolderId || 'root'}:${folderName}`;
    if (this.folderCache.has(cacheKey)) {
      return this.folderCache.get(cacheKey)!;
    }

    const driveId = config.googleDriveSharedDriveId;
    const parentQuery = parentFolderId
      ? `'${parentFolderId}' in parents`
      : driveId
      ? `'${driveId}' in parents`
      : "'root' in parents";

    const q = `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName}' and ${parentQuery} and trashed = false`;

    const listParams: drive_v3.Params$Resource$Files$List = {
      q,
      fields: 'files(id, name)',
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    };

    if (driveId) {
      listParams.corpora = 'drive';
      listParams.driveId = driveId;
    }

    const res = await this.drive.files.list(listParams);
    if (res.data.files && res.data.files.length > 0) {
      const folderId = res.data.files[0].id!;
      this.folderCache.set(cacheKey, folderId);
      return folderId;
    }

    // Folder doesn't exist, create it
    const parents = parentFolderId
      ? [parentFolderId]
      : driveId
      ? [driveId]
      : undefined;

    const createParams: drive_v3.Params$Resource$Files$Create = {
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents,
      },
      fields: 'id, name',
      supportsAllDrives: true,
    };

    const created = await this.drive.files.create(createParams);
    const newFolderId = created.data.id!;
    this.folderCache.set(cacheKey, newFolderId);
    return newFolderId;
  }

  /**
   * Prepare hierarchical folder structure for transfer:
   * LexusMail / Transfers / YYYY / MM / <transferId>
   */
  public async getTransferFolderId(transferId: string): Promise<string> {
    const rootFolderId = await this.getOrCreateFolder(config.googleDriveRootFolder);
    const transfersFolderId = await this.getOrCreateFolder('Transfers', rootFolderId);

    const now = new Date();
    const yearStr = now.getFullYear().toString();
    const monthStr = (now.getMonth() + 1).toString().padStart(2, '0');

    const yearFolderId = await this.getOrCreateFolder(yearStr, transfersFolderId);
    const monthFolderId = await this.getOrCreateFolder(monthStr, yearFolderId);
    const transferFolderId = await this.getOrCreateFolder(transferId, monthFolderId);

    return transferFolderId;
  }

  /**
   * Initiate a resumable upload session with Google Drive
   */
  async initUpload(params: {
    filename: string;
    mimeType: string;
    size: number;
    transferId: string;
  }): Promise<StorageInitUploadResult> {
    const accessToken = await this.getAccessToken();
    const folderId = await this.getTransferFolderId(params.transferId);

    const metadata: any = {
      name: params.filename,
      parents: [folderId],
    };

    let uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true';

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': params.mimeType || 'application/octet-stream',
        'X-Upload-Content-Length': params.size.toString(),
      },
      body: JSON.stringify(metadata),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Google Drive resumable upload initialization failed (${response.status}): ${errText}`);
    }

    const sessionUrl = response.headers.get('location');
    if (!sessionUrl) {
      throw new Error('Google Drive API did not return a resumable upload Location header.');
    }

    return { sessionUrl };
  }

  /**
   * Upload a chunk to Google Drive's resumable session URL
   */
  async uploadChunk(params: {
    sessionUrl: string;
    chunkBuffer: Buffer;
    startByte: number;
    endByte: number;
    totalBytes: number;
    filename?: string;
  }): Promise<StorageChunkResult> {
    const chunkLength = params.chunkBuffer.length;
    const contentRange = `bytes ${params.startByte}-${params.endByte}/${params.totalBytes}`;

    const response = await fetch(params.sessionUrl, {
      method: 'PUT',
      headers: {
        'Content-Length': chunkLength.toString(),
        'Content-Range': contentRange,
      },
      body: params.chunkBuffer,
    });

    // 308 Resume Incomplete indicates chunk was received but more chunks needed
    if (response.status === 308) {
      return {
        completed: false,
        bytesUploaded: params.endByte + 1,
      };
    }

    // 200 or 201 indicates upload is finished
    if (response.status === 200 || response.status === 201) {
      const fileData = (await response.json()) as any;
      return {
        completed: true,
        fileId: fileData.id,
        checksum: fileData.md5Checksum,
        bytesUploaded: params.totalBytes,
      };
    }

    const errText = await response.text();
    throw new Error(`Google Drive chunk upload failed with HTTP ${response.status}: ${errText}`);
  }

  /**
   * Query the status of an ongoing Google Drive resumable upload session
   */
  async getUploadStatus(sessionUrl: string, totalBytes: number): Promise<{ lastByteUploaded: number }> {
    const response = await fetch(sessionUrl, {
      method: 'PUT',
      headers: {
        'Content-Length': '0',
        'Content-Range': `bytes */${totalBytes}`,
      },
    });

    if (response.status === 308) {
      const rangeHeader = response.headers.get('range');
      if (rangeHeader) {
        const match = rangeHeader.match(/bytes=0-(\d+)/);
        if (match && match[1]) {
          return { lastByteUploaded: parseInt(match[1], 10) };
        }
      }
      return { lastByteUploaded: 0 };
    }

    if (response.status === 200 || response.status === 201) {
      return { lastByteUploaded: totalBytes - 1 };
    }

    return { lastByteUploaded: 0 };
  }

  /**
   * Stream a file download with optional Range header pass-through
   */
  async downloadFileStream(
    fileId: string,
    range?: { start: number; end?: number }
  ): Promise<StorageDownloadResult> {
    if (!this.drive) throw new Error('Google Drive client not configured');

    const headers: Record<string, string> = {};
    if (range) {
      headers['Range'] = `bytes=${range.start}-${range.end !== undefined ? range.end : ''}`;
    }

    // First fetch file metadata for accurate content length & MIME type
    const meta = await this.drive.files.get({
      fileId,
      fields: 'id, name, mimeType, size',
      supportsAllDrives: true,
    });

    const totalSize = meta.data.size ? parseInt(meta.data.size, 10) : undefined;
    const contentType = meta.data.mimeType || 'application/octet-stream';

    const res = await this.drive.files.get(
      {
        fileId,
        alt: 'media',
        supportsAllDrives: true,
      },
      {
        responseType: 'stream',
        headers,
      }
    );

    let contentLength = totalSize;
    let contentRange: string | undefined = undefined;

    if (range && totalSize !== undefined) {
      const end = range.end !== undefined ? range.end : totalSize - 1;
      contentLength = end - range.start + 1;
      contentRange = `bytes ${range.start}-${end}/${totalSize}`;
    }

    return {
      stream: res.data as Readable,
      contentLength,
      contentType,
      contentRange,
    };
  }

  /**
   * Delete a file by fileId
   */
  async deleteFile(fileId: string): Promise<void> {
    if (!this.drive) return;
    try {
      await this.drive.files.delete({
        fileId,
        supportsAllDrives: true,
      });
      console.log(`[GoogleDriveStorage] Successfully deleted file: ${fileId}`);
    } catch (err: any) {
      if (err.code === 404) {
        console.warn(`[GoogleDriveStorage] File already deleted: ${fileId}`);
        return;
      }
      throw err;
    }
  }

  /**
   * Delete entire transfer folder and its children
   */
  async deleteTransferFolder(transferId: string): Promise<void> {
    if (!this.drive) return;
    try {
      const folderId = await this.getTransferFolderId(transferId);
      await this.drive.files.delete({
        fileId: folderId,
        supportsAllDrives: true,
      });
      console.log(`[GoogleDriveStorage] Successfully deleted transfer folder: ${transferId} (${folderId})`);
    } catch (err) {
      console.warn(`[GoogleDriveStorage] Transfer folder could not be deleted or already gone: ${transferId}`, err);
    }
  }

  async getStorageUsage(): Promise<{ usedBytes: number; totalBytes?: number }> {
    if (!this.drive) return { usedBytes: 0 };
    try {
      const about = await this.drive.about.get({
        fields: 'storageQuota',
      });
      const quota = about.data.storageQuota;
      return {
        usedBytes: quota?.usage ? parseInt(quota.usage, 10) : 0,
        totalBytes: quota?.limit ? parseInt(quota.limit, 10) : undefined,
      };
    } catch (err) {
      console.error('[GoogleDriveStorage] Could not fetch storage usage:', err);
      return { usedBytes: 0 };
    }
  }
}
