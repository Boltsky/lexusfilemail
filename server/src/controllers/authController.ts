import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { db } from '../db/db.js';
import { config } from '../config/index.js';
import { EmailService } from '../services/email/EmailService.js';
import { TokenService } from '../services/token.js';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: parsed.error.errors[0].message });
        return;
      }

      const { name, email, password } = parsed.data;

      // Check if user already exists
      const existing = await db.queryOne('SELECT id FROM users WHERE email = $1', [email]);
      if (existing) {
        res.status(409).json({ success: false, error: 'An account with this email already exists.' });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const userId = crypto.randomUUID();
      const verificationToken = TokenService.generateAuthToken();

      await db.execute(
        `INSERT INTO users (id, name, email, password_hash, role, verification_token, email_verified)
         VALUES ($1, $2, $3, $4, 'user', $5, $6)`,
        [userId, name, email, passwordHash, verificationToken, db.isPostgres ? false : 0]
      );

      const token = jwt.sign(
        { id: userId, email, name, role: 'user' },
        config.jwtSecret,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        success: true,
        token,
        user: { id: userId, name, email, role: 'user', storageUsedBytes: 0 },
      });
    } catch (err: any) {
      console.error('[AuthController.register] Error:', err);
      res.status(500).json({ success: false, error: 'Registration failed due to a server error.' });
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: parsed.error.errors[0].message });
        return;
      }

      const { email, password } = parsed.data;

      const user = await db.queryOne<any>(
        'SELECT id, name, email, password_hash, role, storage_used_bytes FROM users WHERE email = $1',
        [email]
      );

      if (!user || !user.password_hash) {
        res.status(401).json({ success: false, error: 'Invalid email or password.' });
        return;
      }

      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        res.status(401).json({ success: false, error: 'Invalid email or password.' });
        return;
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name, role: user.role },
        config.jwtSecret,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          storageUsedBytes: parseInt(user.storage_used_bytes || '0', 10),
        },
      });
    } catch (err: any) {
      console.error('[AuthController.login] Error:', err);
      res.status(500).json({ success: false, error: 'Login failed due to a server error.' });
    }
  }

  static async me(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const user = await db.queryOne<any>(
        'SELECT id, name, email, role, avatar_url, storage_used_bytes, created_at FROM users WHERE id = $1',
        [req.user.id]
      );

      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      // Aggregate user statistics
      const transferStats = await db.queryOne<any>(
        `SELECT 
           COUNT(*) as total_transfers,
           COALESCE(SUM(total_size_bytes), 0) as total_bytes_sent,
           COALESCE(SUM(file_count), 0) as total_files_sent,
           COALESCE(SUM(download_count), 0) as total_downloads
         FROM transfers 
         WHERE user_id = $1 AND status != 'deleted'`,
        [user.id]
      );

      res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatarUrl: user.avatar_url,
          storageUsedBytes: parseInt(user.storage_used_bytes || '0', 10),
          createdAt: user.created_at,
          stats: {
            totalTransfers: parseInt(transferStats?.total_transfers || '0', 10),
            totalBytesSent: parseInt(transferStats?.total_bytes_sent || '0', 10),
            totalFilesSent: parseInt(transferStats?.total_files_sent || '0', 10),
            totalDownloads: parseInt(transferStats?.total_downloads || '0', 10),
          },
        },
      });
    } catch (err: any) {
      console.error('[AuthController.me] Error:', err);
      res.status(500).json({ success: false, error: 'Failed to retrieve profile' });
    }
  }

  static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ success: false, error: 'Email is required' });
        return;
      }

      const user = await db.queryOne<any>('SELECT id, name, email FROM users WHERE email = $1', [email.toLowerCase().trim()]);
      if (user) {
        const resetToken = TokenService.generateAuthToken();
        await db.execute('UPDATE users SET verification_token = $1 WHERE id = $2', [resetToken, user.id]);
        await EmailService.sendPasswordReset({
          email: user.email,
          name: user.name,
          resetToken,
        });
      }

      // Always return positive response to prevent email enumeration
      res.json({
        success: true,
        message: 'If an account exists with that email address, password reset instructions have been sent.',
      });
    } catch (err: any) {
      console.error('[AuthController.forgotPassword] Error:', err);
      res.status(500).json({ success: false, error: 'Password reset request failed' });
    }
  }

  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword || newPassword.length < 8) {
        res.status(400).json({ success: false, error: 'Valid token and new password (min 8 chars) are required.' });
        return;
      }

      const user = await db.queryOne<any>('SELECT id FROM users WHERE verification_token = $1', [token]);
      if (!user) {
        res.status(400).json({ success: false, error: 'Invalid or expired password reset link.' });
        return;
      }

      const passwordHash = await bcrypt.hash(newPassword, 12);
      await db.execute(
        'UPDATE users SET password_hash = $1, verification_token = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [passwordHash, user.id]
      );

      res.json({ success: true, message: 'Password has been successfully updated. You may now log in.' });
    } catch (err: any) {
      console.error('[AuthController.resetPassword] Error:', err);
      res.status(500).json({ success: false, error: 'Password reset failed' });
    }
  }

  static async googleAuth(req: Request, res: Response): Promise<void> {
    try {
      const { email, name, googleId, avatarUrl } = req.body;
      if (!email || !name || !googleId) {
        res.status(400).json({ success: false, error: 'Google authentication details missing' });
        return;
      }

      let user = await db.queryOne<any>('SELECT * FROM users WHERE google_id = $1 OR email = $2', [googleId, email.toLowerCase()]);
      if (!user) {
        const userId = crypto.randomUUID();
        await db.execute(
          `INSERT INTO users (id, email, name, google_id, avatar_url, role, email_verified)
           VALUES ($1, $2, $3, $4, $5, 'user', $6)`,
          [userId, email.toLowerCase(), name, googleId, avatarUrl || null, db.isPostgres ? true : 1]
        );
        user = { id: userId, email: email.toLowerCase(), name, role: 'user', storage_used_bytes: 0 };
      } else if (!user.google_id) {
        await db.execute('UPDATE users SET google_id = $1, avatar_url = COALESCE($2, avatar_url) WHERE id = $3', [googleId, avatarUrl, user.id]);
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name, role: user.role },
        config.jwtSecret,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatarUrl: user.avatar_url,
          storageUsedBytes: parseInt(user.storage_used_bytes || '0', 10),
        },
      });
    } catch (err: any) {
      console.error('[AuthController.googleAuth] Error:', err);
      res.status(500).json({ success: false, error: 'Google login failed' });
    }
  }
}
