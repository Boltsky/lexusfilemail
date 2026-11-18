-- LexusMail Production Database Schema for PostgreSQL

-- Create Enums if not exists
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('user', 'admin');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transfer_status') THEN
        CREATE TYPE transfer_status AS ENUM ('pending', 'uploading', 'processing', 'completed', 'expired', 'deleted', 'failed');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transfer_type') THEN
        CREATE TYPE transfer_type AS ENUM ('email', 'link');
    END IF;
END $$;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user' NOT NULL,
    google_id VARCHAR(255) UNIQUE,
    avatar_url TEXT,
    email_verified BOOLEAN DEFAULT FALSE NOT NULL,
    verification_token VARCHAR(255),
    storage_used_bytes BIGINT DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. Transfers Table
CREATE TABLE IF NOT EXISTS transfers (
    id VARCHAR(36) PRIMARY KEY,
    transfer_token_hash VARCHAR(64) UNIQUE NOT NULL,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    type VARCHAR(50) DEFAULT 'link' NOT NULL,
    sender_email VARCHAR(255) NOT NULL,
    title VARCHAR(255),
    message TEXT,
    password_hash VARCHAR(255),
    total_size_bytes BIGINT DEFAULT 0 NOT NULL,
    file_count INT DEFAULT 0 NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    max_downloads INT DEFAULT NULL,
    download_count INT DEFAULT 0 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' NOT NULL,
    drive_folder_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. Transfer Files Table
CREATE TABLE IF NOT EXISTS transfer_files (
    id VARCHAR(36) PRIMARY KEY,
    transfer_id VARCHAR(36) REFERENCES transfers(id) ON DELETE CASCADE NOT NULL,
    drive_file_id VARCHAR(255),
    original_filename VARCHAR(500) NOT NULL,
    mime_type VARCHAR(255) DEFAULT 'application/octet-stream' NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    checksum VARCHAR(128),
    download_count INT DEFAULT 0 NOT NULL,
    status VARCHAR(50) DEFAULT 'uploading' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 4. Recipients Table
CREATE TABLE IF NOT EXISTS recipients (
    id VARCHAR(36) PRIMARY KEY,
    transfer_id VARCHAR(36) REFERENCES transfers(id) ON DELETE CASCADE NOT NULL,
    email VARCHAR(255) NOT NULL,
    notified_at TIMESTAMPTZ,
    notification_status VARCHAR(50) DEFAULT 'pending' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 5. Upload Sessions Table
CREATE TABLE IF NOT EXISTS upload_sessions (
    id VARCHAR(36) PRIMARY KEY,
    transfer_id VARCHAR(36) REFERENCES transfers(id) ON DELETE CASCADE NOT NULL,
    file_index INT NOT NULL,
    filename VARCHAR(500) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(255) NOT NULL,
    session_url TEXT NOT NULL,
    bytes_uploaded BIGINT DEFAULT 0 NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE NOT NULL,
    drive_file_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 6. Download Logs Table
CREATE TABLE IF NOT EXISTS download_logs (
    id VARCHAR(36) PRIMARY KEY,
    transfer_id VARCHAR(36) REFERENCES transfers(id) ON DELETE CASCADE NOT NULL,
    file_id VARCHAR(36) REFERENCES transfer_files(id) ON DELETE SET NULL,
    is_zip_download BOOLEAN DEFAULT FALSE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    downloaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 7. System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 8. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(255),
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 9. Email Notifications Queue / History
CREATE TABLE IF NOT EXISTS email_notifications (
    id VARCHAR(36) PRIMARY KEY,
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    template_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'queued' NOT NULL,
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_transfers_token_hash ON transfers(transfer_token_hash);
CREATE INDEX IF NOT EXISTS idx_transfers_user_id ON transfers(user_id);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(status);
CREATE INDEX IF NOT EXISTS idx_transfers_expires_at ON transfers(expires_at);
CREATE INDEX IF NOT EXISTS idx_transfer_files_transfer_id ON transfer_files(transfer_id);
CREATE INDEX IF NOT EXISTS idx_recipients_transfer_id ON recipients(transfer_id);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_transfer_id ON upload_sessions(transfer_id);
CREATE INDEX IF NOT EXISTS idx_download_logs_transfer_id ON download_logs(transfer_id);
