import { Request, Response } from 'express';
import { db } from '../db/db.js';
import { getStorageProvider } from '../services/storage/index.js';

export class AdminController {
  /**
   * System overview metrics
   */
  static async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const userCount = await db.queryOne<any>('SELECT COUNT(*) as total FROM users');
      const transferStats = await db.queryOne<any>(`
        SELECT 
          COUNT(*) as total_transfers,
          COUNT(CASE WHEN status = 'completed' AND is_active = ${db.isPostgres ? 'true' : '1'} AND expires_at > CURRENT_TIMESTAMP THEN 1 END) as active_transfers,
          COUNT(CASE WHEN status = 'expired' OR expires_at <= CURRENT_TIMESTAMP THEN 1 END) as expired_transfers,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_transfers,
          COALESCE(SUM(total_size_bytes), 0) as total_storage_bytes,
          COALESCE(SUM(file_count), 0) as total_files,
          COALESCE(SUM(download_count), 0) as total_downloads
        FROM transfers WHERE status != 'deleted'
      `);

      const storage = getStorageProvider();
      const storageUsage = await storage.getStorageUsage();

      const recentTransfers = await db.query<any>(
        'SELECT id, sender_email, title, total_size_bytes, file_count, download_count, status, created_at FROM transfers ORDER BY created_at DESC LIMIT 10'
      );

      const recentDownloads = await db.query<any>(
        'SELECT id, transfer_id, file_id, is_zip_download, ip_address, downloaded_at FROM download_logs ORDER BY downloaded_at DESC LIMIT 10'
      );

      res.json({
        success: true,
        metrics: {
          totalUsers: parseInt(userCount?.total || '0', 10),
          totalTransfers: parseInt(transferStats?.total_transfers || '0', 10),
          activeTransfers: parseInt(transferStats?.active_transfers || '0', 10),
          expiredTransfers: parseInt(transferStats?.expired_transfers || '0', 10),
          failedTransfers: parseInt(transferStats?.failed_transfers || '0', 10),
          totalFiles: parseInt(transferStats?.total_files || '0', 10),
          totalDownloads: parseInt(transferStats?.total_downloads || '0', 10),
          totalStorageBytes: parseInt(transferStats?.total_storage_bytes || '0', 10),
          storageEngine: storage.name,
          cloudStorageUsedBytes: storageUsage.usedBytes,
          cloudStorageTotalBytes: storageUsage.totalBytes,
        },
        recentTransfers,
        recentDownloads,
      });
    } catch (err: any) {
      console.error('[AdminController.getMetrics] Error:', err);
      res.status(500).json({ success: false, error: 'Failed to retrieve administrative metrics' });
    }
  }

  /**
   * List all registered users
   */
  static async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const { search, page = '1', limit = '20' } = req.query;
      const pageNum = parseInt(page as string, 10) || 1;
      const limitNum = parseInt(limit as string, 10) || 20;
      const offset = (pageNum - 1) * limitNum;

      let sql = 'SELECT id, name, email, role, email_verified, storage_used_bytes, created_at FROM users';
      const params: any[] = [];

      if (search) {
        sql += ' WHERE (name LIKE $1 OR email LIKE $1)';
        params.push(`%${search}%`);
      }

      sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limitNum, offset);

      const users = await db.query<any>(sql, params);
      const totalCount = await db.queryOne<any>('SELECT COUNT(*) as total FROM users');

      res.json({
        success: true,
        users: users.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          emailVerified: Boolean(u.email_verified),
          storageUsedBytes: parseInt(u.storage_used_bytes || '0', 10),
          createdAt: u.created_at,
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: parseInt(totalCount?.total || '0', 10),
        },
      });
    } catch (err: any) {
      console.error('[AdminController.getUsers] Error:', err);
      res.status(500).json({ success: false, error: 'Failed to retrieve users' });
    }
  }

  /**
   * Update user role or status
   */
  static async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (role && !['user', 'admin'].includes(role)) {
        res.status(400).json({ success: false, error: 'Invalid role' });
        return;
      }

      if (role) {
        await db.execute('UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [role, id]);
      }

      res.json({ success: true, message: 'User updated successfully' });
    } catch (err: any) {
      console.error('[AdminController.updateUser] Error:', err);
      res.status(500).json({ success: false, error: 'Failed to update user' });
    }
  }

  /**
   * Delete user account
   */
  static async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (req.user?.id === id) {
        res.status(400).json({ success: false, error: 'Cannot delete your own administrative account.' });
        return;
      }

      await db.execute('DELETE FROM users WHERE id = $1', [id]);
      res.json({ success: true, message: 'User deleted successfully.' });
    } catch (err: any) {
      console.error('[AdminController.deleteUser] Error:', err);
      res.status(500).json({ success: false, error: 'Failed to delete user' });
    }
  }

  /**
   * List all system transfers
   */
  static async getTransfers(req: Request, res: Response): Promise<void> {
    try {
      const { search, status, page = '1', limit = '20' } = req.query;
      const pageNum = parseInt(page as string, 10) || 1;
      const limitNum = parseInt(limit as string, 10) || 20;
      const offset = (pageNum - 1) * limitNum;

      let sql = 'SELECT * FROM transfers WHERE status != \'deleted\'';
      const params: any[] = [];
      let pIdx = 1;

      if (status && status !== 'all') {
        sql += ` AND status = $${pIdx}`;
        params.push(status);
        pIdx++;
      }

      if (search) {
        sql += ` AND (title LIKE $${pIdx} OR sender_email LIKE $${pIdx} OR id LIKE $${pIdx})`;
        params.push(`%${search}%`);
        pIdx++;
      }

      sql += ` ORDER BY created_at DESC LIMIT $${pIdx} OFFSET $${pIdx + 1}`;
      params.push(limitNum, offset);

      const transfers = await db.query<any>(sql, params);
      const totalCount = await db.queryOne<any>('SELECT COUNT(*) as total FROM transfers WHERE status != \'deleted\'');

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
          total: parseInt(totalCount?.total || '0', 10),
        },
      });
    } catch (err: any) {
      console.error('[AdminController.getTransfers] Error:', err);
      res.status(500).json({ success: false, error: 'Failed to retrieve transfers' });
    }
  }

  /**
   * Force delete or manually expire a transfer
   */
  static async manageTransfer(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { action } = req.body; // 'expire' | 'delete' | 'toggle_active'

      const transfer = await db.queryOne<any>('SELECT * FROM transfers WHERE id = $1', [id]);
      if (!transfer) {
        res.status(404).json({ success: false, error: 'Transfer not found' });
        return;
      }

      if (action === 'expire') {
        await db.execute(
          "UPDATE transfers SET status = 'expired', expires_at = CURRENT_TIMESTAMP WHERE id = $1",
          [id]
        );
      } else if (action === 'delete') {
        await db.execute(
          "UPDATE transfers SET status = 'deleted', is_active = $1 WHERE id = $2",
          [db.isPostgres ? false : 0, id]
        );
        const storage = getStorageProvider();
        storage.deleteTransferFolder(id).catch(err => console.warn('[AdminDeleteStorage] Error:', err));
      } else if (action === 'toggle_active') {
        const nextActive = !Boolean(transfer.is_active);
        await db.execute('UPDATE transfers SET is_active = $1 WHERE id = $2', [
          db.isPostgres ? nextActive : nextActive ? 1 : 0,
          id,
        ]);
      }

      res.json({ success: true, message: `Action "${action}" completed successfully.` });
    } catch (err: any) {
      console.error('[AdminController.manageTransfer] Error:', err);
      res.status(500).json({ success: false, error: 'Failed to manage transfer' });
    }
  }

  /**
   * Get all system settings
   */
  static async getSettings(req: Request, res: Response): Promise<void> {
    try {
      const settings = await db.query<any>('SELECT key, value, description, updated_at FROM system_settings');
      const formatted: Record<string, any> = {};
      for (const s of settings) {
        formatted[s.key] = {
          value: JSON.parse(s.value),
          description: s.description,
          updatedAt: s.updated_at,
        };
      }
      res.json({ success: true, settings: formatted });
    } catch (err: any) {
      console.error('[AdminController.getSettings] Error:', err);
      res.status(500).json({ success: false, error: 'Failed to retrieve settings' });
    }
  }

  /**
   * Update system settings
   */
  static async updateSettings(req: Request, res: Response): Promise<void> {
    try {
      const updates = req.body;
      for (const [key, val] of Object.entries(updates)) {
        await db.execute(
          'UPDATE system_settings SET value = $1, updated_at = CURRENT_TIMESTAMP WHERE key = $2',
          [JSON.stringify(val), key]
        );
      }
      res.json({ success: true, message: 'Settings updated successfully.' });
    } catch (err: any) {
      console.error('[AdminController.updateSettings] Error:', err);
      res.status(500).json({ success: false, error: 'Failed to update settings' });
    }
  }
}
