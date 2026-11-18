# LexusMail: Complete Render.com & Cloud Deployment Runbook

This guide provides exhaustive, production-grade instructions for deploying LexusMail to [Render.com](https://render.com/) with Google Drive API storage and managed PostgreSQL.

---

## Architecture Topology

```
                  ┌──────────────────────┐
                  │    Render Ingress    │
                  │   (HTTPS / TLS 1.3)  │
                  └──────────┬───────────┘
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   ┌─────────────────┐               ┌─────────────────┐
   │  Web Service    │               │Background Worker│
   │ (API + Static)  │               │(Purge & Emails) │
   └────────┬────────┘               └────────┬────────┘
            │                                 │
     ┌──────┴─────────────────────────────────┴──────┐
     ▼                                               ▼
┌─────────────────────────┐             ┌─────────────────────────┐
│   Render PostgreSQL     │             │    Google Drive API     │
│  (Users, Metadata, Logs)│             │ (Encrypted Object Store)│
└─────────────────────────┘             └─────────────────────────┘
```

---

## Step 1: Google Cloud Console Configuration

To configure centralized, application-managed storage in Google Drive:

1. **Create Google Cloud Project**:
   - Navigate to [Google Cloud Console](https://console.cloud.google.com/).
   - Click **Select a project** > **New Project**. Name it `LexusMail-Production`.

2. **Enable Google Drive API**:
   - Go to **APIs & Services > Library**.
   - Search for **Google Drive API** and click **Enable**.

3. **Create Service Account**:
   - Go to **IAM & Admin > Service Accounts**.
   - Click **Create Service Account**.
   - Name: `lexusmail-storage`.
   - Role: Not required at project level (permissions are granted on specific Google Drive folders/Shared Drives).
   - Click **Done**.

4. **Generate Service Account Private Key**:
   - Click on the newly created service account.
   - Go to the **Keys** tab > **Add Key** > **Create new key**.
   - Select **JSON** and click **Create**.
   - A `.json` file containing `client_email` and `private_key` will download to your machine.

5. **Configure Shared Drive or Destination Folder**:
   - Open [Google Drive](https://drive.google.com/).
   - If using Google Workspace, create a **Shared Drive** named `LexusMail Storage`.
   - Click **Manage members** and add the service account email (e.g. `lexusmail-storage@lexusmail-prod.iam.gserviceaccount.com`) as a **Content Manager** or **Manager**.
   - Note the Shared Drive ID from the URL: `https://drive.google.com/drive/folders/<SHARED_DRIVE_ID>`.
   - *If using standard Google Drive*, create a folder named `LexusMail`, click **Share**, and grant the service account Editor access.

---

## Step 2: Render.com Blueprint Deployment

Render Blueprints allow you to provision your web service, background worker, and PostgreSQL database automatically using `render.yaml`.

1. **Push Repository to GitHub / GitLab**:
   Ensure all files (including `render.yaml`, `server/`, and `client/`) are pushed to your Git repository.

2. **Create New Blueprint on Render**:
   - Log in to your [Render Dashboard](https://dashboard.render.com/).
   - Click **New +** at the top right, then select **Blueprint**.
   - Select your Git repository.
   - Name your Blueprint instance (e.g. `lexusmail`).

3. **Configure Environment Secrets**:
   Render will parse `render.yaml` and prompt you for values marked `sync: false`:
   - `APP_URL`: Set to your expected Render URL (e.g. `https://lexusmail.onrender.com`).
   - `GOOGLE_SERVICE_ACCOUNT_JSON`: Paste the entire contents of your downloaded Service Account JSON file (or create a Render Secret File).
   - `GOOGLE_DRIVE_SHARED_DRIVE_ID`: Paste your Shared Drive ID (leave blank if using standard root folder).
   - `EMAIL_PROVIDER`: Set to `resend`, `sendgrid`, `smtp`, or `console`.
   - `EMAIL_API_KEY`: Supply your Resend or SendGrid API key if applicable.

4. **Deploy**:
   - Click **Apply**.
   - Render provisions:
     1. `lexusmail-db` (PostgreSQL 16)
     2. `lexusmail-web` (Web Service)
     3. `lexusmail-worker` (Background Worker)
   - Database migrations will execute automatically on startup.
   - Default Administrator account is created: `admin@lexusmail.com` (password: `LexusAdmin2026!`).

---

## Step 3: Production Health Verification

Once Render finishes deploying:

1. **Verify Health Endpoint**:
   ```bash
   curl -i https://your-service.onrender.com/health
   ```
   Expected response:
   ```json
   {
     "status": "healthy",
     "database": "postgresql",
     "storageProvider": "google_drive",
     "uptimeSeconds": 12.4
   }
   ```

2. **Verify Swagger Documentation**:
   Navigate to `https://your-service.onrender.com/api/docs` in your browser.

3. **Verify Upload & Download**:
   - Visit the homepage.
   - Upload a test file (e.g. a document or video).
   - Verify the download link generates correctly.
   - Open an incognito window and test downloading both single files and the streaming ZIP archive.

---

## Step 4: Maintenance & Operational Runbook

### Background Worker Operations
The background worker executes every 10 minutes:
- Scans `transfers` table for expired records (`expires_at <= NOW()`).
- Permanently calls `drive.files.delete` to purge the corresponding transfer folder in Google Drive.
- Marks transfer status as `expired` in PostgreSQL.
- Cleans up incomplete upload sessions older than 24 hours.

### Scaling Guidelines
- **Vertical Scaling**: On Render, upgrade `lexusmail-web` to **Standard** (2 GB RAM) or **Pro** (4 GB RAM) for handling concurrent 200+ chunk streams.
- **Horizontal Scaling**: Because uploads and downloads stream statelessly through Google Drive and PostgreSQL, multiple web service instances can run behind Render's load balancer without session stickiness issues.
- **PostgreSQL Backups**: Render provides automatic daily backups on paid database plans.
