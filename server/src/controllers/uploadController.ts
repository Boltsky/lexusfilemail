import { Request, Response } from 'express';
import { db } from '../db/db.js';
import { config } from '../config/index.js';
import { getStorageProvider } from '../services/storage/index.js';

export class UploadController {
  /**
   * Initialize a resumable upload session for a specific file
   */
  static async initFileUpload(req: Request, res: Response): Promise<void> {
    try {
      const { transferId, fileId } = req.body;
      if (!transferId || !fileId) {
        res.status(400).json({ success: false, error: 'transferId and fileId are required' });
        return;
      }

      const file = await db.queryOne<any>(
        'SELECT * FROM transfer_files WHERE id = $1 AND transfer_id = $2',
        [fileId, transferId]
      );
      if (!file) {
        res.status(404).json({ success: false, error: 'File record not found for transfer' });
        return;
      }

      const session = await db.queryOne<any>(
        'SELECT * FROM upload_sessions WHERE transfer_id = $1 AND filename = $2',
        [transferId, file.original_filename]
      );
      if (!session) {
        res.status(404).json({ success: false, error: 'Upload session not found' });
        return;
      }

      // Initialize resumable upload on storage provider (Google Drive or Local)
      const storage = getStorageProvider();
      const initResult = await storage.initUpload({
        filename: file.original_filename,
        mimeType: file.mime_type,
        size: parseInt(file.file_size_bytes, 10),
        transferId,
      });

      // Update session_url in database
      await db.execute(
        'UPDATE upload_sessions SET session_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [initResult.sessionUrl, session.id]
      );

      res.json({
        success: true,
        sessionId: session.id,
        sessionUrl: initResult.sessionUrl,
        chunkSize: config.chunkSizeBytes,
        storageProvider: storage.name,
      });
    } catch (err: any) {
      console.error('[UploadController.initFileUpload] Error:', err);
      res.status(500).json({ success: false, error: `Upload initialization failed: ${err.message}` });
    }
  }

  /**
   * Handle chunk upload
   */
  static async uploadChunk(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const session = await db.queryOne<any>('SELECT * FROM upload_sessions WHERE id = $1', [sessionId]);

      if (!session) {
        res.status(404).json({ success: false, error: 'Upload session not found' });
        return;
      }

      // Check Content-Range header: "bytes START-END/TOTAL"
      const contentRange = req.headers['content-range'];
      if (!contentRange) {
        res.status(400).json({
          success: false,
          error: 'Content-Range header is required (e.g., "bytes 0-5242879/10485760")',
        });
        return;
      }

      const rangeMatch = contentRange.match(/^bytes\s+(\d+)-(\d+)\/(\d+)$/);
      if (!rangeMatch) {
        res.status(400).json({ success: false, error: 'Invalid Content-Range format' });
        return;
      }

      const startByte = parseInt(rangeMatch[1], 10);
      const endByte = parseInt(rangeMatch[2], 10);
      const totalBytes = parseInt(rangeMatch[3], 10);

      const chunkBuffer = req.body as Buffer;
      if (!chunkBuffer || !Buffer.isBuffer(chunkBuffer)) {
        res.status(400).json({ success: false, error: 'Binary chunk data required in request body' });
        return;
      }

      const storage = getStorageProvider();
      let activeSessionUrl = session.session_url;

      if (!activeSessionUrl || !activeSessionUrl.trim()) {
        const initResult = await storage.initUpload({
          filename: session.filename,
          mimeType: session.mime_type,
          size: totalBytes,
          transferId: session.transfer_id,
        });
        activeSessionUrl = initResult.sessionUrl;
        await db.execute(
          'UPDATE upload_sessions SET session_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [activeSessionUrl, sessionId]
        );
      }

      const chunkResult = await storage.uploadChunk({
        sessionUrl: activeSessionUrl,
        chunkBuffer,
        startByte,
        endByte,
        totalBytes,
        filename: session.filename,
      });

      // Update upload session progress
      await db.execute(
        `UPDATE upload_sessions 
         SET bytes_uploaded = $1, is_completed = $2, drive_file_id = COALESCE($3, drive_file_id), updated_at = CURRENT_TIMESTAMP 
         WHERE id = $4`,
        [
          chunkResult.bytesUploaded,
          db.isPostgres ? chunkResult.completed : chunkResult.completed ? 1 : 0,
          chunkResult.fileId || null,
          sessionId,
        ]
      );

      // If finished, mark transfer_files record as completed
      if (chunkResult.completed) {
        await db.execute(
          `UPDATE transfer_files 
           SET drive_file_id = $1, checksum = $2, status = 'completed' 
           WHERE transfer_id = $3 AND original_filename = $4`,
          [chunkResult.fileId, chunkResult.checksum || null, session.transfer_id, session.filename]
        );
      }

      res.json({
        success: true,
        completed: chunkResult.completed,
        bytesUploaded: chunkResult.bytesUploaded,
        totalBytes,
        fileId: chunkResult.fileId,
      });
    } catch (err: any) {
      console.error('[UploadController.uploadChunk] Error:', err);
      res.status(500).json({ success: false, error: `Chunk upload failed: ${err.message}` });
    }
  }

  /**
   * Check status of an upload session for resume capability
   */
  static async getUploadStatus(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const session = await db.queryOne<any>('SELECT * FROM upload_sessions WHERE id = $1', [sessionId]);

      if (!session) {
        res.status(404).json({ success: false, error: 'Upload session not found' });
        return;
      }

      if (session.is_completed) {
        res.json({
          success: true,
          isCompleted: true,
          bytesUploaded: parseInt(session.file_size_bytes, 10),
          totalBytes: parseInt(session.file_size_bytes, 10),
        });
        return;
      }

      const storage = getStorageProvider();
      const status = await storage.getUploadStatus(
        session.session_url,
        parseInt(session.file_size_bytes, 10)
      );

      res.json({
        success: true,
        isCompleted: false,
        bytesUploaded: status.lastByteUploaded + 1,
        totalBytes: parseInt(session.file_size_bytes, 10),
      });
    } catch (err: any) {
      console.error('[UploadController.getUploadStatus] Error:', err);
      res.status(500).json({ success: false, error: 'Failed to retrieve upload status' });
    }
  }
}
