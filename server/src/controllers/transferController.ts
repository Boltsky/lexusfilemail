import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { db } from '../db/db.js';
import { config } from '../config/index.js';
import { TokenService } from '../services/token.js';
import { EmailService } from '../services/email/EmailService.js';
import { getStorageProvider } from '../services/storage/index.js';

const fileItemSchema = z.object({
  filename: z.string().min(1, 'Filename cannot be empty'),
  size: z.number().int().positive('File size must be greater than 0'),
  mimeType: z.string().default('application/octet-stream'),
});

const initTransferSchema = z.object({
  type: z.enum(['email', 'link']).default('link'),
  senderEmail: z.string().email().optional().default('guest@lexusicd.com'),
  recipientEmails: z.array(z.string().email()).optional().default([]),
  title: z.string().max(255).optional(),
  message: z.string().max(4000).optional(),
  password: z.string().min(4, 'Password must be at least 4 characters').optional().nullable(),
  expiresInDays: z.number().int().min(1).max(30).optional().default(7),
  maxDownloads: z.number().int().min(1).max(1000).optional().nullable(),
  files: z.array(fileItemSchema).min(1, 'At least one file must be selected'),
});

export class TransferController {
  /**
   * Initialize a new file transfer session
   */
  static async initTransfer(req: Request, res: Response): Promise<void> {
    try {
      const parsed = initTransferSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: parsed.error.errors[0].message });
        return;
      }

      const data = parsed.data;
      const user = req.user;

      // Check guest policy
      if (!user && !config.allowGuestTransfers) {
        res.status(403).json({ success: false, error: 'Guest file transfers are disabled. Please sign in.' });
        return;
      }

      // Query dynamic settings
      const settingsRows = await db.query('SELECT key, value FROM system_settings');
      const settingsMap = new Map(settingsRows.map(r => [r.key, JSON.parse(r.value)]));

      const maxUploadSize = settingsMap.get('max_upload_size_bytes') || config.maxUploadSizeBytes;
      const maxFiles = settingsMap.get('max_files_per_transfer') || config.maxFilesPerTransfer;
      const blockedExtensions: string[] = settingsMap.get('blocked_file_extensions') || [];

      // Validate files count
      if (data.files.length > maxFiles) {
        res.status(400).json({
          success: false,
          error: `Transfer exceeds the maximum limit of ${maxFiles} files per transfer.`,
        });
        return;
      }

      // Validate total size
      const totalSizeBytes = data.files.reduce((sum, f) => sum + f.size, 0);
      if (totalSizeBytes > maxUploadSize) {
        res.status(400).json({
          success: false,
          error: `Total transfer size (${(totalSizeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB) exceeds the allowed limit of ${(maxUploadSize / (1024 * 1024 * 1024)).toFixed(2)} GB.`,
        });
        return;
      }

      // Check file extension blacklist
      for (const f of data.files) {
        const ext = f.filename.slice(f.filename.lastIndexOf('.')).toLowerCase();
        if (blockedExtensions.includes(ext)) {
          res.status(400).json({
            success: false,
            error: `File "${f.filename}" has a disallowed extension (${ext}) for security reasons.`,
          });
          return;
        }
      }

      const transferId = crypto.randomUUID();
      const rawToken = TokenService.generateTransferToken();
      const tokenHash = TokenService.hashTransferToken(rawToken);

      let passwordHash: string | null = null;
      if (data.password && data.password.trim()) {
        passwordHash = await bcrypt.hash(data.password.trim(), 12);
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (data.expiresInDays || config.defaultExpirationDays));

      // Insert Transfer record
      await db.execute(
        `INSERT INTO transfers (
          id, transfer_token_hash, user_id, type, sender_email, title, message,
          password_hash, total_size_bytes, file_count, expires_at, max_downloads,
          download_count, is_active, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 0, $13, 'pending')`,
        [
          transferId,
          tokenHash,
          user?.id || null,
          data.type,
          data.senderEmail.toLowerCase().trim(),
          data.title || null,
          data.message || null,
          passwordHash,
          totalSizeBytes,
          data.files.length,
          expiresAt.toISOString(),
          data.maxDownloads || null,
          db.isPostgres ? true : 1,
        ]
      );

      // Insert Recipients (if email transfer)
      if (data.type === 'email' && data.recipientEmails.length > 0) {
        for (const recipientEmail of data.recipientEmails) {
          const recipientId = crypto.randomUUID();
          await db.execute(
            `INSERT INTO recipients (id, transfer_id, email, notification_status)
             VALUES ($1, $2, $3, 'pending')`,
            [recipientId, transferId, recipientEmail.toLowerCase().trim()]
          );
        }
      }

      // Insert Transfer Files and pre-create Upload Sessions
      const createdFiles = [];
      for (let i = 0; i < data.files.length; i++) {
        const f = data.files[i];
        const fileId = crypto.randomUUID();
        const sessionId = crypto.randomUUID();

        // Initialize storage session for this file (Google Drive resumable or Local durable)
        let initialSessionUrl = '';
        try {
          const storage = getStorageProvider();
          const initRes = await storage.initUpload({
            filename: f.filename,
            mimeType: f.mimeType,
            size: f.size,
            transferId,
          });
          initialSessionUrl = initRes.sessionUrl;
        } catch (storageInitErr: any) {
          console.warn('[initTransfer] Auto initUpload warning:', storageInitErr.message);
        }

        await db.execute(
          `INSERT INTO transfer_files (
            id, transfer_id, original_filename, mime_type, file_size_bytes, status
          ) VALUES ($1, $2, $3, $4, $5, 'uploading')`,
          [fileId, transferId, f.filename, f.mimeType, f.size]
        );

        await db.execute(
          `INSERT INTO upload_sessions (
            id, transfer_id, file_index, filename, file_size_bytes, mime_type, session_url, bytes_uploaded, is_completed
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8)`,
          [sessionId, transferId, i, f.filename, f.size, f.mimeType, initialSessionUrl, db.isPostgres ? false : 0]
        );

        createdFiles.push({
          fileId,
          filename: f.filename,
          size: f.size,
          mimeType: f.mimeType,
          uploadSessionId: sessionId,
        });
      }

      const downloadUrl = `${config.appUrl}/download/${rawToken}`;

      res.status(201).json({
        success: true,
        transferId,
        token: rawToken,
        downloadUrl,
        expiresAt: expiresAt.toISOString(),
        files: createdFiles,
        chunkSizeBytes: config.chunkSizeBytes,
      });
    } catch (err: any) {
      console.error('[TransferController.initTransfer] Error:', err);
      res.status(500).json({ success: false, error: 'Transfer initialization failed.' });
    }
  }

  /**
   * Finalize transfer when all files have finished uploading
   */
  static async finalizeTransfer(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const transfer = await db.queryOne<any>('SELECT * FROM transfers WHERE id = $1', [id]);
      if (!transfer) {
        res.status(404).json({ success: false, error: 'Transfer not found' });
        return;
      }

      // Verify that all files have completed uploading
      const pendingFiles = await db.query(
        "SELECT id, original_filename FROM transfer_files WHERE transfer_id = $1 AND status != 'completed'",
        [id]
      );

      if (pendingFiles.length > 0) {
        res.status(400).json({
          success: false,
          error: `Cannot finalize transfer: ${pendingFiles.length} file(s) have not completed uploading.`,
        });
        return;
      }

      // Mark transfer as completed
      await db.execute(
        "UPDATE transfers SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [id]
      );

      // Update user storage usage if registered
      if (transfer.user_id) {
        await db.execute(
          'UPDATE users SET storage_used_bytes = storage_used_bytes + $1 WHERE id = $2',
          [transfer.total_size_bytes, transfer.user_id]
        );
      }

      // Retrieve recipients and token to construct download URL
      const recipients = await db.query<{ email: string }>(
        'SELECT email FROM recipients WHERE transfer_id = $1',
        [id]
      );
      const recipientEmails = recipients.map(r => r.email);

      // Reconstruct or pass raw token from request body if client provides it
      const { rawToken } = req.body;
      const downloadUrl = rawToken
        ? `${config.appUrl}/download/${rawToken}`
        : `${config.appUrl}/download`;

      // Trigger asynchronous email delivery
      if (transfer.type === 'email' && recipientEmails.length > 0 && rawToken) {
        for (const recEmail of recipientEmails) {
          EmailService.sendRecipientTransferNotification({
            recipientEmail: recEmail,
            senderEmail: transfer.sender_email,
            title: transfer.title || undefined,
            message: transfer.message || undefined,
            fileCount: transfer.file_count,
            totalSizeBytes: parseInt(transfer.total_size_bytes, 10),
            downloadUrl,
            expiresAt: new Date(transfer.expires_at),
            hasPassword: !!transfer.password_hash,
          }).catch(err => console.error('[EmailDispatch] Recipient notification error:', err));
        }

        // Send confirmation to sender
        EmailService.sendSenderConfirmation({
          senderEmail: transfer.sender_email,
          title: transfer.title || undefined,
          fileCount: transfer.file_count,
          totalSizeBytes: parseInt(transfer.total_size_bytes, 10),
          downloadUrl,
          expiresAt: new Date(transfer.expires_at),
          recipients: recipientEmails,
        }).catch(err => console.error('[EmailDispatch] Sender confirmation error:', err));
      }

      res.json({
        success: true,
        message: 'Transfer finalized successfully.',
        downloadUrl,
      });
    } catch (err: any) {
      console.error('[TransferController.finalizeTransfer] Error:', err);
      res.status(500).json({ success: false, error: 'Failed to finalize transfer' });
    }
  }

  /**
   * Get logged-in user's transfers
   */
  static async getUserTransfers(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { status, search, page = '1', limit = '20' } = req.query;
      const pageNum = parseInt(page as string, 10) || 1;
      const limitNum = parseInt(limit as string, 10) || 20;
      const offset = (pageNum - 1) * limitNum;

      let sql = 'SELECT * FROM transfers WHERE user_id = $1 AND status != \'deleted\'';
      const params: any[] = [req.user.id];
      let pIdx = 2;

      if (status && status !== 'all') {
        sql += ` AND status = $${pIdx}`;
        params.push(status);
        pIdx++;
      }

      if (search) {
        sql += ` AND (title LIKE $${pIdx} OR sender_email LIKE $${pIdx})`;
        params.push(`%${search}%`);
        pIdx++;
      }

      sql += ` ORDER BY created_at DESC LIMIT $${pIdx} OFFSET $${pIdx + 1}`;
      params.push(limitNum, offset);

      const transfers = await db.query<any>(sql, params);

      // Get count
      const countRes = await db.queryOne<any>(
        'SELECT COUNT(*) as total FROM transfers WHERE user_id = $1 AND status != \'deleted\'',
        [req.user.id]
      );

      res.json({
        success: true,
        transfers: transfers.map(t => ({
          id: t.id,
          type: t.type,
          senderEmail: t.sender_email,
          title: t.title,
          totalSizeBytes: parseInt(t.total_size_bytes, 10),
          fileCount: t.file_count,
          downloadCount: t.download_count,
          maxDownloads: t.max_downloads,
          expiresAt: t.expires_at,
          isActive: Boolean(t.is_active),
          status: t.status,
          createdAt: t.created_at,
          hasPassword: Boolean(t.password_hash),
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: parseInt(countRes?.total || '0', 10),
        },
      });
    } catch (err: any) {
      console.error('[TransferController.getUserTransfers] Error:', err);
      res.status(500).json({ success: false, error: 'Failed to fetch transfers' });
    }
  }

  /**
   * Get single transfer details (for user dashboard or inspection)
   */
  static async getTransferDetails(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const transfer = await db.queryOne<any>('SELECT * FROM transfers WHERE id = $1', [id]);
      if (!transfer) {
        res.status(404).json({ success: false, error: 'Transfer not found' });
        return;
      }

      // Check ownership unless admin
      if (req.user && req.user.role !== 'admin' && transfer.user_id !== req.user.id) {
        res.status(403).json({ success: false, error: 'Access denied' });
        return;
      }

      const files = await db.query<any>(
        'SELECT id, original_filename, mime_type, file_size_bytes, download_count, status FROM transfer_files WHERE transfer_id = $1',
        [id]
      );

      const recipients = await db.query<any>(
        'SELECT id, email, notification_status, notified_at FROM recipients WHERE transfer_id = $1',
        [id]
      );

      const downloadLogs = await db.query<any>(
        'SELECT id, is_zip_download, ip_address, user_agent, downloaded_at FROM download_logs WHERE transfer_id = $1 ORDER BY downloaded_at DESC LIMIT 50',
        [id]
      );

      res.json({
        success: true,
        transfer: {
          id: transfer.id,
          type: transfer.type,
          title: transfer.title,
          message: transfer.message,
          senderEmail: transfer.sender_email,
          totalSizeBytes: parseInt(transfer.total_size_bytes, 10),
          fileCount: transfer.file_count,
          downloadCount: transfer.download_count,
          maxDownloads: transfer.max_downloads,
          expiresAt: transfer.expires_at,
          isActive: Boolean(transfer.is_active),
          status: transfer.status,
          createdAt: transfer.created_at,
          files: files.map(f => ({
            id: f.id,
            filename: f.original_filename,
            mimeType: f.mime_type,
            sizeBytes: parseInt(f.file_size_bytes, 10),
            downloadCount: f.download_count,
            status: f.status,
          })),
          recipients,
          downloadLogs,
        },
      });
    } catch (err: any) {
      console.error('[TransferController.getTransferDetails] Error:', err);
      res.status(500).json({ success: false, error: 'Failed to fetch transfer details' });
    }
  }

  /**
   * Delete or Revoke a transfer
   */
  static async deleteTransfer(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const transfer = await db.queryOne<any>('SELECT * FROM transfers WHERE id = $1', [id]);
      if (!transfer) {
        res.status(404).json({ success: false, error: 'Transfer not found' });
        return;
      }

      // Check ownership
      if (req.user && req.user.role !== 'admin' && transfer.user_id !== req.user.id) {
        res.status(403).json({ success: false, error: 'Access denied' });
        return;
      }

      // Mark status as deleted and inactive in database
      await db.execute(
        "UPDATE transfers SET status = 'deleted', is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [db.isPostgres ? false : 0, id]
      );

      // Asynchronously delete stored files from Google Drive / storage provider
      const storage = getStorageProvider();
      storage.deleteTransferFolder(id).catch(err => {
        console.warn(`[DeleteTransfer] Error removing storage folder for transfer ${id}:`, err);
      });

      res.json({ success: true, message: 'Transfer revoked and deleted successfully.' });
    } catch (err: any) {
      console.error('[TransferController.deleteTransfer] Error:', err);
      res.status(500).json({ success: false, error: 'Failed to delete transfer' });
    }
  }

  /**
   * Extend expiration date
   */
  static async extendExpiration(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { days = 7 } = req.body;

      const transfer = await db.queryOne<any>('SELECT * FROM transfers WHERE id = $1', [id]);
      if (!transfer) {
        res.status(404).json({ success: false, error: 'Transfer not found' });
        return;
      }

      if (req.user && req.user.role !== 'admin' && transfer.user_id !== req.user.id) {
        res.status(403).json({ success: false, error: 'Access denied' });
        return;
      }

      const newExpiry = new Date(transfer.expires_at);
      newExpiry.setDate(newExpiry.getDate() + days);

      await db.execute('UPDATE transfers SET expires_at = $1 WHERE id = $2', [newExpiry.toISOString(), id]);

      res.json({ success: true, newExpiresAt: newExpiry.toISOString() });
    } catch (err: any) {
      console.error('[TransferController.extendExpiration] Error:', err);
      res.status(500).json({ success: false, error: 'Failed to extend expiration' });
    }
  }
}
