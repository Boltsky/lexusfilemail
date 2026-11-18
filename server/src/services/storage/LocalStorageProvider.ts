import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Readable } from 'stream';
import {
  IStorageProvider,
  StorageInitUploadResult,
  StorageChunkResult,
  StorageDownloadResult,
} from './IStorageProvider.js';
import { config } from '../../config/index.js';

export class LocalStorageProvider implements IStorageProvider {
  public readonly name = 'local';
  private baseDir: string;
  private sessionState: Map<
    string,
    {
      transferId: string;
      filename: string;
      filePath: string;
      totalBytes: number;
      bytesUploaded: number;
      mimeType: string;
    }
  > = new Map();

  constructor(baseDir?: string) {
    this.baseDir = baseDir || config.localStorageDir;
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
    console.log(`[LocalStorageProvider] Initialized local file storage at: ${this.baseDir}`);
  }

  async initUpload(params: {
    filename: string;
    mimeType: string;
    size: number;
    transferId: string;
  }): Promise<StorageInitUploadResult> {
    const transferDir = path.join(this.baseDir, params.transferId);
    if (!fs.existsSync(transferDir)) {
      fs.mkdirSync(transferDir, { recursive: true });
    }

    const fileRef = `${crypto.randomUUID()}-${params.filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const targetFilePath = path.join(transferDir, fileRef);

    // Create an empty file to receive chunks
    fs.writeFileSync(targetFilePath, Buffer.alloc(0));

    const sessionId = `local-session-${crypto.randomUUID()}`;
    const sessionUrl = `local://${sessionId}`;

    this.sessionState.set(sessionId, {
      transferId: params.transferId,
      filename: params.filename,
      filePath: targetFilePath,
      totalBytes: params.size,
      bytesUploaded: 0,
      mimeType: params.mimeType,
    });

    return {
      sessionUrl,
      storageFileRef: fileRef,
    };
  }

  async uploadChunk(params: {
    sessionUrl: string;
    chunkBuffer: Buffer;
    startByte: number;
    endByte: number;
    totalBytes: number;
    filename?: string;
  }): Promise<StorageChunkResult> {
    const sessionId = params.sessionUrl.replace('local://', '');
    const session = this.sessionState.get(sessionId);

    if (!session) {
      throw new Error(`Invalid local upload session: ${params.sessionUrl}`);
    }

    // Write chunk buffer at specific byte offset
    const fd = fs.openSync(session.filePath, 'r+');
    try {
      fs.writeSync(fd, params.chunkBuffer, 0, params.chunkBuffer.length, params.startByte);
    } finally {
      fs.closeSync(fd);
    }

    const bytesUploaded = params.endByte + 1;
    session.bytesUploaded = bytesUploaded;

    const isCompleted = bytesUploaded >= params.totalBytes;

    let checksum: string | undefined = undefined;
    if (isCompleted) {
      const fileBuffer = fs.readFileSync(session.filePath);
      checksum = crypto.createHash('md5').update(fileBuffer).digest('hex');
      this.sessionState.delete(sessionId);
    }

    return {
      completed: isCompleted,
      fileId: path.relative(this.baseDir, session.filePath).replace(/\\/g, '/'),
      checksum,
      bytesUploaded,
    };
  }

  async getUploadStatus(sessionUrl: string, totalBytes: number): Promise<{ lastByteUploaded: number }> {
    const sessionId = sessionUrl.replace('local://', '');
    const session = this.sessionState.get(sessionId);
    if (!session) {
      return { lastByteUploaded: 0 };
    }
    return { lastByteUploaded: Math.max(0, session.bytesUploaded - 1) };
  }

  async downloadFileStream(
    fileId: string,
    range?: { start: number; end?: number }
  ): Promise<StorageDownloadResult> {
    const fullPath = path.resolve(this.baseDir, fileId);

    // Prevent path traversal attacks
    if (!fullPath.startsWith(this.baseDir)) {
      throw new Error('Access denied: Invalid file path.');
    }

    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${fileId}`);
    }

    const stats = fs.statSync(fullPath);
    const totalSize = stats.size;

    let stream: Readable;
    let contentLength = totalSize;
    let contentRange: string | undefined = undefined;

    if (range) {
      const start = range.start;
      const end = range.end !== undefined ? range.end : totalSize - 1;
      contentLength = end - start + 1;
      contentRange = `bytes ${start}-${end}/${totalSize}`;
      stream = fs.createReadStream(fullPath, { start, end });
    } else {
      stream = fs.createReadStream(fullPath);
    }

    return {
      stream,
      contentLength,
      contentType: 'application/octet-stream',
      contentRange,
    };
  }

  async deleteFile(fileId: string): Promise<void> {
    const fullPath = path.resolve(this.baseDir, fileId);
    if (fullPath.startsWith(this.baseDir) && fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }

  async deleteTransferFolder(transferId: string): Promise<void> {
    const transferDir = path.resolve(this.baseDir, transferId);
    if (transferDir.startsWith(this.baseDir) && fs.existsSync(transferDir)) {
      fs.rmSync(transferDir, { recursive: true, force: true });
    }
  }

  async getStorageUsage(): Promise<{ usedBytes: number; totalBytes?: number }> {
    let totalBytes = 0;
    const calculateDirSize = (dir: string) => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
          calculateDirSize(filePath);
        } else {
          totalBytes += stats.size;
        }
      }
    };

    try {
      if (fs.existsSync(this.baseDir)) {
        calculateDirSize(this.baseDir);
      }
    } catch {
      // Ignore
    }

    return {
      usedBytes: totalBytes,
      totalBytes: 500 * 1024 * 1024 * 1024, // 500 GB virtual limit
    };
  }
}
