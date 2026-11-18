import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  appUrl: process.env.APP_URL || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'lexusmail-super-secret-jwt-key-change-in-production-2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  sessionSecret: process.env.SESSION_SECRET || 'lexusmail-session-secret-change-in-production-2026',

  // Database
  databaseUrl: process.env.DATABASE_URL,
  databaseSsl: process.env.DATABASE_SSL === 'true',

  // Storage
  storageProvider: (process.env.STORAGE_PROVIDER || 'auto') as 'google_drive' | 'local' | 'auto',
  localStorageDir: process.env.LOCAL_STORAGE_DIR || path.resolve(process.cwd(), 'uploads'),

  // Google Drive
  googleServiceAccountJson: process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
  googleDriveSharedDriveId: process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  googleRefreshToken: process.env.GOOGLE_REFRESH_TOKEN,
  googleDriveRootFolder: process.env.GOOGLE_DRIVE_ROOT_FOLDER || 'LexusMail',

  // Email
  emailProvider: process.env.EMAIL_PROVIDER || 'console', // 'resend' | 'sendgrid' | 'smtp' | 'console'
  emailApiKey: process.env.EMAIL_API_KEY,
  emailFrom: process.env.EMAIL_FROM || 'LexusMail <transfers@lexusmail.com>',
  smtpHost: process.env.SMTP_HOST,
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,

  // Transfer Limits & Defaults
  maxUploadSizeBytes: parseInt(process.env.MAX_UPLOAD_SIZE_BYTES || `${5 * 1024 * 1024 * 1024}`, 10), // 5 GB default
  maxFilesPerTransfer: parseInt(process.env.MAX_FILES_PER_TRANSFER || '100', 10),
  defaultExpirationDays: parseInt(process.env.DEFAULT_EXPIRATION_DAYS || '7', 10),
  maxExpirationDays: parseInt(process.env.MAX_EXPIRATION_DAYS || '30', 10),
  allowGuestTransfers: process.env.ALLOW_GUEST_TRANSFERS !== 'false',

  // Upload Chunk Size
  chunkSizeBytes: parseInt(process.env.CHUNK_SIZE_BYTES || `${5 * 1024 * 1024}`, 10), // 5 MB chunks

  // Admin Seed Account
  adminEmail: process.env.ADMIN_EMAIL || 'admin@lexusmail.com',
  adminPassword: process.env.ADMIN_PASSWORD || 'LexusAdmin2026!',
  adminName: process.env.ADMIN_NAME || 'LexusMail Administrator',
};
