import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import archiver from 'archiver';
import crypto from 'crypto';
import { db } from '../db/db.js';
import { config } from '../config/index.js';
import { TokenService } from '../services/token.js';
import { getStorageProvider } from '../services/storage/index.js';
import { EmailService } from '../services/email/EmailService.js';

export class DownloadController {
  private static verifyDownloadGrant(token: string, grantHeader?: string): boolean {
    if (!grantHeader) return false;
    try {
      const decoded = jwt.verify(grantHeader, config.jwtSecret) as any;
      return decoded.tokenHash === TokenService.hashTransferToken(token);
    } catch {
      return false;
    }
  }

  /**
   * Retrieve transfer metadata for public download landing page
   */
  static async getPublicTransfer(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;
      const grant = req.headers['x-download-grant'] as string | undefined;

      const tokenHash = TokenService.hashTransferToken(token);
      const transfer = await db.queryOne<any>(
        'SELECT * FROM transfers WHERE transfer_token_hash = $1',
        [tokenHash]
      );

      if (!transfer) {
        res.status(404).json({ success: false, error: 'Transfer not found or link has expired.' });
        return;
      }

      // Check active state
      if (!transfer.is_active || transfer.status === 'deleted') {
        res.status(410).json({ success: false, error: 'This transfer has been deleted by the sender.' });
        return;
      }

      // Check expiration
      const now = new Date();
      const expiresAt = new Date(transfer.expires_at);
      if (expiresAt < now || transfer.status === 'expired') {
        // Mark as expired in DB if not already
        if (transfer.status !== 'expired') {
          await db.execute("UPDATE transfers SET status = 'expired' WHERE id = $1", [transfer.id]);
        }
        res.status(410).json({ success: false, error: 'This transfer has expired and is no longer available.' });
        return;
      }

      // Check download limits
      if (transfer.max_downloads && transfer.download_count >= transfer.max_downloads) {
        res.status(410).json({
          success: false,
          error: `The maximum download limit (${transfer.max_downloads}) for this transfer has been reached.`,
        });
        return;
      }

      const hasPassword = Boolean(transfer.password_hash);
      const isUnlocked = !hasPassword || DownloadController.verifyDownloadGrant(token, grant);

      if (hasPassword && !isUnlocked) {
        res.json({
          success: true,
          transfer: {
            requiresPassword: true,
            title: transfer.title || 'LexusMail File Transfer',
            senderEmail: transfer.sender_email,
            fileCount: transfer.file_count,
            totalSizeBytes: parseInt(transfer.total_size_bytes, 10),
            expiresAt: transfer.expires_at,
          },
        });
        return;
      }

      // Transfer is unlocked, fetch complete file listing
      const files = await db.query<any>(
        "SELECT id, original_filename, mime_type, file_size_bytes, download_count FROM transfer_files WHERE transfer_id = $1 AND status = 'completed'",
        [transfer.id]
      );

      res.json({
        success: true,
        transfer: {
          id: transfer.id,
          requiresPassword: false,
          title: transfer.title || 'LexusMail File Transfer',
          message: transfer.message,
          senderEmail: transfer.sender_email,
          fileCount: transfer.file_count,
          totalSizeBytes: parseInt(transfer.total_size_bytes, 10),
          downloadCount: transfer.download_count,
          maxDownloads: transfer.max_downloads,
          expiresAt: transfer.expires_at,
          createdAt: transfer.created_at,
          files: files.map(f => ({
            id: f.id,
            filename: f.original_filename,
            mimeType: f.mime_type,
            sizeBytes: parseInt(f.file_size_bytes, 10),
            downloadCount: f.download_count,
          })),
        },
      });
    } catch (err: any) {
      console.error('[DownloadController.getPublicTransfer] Error:', err);
      res.status(500).json({ success: false, error: 'Failed to retrieve transfer information' });
    }
  }

  /**
   * Verify password on password-protected transfer and issue download grant token
   */
  static async verifyPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;
      const { password } = req.body;

      if (!password) {
        res.status(400).json({ success: false, error: 'Password is required' });
        return;
      }

      const tokenHash = TokenService.hashTransferToken(token);
      const transfer = await db.queryOne<any>(
        'SELECT id, password_hash FROM transfers WHERE transfer_token_hash = $1',
        [tokenHash]
      );

      if (!transfer || !transfer.password_hash) {
        res.status(404).json({ success: false, error: 'Transfer not found or not password protected.' });
        return;
      }

      const isMatch = await bcrypt.compare(password, transfer.password_hash);
      if (!isMatch) {
        res.status(401).json({ success: false, error: 'Incorrect password.' });
        return;
      }

      // Issue grant valid for 2 hours
      const downloadGrant = jwt.sign(
        { transferId: transfer.id, tokenHash },
        config.jwtSecret,
        { expiresIn: '2h' }
      );

      res.json({
        success: true,
        downloadGrant,
      });
    } catch (err: any) {
      console.error('[DownloadController.verifyPassword] Error:', err);
      res.status(500).json({ success: false, error: 'Password verification failed' });
    }
  }

  /**
   * Stream single file download directly from storage provider
   */
  static async streamFile(req: Request, res: Response): Promise<void> {
    try {
      const { token, fileId } = req.params;
      const grant = req.headers['x-download-grant'] as string | undefined || req.query.grant as string | undefined;

      const tokenHash = TokenService.hashTransferToken(token);
      const transfer = await db.queryOne<any>(
        'SELECT * FROM transfers WHERE transfer_token_hash = $1',
        [tokenHash]
      );

      if (!transfer || !transfer.is_active || transfer.status !== 'completed') {
        res.status(404).json({ success: false, error: 'Transfer not found or unavailable' });
        return;
      }

      if (new Date(transfer.expires_at) < new Date()) {
        res.status(410).json({ success: false, error: 'Transfer has expired.' });
        return;
      }

      if (transfer.max_downloads && transfer.download_count >= transfer.max_downloads) {
        res.status(410).json({ success: false, error: 'Max downloads reached.' });
        return;
      }

      if (transfer.password_hash && !DownloadController.verifyDownloadGrant(token, grant)) {
        res.status(401).json({ success: false, error: 'Password authorization required to download.' });
        return;
      }

      const file = await db.queryOne<any>(
        'SELECT * FROM transfer_files WHERE id = $1 AND transfer_id = $2',
        [fileId, transfer.id]
      );

      if (!file || !file.drive_file_id) {
        res.status(404).json({ success: false, error: 'File not found in this transfer' });
        return;
      }

      // Handle HTTP Range Requests
      const rangeHeader = req.headers.range;
      let range: { start: number; end?: number } | undefined = undefined;

      if (rangeHeader) {
        const parts = rangeHeader.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : undefined;
        if (!isNaN(start)) {
          range = { start, end };
        }
      }

      const storage = getStorageProvider();
      const downloadResult = await storage.downloadFileStream(file.drive_file_id, range);

      // Safe filename encoding for Content-Disposition header
      const safeFilename = encodeURIComponent(file.original_filename);

      res.setHeader('Content-Type', file.mime_type || downloadResult.contentType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${file.original_filename}"; filename*=UTF-8''${safeFilename}`);
      res.setHeader('Accept-Ranges', 'bytes');

      if (downloadResult.contentRange) {
        res.status(206);
        res.setHeader('Content-Range', downloadResult.contentRange);
      } else {
        res.status(200);
      }

      if (downloadResult.contentLength !== undefined) {
        res.setHeader('Content-Length', downloadResult.contentLength.toString());
      }

      // Stream file to client
      downloadResult.stream.pipe(res);

      // Log download and increment count once stream starts
      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      await db.execute(
        `INSERT INTO download_logs (id, transfer_id, file_id, is_zip_download, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [crypto.randomUUID(), transfer.id, file.id, db.isPostgres ? false : 0, ip, userAgent]
      );

      await db.execute(
        'UPDATE transfers SET download_count = download_count + 1 WHERE id = $1',
        [transfer.id]
      );

      await db.execute(
        'UPDATE transfer_files SET download_count = download_count + 1 WHERE id = $1',
        [file.id]
      );

      // Notify sender if configured
      EmailService.sendDownloadNotification({
        senderEmail: transfer.sender_email,
        transferTitle: transfer.title,
        downloadedFile: file.original_filename,
        ipAddress: ip,
      }).catch(err => console.error('[DownloadNotify] Error:', err));
    } catch (err: any) {
      console.error('[DownloadController.streamFile] Error:', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: 'File download failed' });
      }
    }
  }

  /**
   * Stream dynamically generated multi-file ZIP archive
   */
  static async streamArchive(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;
      const grant = req.headers['x-download-grant'] as string | undefined || req.query.grant as string | undefined;

      const tokenHash = TokenService.hashTransferToken(token);
      const transfer = await db.queryOne<any>(
        'SELECT * FROM transfers WHERE transfer_token_hash = $1',
        [tokenHash]
      );

      if (!transfer || !transfer.is_active || transfer.status !== 'completed') {
        res.status(404).json({ success: false, error: 'Transfer not found or unavailable' });
        return;
      }

      if (new Date(transfer.expires_at) < new Date()) {
        res.status(410).json({ success: false, error: 'Transfer has expired.' });
        return;
      }

      if (transfer.max_downloads && transfer.download_count >= transfer.max_downloads) {
        res.status(410).json({ success: false, error: 'Max downloads reached.' });
        return;
      }

      if (transfer.password_hash && !DownloadController.verifyDownloadGrant(token, grant)) {
        res.status(401).json({ success: false, error: 'Password authorization required.' });
        return;
      }

      const files = await db.query<any>(
        "SELECT * FROM transfer_files WHERE transfer_id = $1 AND status = 'completed'",
        [transfer.id]
      );

      if (files.length === 0) {
        res.status(404).json({ success: false, error: 'No files available to download in this transfer.' });
        return;
      }

      const zipFilename = transfer.title
        ? `${transfer.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.zip`
        : `LexusMail-Transfer-${transfer.id.slice(0, 8)}.zip`;

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

      const storage = getStorageProvider();
      const archive = archiver('zip', { zlib: { level: 5 } });

      archive.on('error', (err) => {
        console.error('[ArchiveStream] Archiver error:', err);
        if (!res.headersSent) {
          res.status(500).end();
        }
      });

      // Pipe archive stream directly into HTTP response
      archive.pipe(res);

      // Append each file stream sequentially
      for (const file of files) {
        if (file.drive_file_id) {
          try {
            const fileDownload = await storage.downloadFileStream(file.drive_file_id);
            archive.append(fileDownload.stream, { name: file.original_filename });
          } catch (fileErr) {
            console.error(`[ArchiveStream] Error reading file ${file.original_filename}:`, fileErr);
          }
        }
      }

      await archive.finalize();

      // Log ZIP download
      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      await db.execute(
        `INSERT INTO download_logs (id, transfer_id, file_id, is_zip_download, ip_address, user_agent)
         VALUES ($1, $2, NULL, $3, $4, $5)`,
        [crypto.randomUUID(), transfer.id, db.isPostgres ? true : 1, ip, userAgent]
      );

      await db.execute(
        'UPDATE transfers SET download_count = download_count + 1 WHERE id = $1',
        [transfer.id]
      );

      EmailService.sendDownloadNotification({
        senderEmail: transfer.sender_email,
        transferTitle: transfer.title,
        ipAddress: ip,
      }).catch(err => console.error('[DownloadNotify] Error:', err));
    } catch (err: any) {
      console.error('[DownloadController.streamArchive] Error:', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: 'ZIP archive generation failed' });
      }
    }
  }
}
