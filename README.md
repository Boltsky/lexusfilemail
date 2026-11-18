# LexusMail 🚀
### Enterprise Large File Transfer & Cloud Sharing Platform

Inspired by [Filemail](https://www.filemail.com/), **LexusMail** is a high-performance web platform engineered for transferring and sharing multi-gigabyte files (up to 250 GB) with speed, resilience, and security.

Built on an ephemeral, cloud-native architecture deployable on **Render.com**, LexusMail utilizes the official **Google Drive API v3** for persistent object storage and **PostgreSQL** for metadata, audit logs, and user management.

---

## Key Highlights

- **Dual-Mode File Transfers**: Send files directly by email with delivery tracking, or generate unique shareable download links.
- **Resumable Chunked Upload Engine**: Streams files in 5MB blocks to Google Drive resumable upload sessions, eliminating server memory bloat and recovering automatically from network drops.
- **Dynamic On-the-Fly ZIP Streaming**: Multiple files stream directly from Google Drive into a compressed ZIP archive without buffering on disk or exhausting server RAM.
- **Zero-Trust Security**: Transfer tokens are hashed before database storage (`SHA-256`). Google Drive files remain completely private and are proxied exclusively through authenticated endpoints.
- **Recipient Simplicity**: No account, registration, or software installation required for recipients to download files.
- **Render.com Ready**: Full Blueprint (`render.yaml`) orchestrating Web Service, Background Worker, and Managed PostgreSQL.

---

## Architecture Overview

```
[Browser Client]
       │
       │ (HTTPS / Chunked Streams)
       ▼
[Render Web Service (Express API + React SPA)]
       │
       ├───▶ [Google Drive API v3] (Resumable Upload Sessions & Private File Storage)
       │
       ├───▶ [Render PostgreSQL 16] (Hashed Tokens, Users, Transfers, Audit Logs)
       │
       └───▶ [Email Service] (Resend / SendGrid / SMTP / Console)

[Render Background Worker]
       │
       ├───▶ Scans Expired Transfers (expires_at < NOW())
       └───▶ Permanently purges expired folders & files from Google Drive
```

---

## Live Features & Deliverables

1. **Homepage & Transfer Studio**: Drag-and-drop dropzone, multi-file and folder uploads, duplicate file detection, aggregate size calculation.
2. **Transfer Options**: Expiration slider (1–30 days), Bcrypt password protection, maximum download limits.
3. **Real-Time Progress Modal**: Speedometer (MB/s), elapsed & remaining ETA, overall progress bar, per-file status badges.
4. **Transfer Completion View**: 1-click clipboard link copy, QR code generator for mobile downloads, and email delivery receipts.
5. **Recipient Download Experience**: Password challenge modal (for locked transfers), file cards with single-file downloads, and streaming "Download All (.zip)".
6. **User Dashboard & My Transfers**: Overview statistics (Transfers, Data Sent, Downloads), history search, status filters, extend expiration (+7 days), and manual revocation.
7. **Transfer Details & Audit Trail**: Per-file download counts, recipient delivery statuses, and real-time download logs with IP address and timestamp tracking.
8. **Admin Control Center**: System metrics, user account management (role promotion/demotion, deletion), transfer controls, and global dynamic settings editor.
9. **Interactive OpenAPI / Swagger Documentation**: Available at `/api/docs`.

---

## Local Development Setup

### Prerequisites
- Node.js 22+
- npm 12+

### 1. Clone & Install Dependencies
```bash
# Install root, server, and client dependencies
npm install
cd server && npm install
cd ../client && npm install
cd ..
```

### 2. Environment Configuration
Create a `.env` file in the root or inside `server/`:
```bash
cp .env.example server/.env
```
*Note: Out-of-the-box, LexusMail operates in local fallback mode using an embedded SQLite database and local disk chunking. To connect PostgreSQL or Google Drive, fill in `DATABASE_URL` and `GOOGLE_SERVICE_ACCOUNT_JSON`.*

### 3. Run Development Servers
```bash
npm run dev
```
- Client runs on: `http://localhost:5173`
- Backend API runs on: `http://localhost:5000`
- Swagger Documentation: `http://localhost:5000/api/docs`
- Health Check: `http://localhost:5000/health`

### 4. Run Automated Tests
```bash
npm test
```
Executes the Vitest suite testing chunking, token hashing, streaming range requests, and database persistence.

---

## Google Drive Storage Setup

To use Google Drive for production file storage:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project (e.g. `lexusmail-production`).
3. Enable the **Google Drive API**.
4. Create a **Service Account** under **IAM & Admin > Service Accounts**.
5. Generate and download a **JSON Key** for the service account.
6. Share your designated Google Drive folder or **Shared Drive** with the service account's email address (grant *Editor* permissions).
7. In your Render environment variables or `.env`, set:
   ```env
   STORAGE_PROVIDER=google_drive
   GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account", ...}
   GOOGLE_DRIVE_SHARED_DRIVE_ID=your_shared_drive_id_if_applicable
   ```

---

## Render.com Deployment Guide

Deploying to Render takes under 3 minutes using the included `render.yaml` Blueprint:

1. Push your repository to GitHub or GitLab.
2. Sign in to your [Render.com Dashboard](https://dashboard.render.com/).
3. Click **New +** and select **Blueprint**.
4. Connect your LexusMail repository.
5. Render will automatically detect `render.yaml` and configure:
   - **lexusmail-web**: Web Service (Node.js API + compiled React SPA)
   - **lexusmail-worker**: Background worker for file purge cron
   - **lexusmail-db**: Managed PostgreSQL 16 database
6. Supply your `GOOGLE_SERVICE_ACCOUNT_JSON` and `APP_URL` in the environment settings.
7. Click **Apply Blueprint**!

See [DEPLOYMENT.md](file:///c:/Users/Kyasa/OneDrive/Desktop/DESKTOP%20WORK/FILE%20MAILS/DEPLOYMENT.md) for detailed step-by-step production instructions.

---

## Default Administrative Credentials

Upon first startup, the database automatically initializes with a seed administrator:
- **Email**: `admin@lexusmail.com`
- **Password**: `LexusAdmin2026!`

*(You can customize these via `ADMIN_EMAIL` and `ADMIN_PASSWORD` in your environment variables).*

---

## License & Intellectual Property

LexusMail is custom, clean-room software designed to deliver high-capacity file transfer convenience while using original assets, modern architecture, and standard cloud APIs.
