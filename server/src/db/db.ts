import { Pool } from 'pg';
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { config } from '../config/index.js';

export interface IDatabase {
  isPostgres: boolean;
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  queryOne<T = any>(sql: string, params?: any[]): Promise<T | null>;
  execute(sql: string, params?: any[]): Promise<void>;
  close(): Promise<void>;
}

class DatabaseAdapter implements IDatabase {
  public isPostgres: boolean = false;
  private pgPool: Pool | null = null;
  private sqliteDb: any | null = null;

  constructor() {
    if (config.databaseUrl && (config.databaseUrl.startsWith('postgres://') || config.databaseUrl.startsWith('postgresql://'))) {
      this.isPostgres = true;
      this.pgPool = new Pool({
        connectionString: config.databaseUrl,
        ssl: config.databaseSsl ? { rejectUnauthorized: false } : undefined,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });
      console.log('[Database] Connecting to PostgreSQL at Render/remote host');
    } else {
      this.isPostgres = false;
      const dbDir = path.resolve(process.cwd(), 'data');
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
      const sqlitePath = path.join(dbDir, 'lexusmail.sqlite');
      this.sqliteDb = new DatabaseSync(sqlitePath);
      console.log(`[Database] Initialized SQLite local database at: ${sqlitePath}`);
    }
  }

  // Convert $1, $2, $3 to ? for SQLite compatibility
  private convertSqlForSqlite(sql: string): string {
    // Replace $1, $2, etc. with ?
    let converted = sql.replace(/\$(\d+)/g, '?');
    // Replace CURRENT_TIMESTAMP or TIMESTAMPTZ with SQLite equivalents
    converted = converted.replace(/TIMESTAMPTZ/gi, 'DATETIME');
    converted = converted.replace(/gen_random_uuid\(\)/gi, 'hex(randomblob(16))');
    converted = converted.replace(/BOOLEAN/gi, 'INTEGER');
    converted = converted.replace(/BIGINT/gi, 'INTEGER');
    return converted;
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (this.isPostgres && this.pgPool) {
      const res = await this.pgPool.query(sql, params);
      return res.rows as T[];
    } else if (this.sqliteDb) {
      const sqliteSql = this.convertSqlForSqlite(sql);
      // Map boolean params to 1 / 0 for SQLite
      const sanitizedParams = params.map(p => (typeof p === 'boolean' ? (p ? 1 : 0) : p));
      const stmt = this.sqliteDb.prepare(sqliteSql);
      const rows = stmt.all(...sanitizedParams);
      return rows as T[];
    }
    throw new Error('Database not initialized');
  }

  async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  async execute(sql: string, params: any[] = []): Promise<void> {
    if (this.isPostgres && this.pgPool) {
      await this.pgPool.query(sql, params);
    } else if (this.sqliteDb) {
      const sqliteSql = this.convertSqlForSqlite(sql);
      const sanitizedParams = params.map(p => (typeof p === 'boolean' ? (p ? 1 : 0) : p));
      const stmt = this.sqliteDb.prepare(sqliteSql);
      stmt.run(...sanitizedParams);
    }
  }

  async close(): Promise<void> {
    if (this.pgPool) {
      await this.pgPool.end();
    }
    if (this.sqliteDb) {
      this.sqliteDb.close();
    }
  }
}

export const db = new DatabaseAdapter();

export async function initDb(): Promise<void> {
  console.log(`[Database] Initializing database tables and default data (${db.isPostgres ? 'PostgreSQL' : 'SQLite'})...`);

  if (db.isPostgres) {
    let schemaPath = path.resolve(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      schemaPath = path.resolve(process.cwd(), 'src', 'db', 'schema.sql');
    }
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await db.execute(schemaSql);
    }
  } else {
    // SQLite table initialization
    const sqliteInit = `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'user' NOT NULL,
        google_id TEXT UNIQUE,
        avatar_url TEXT,
        email_verified INTEGER DEFAULT 0 NOT NULL,
        verification_token TEXT,
        storage_used_bytes INTEGER DEFAULT 0 NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS transfers (
        id TEXT PRIMARY KEY,
        transfer_token_hash TEXT UNIQUE NOT NULL,
        user_id TEXT,
        type TEXT DEFAULT 'link' NOT NULL,
        sender_email TEXT NOT NULL,
        title TEXT,
        message TEXT,
        password_hash TEXT,
        total_size_bytes INTEGER DEFAULT 0 NOT NULL,
        file_count INTEGER DEFAULT 0 NOT NULL,
        expires_at DATETIME NOT NULL,
        max_downloads INTEGER,
        download_count INTEGER DEFAULT 0 NOT NULL,
        is_active INTEGER DEFAULT 1 NOT NULL,
        status TEXT DEFAULT 'pending' NOT NULL,
        drive_folder_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS transfer_files (
        id TEXT PRIMARY KEY,
        transfer_id TEXT NOT NULL,
        drive_file_id TEXT,
        original_filename TEXT NOT NULL,
        mime_type TEXT DEFAULT 'application/octet-stream' NOT NULL,
        file_size_bytes INTEGER NOT NULL,
        checksum TEXT,
        download_count INTEGER DEFAULT 0 NOT NULL,
        status TEXT DEFAULT 'uploading' NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS recipients (
        id TEXT PRIMARY KEY,
        transfer_id TEXT NOT NULL,
        email TEXT NOT NULL,
        notified_at DATETIME,
        notification_status TEXT DEFAULT 'pending' NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS upload_sessions (
        id TEXT PRIMARY KEY,
        transfer_id TEXT NOT NULL,
        file_index INTEGER NOT NULL,
        filename TEXT NOT NULL,
        file_size_bytes INTEGER NOT NULL,
        mime_type TEXT NOT NULL,
        session_url TEXT NOT NULL,
        bytes_uploaded INTEGER DEFAULT 0 NOT NULL,
        is_completed INTEGER DEFAULT 0 NOT NULL,
        drive_file_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS download_logs (
        id TEXT PRIMARY KEY,
        transfer_id TEXT NOT NULL,
        file_id TEXT,
        is_zip_download INTEGER DEFAULT 0 NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        downloaded_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        details TEXT,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS email_notifications (
        id TEXT PRIMARY KEY,
        recipient_email TEXT NOT NULL,
        subject TEXT NOT NULL,
        template_type TEXT NOT NULL,
        status TEXT DEFAULT 'queued' NOT NULL,
        error_message TEXT,
        sent_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_transfers_token_hash ON transfers(transfer_token_hash);
      CREATE INDEX IF NOT EXISTS idx_transfers_user_id ON transfers(user_id);
      CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(status);
      CREATE INDEX IF NOT EXISTS idx_transfers_expires_at ON transfers(expires_at);
      CREATE INDEX IF NOT EXISTS idx_transfer_files_transfer_id ON transfer_files(transfer_id);
      CREATE INDEX IF NOT EXISTS idx_recipients_transfer_id ON recipients(transfer_id);
      CREATE INDEX IF NOT EXISTS idx_upload_sessions_transfer_id ON upload_sessions(transfer_id);
      CREATE INDEX IF NOT EXISTS idx_download_logs_transfer_id ON download_logs(transfer_id);
    `;

    // Execute statement by statement
    const statements = sqliteInit
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const stmt of statements) {
      await db.execute(stmt);
    }
  }

  // Seed default System Settings
  const defaultSettings = [
    { key: 'max_upload_size_bytes', value: JSON.stringify(config.maxUploadSizeBytes), desc: 'Maximum total upload size per transfer' },
    { key: 'max_files_per_transfer', value: JSON.stringify(config.maxFilesPerTransfer), desc: 'Maximum number of files allowed in a single transfer' },
    { key: 'default_expiration_days', value: JSON.stringify(config.defaultExpirationDays), desc: 'Default transfer lifespan in days' },
    { key: 'max_expiration_days', value: JSON.stringify(config.maxExpirationDays), desc: 'Maximum allowable expiration days' },
    { key: 'allow_guest_transfers', value: JSON.stringify(config.allowGuestTransfers), desc: 'Allow unauthenticated guests to send files' },
    { key: 'maintenance_mode', value: JSON.stringify(false), desc: 'Enable maintenance mode to block new transfers' },
    { key: 'blocked_file_extensions', value: JSON.stringify(['.exe', '.bat', '.cmd', '.sh', '.vbs', '.msi']), desc: 'Blacklisted file extensions' },
  ];

  for (const s of defaultSettings) {
    const existing = await db.queryOne('SELECT key FROM system_settings WHERE key = $1', [s.key]);
    if (!existing) {
      await db.execute(
        'INSERT INTO system_settings (key, value, description) VALUES ($1, $2, $3)',
        [s.key, s.value, s.desc]
      );
    }
  }

  // Seed default Admin User if not exists
  const existingAdmin = await db.queryOne('SELECT id FROM users WHERE email = $1', [config.adminEmail]);
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(config.adminPassword, 12);
    const adminId = crypto.randomUUID();
    await db.execute(
      `INSERT INTO users (id, email, password_hash, name, role, email_verified)
       VALUES ($1, $2, $3, $4, 'admin', $5)`,
      [adminId, config.adminEmail, passwordHash, config.adminName, db.isPostgres ? true : 1]
    );
    console.log(`[Database] Created default admin user: ${config.adminEmail}`);
  }

  console.log('[Database] Database tables and default records verified successfully.');
}
