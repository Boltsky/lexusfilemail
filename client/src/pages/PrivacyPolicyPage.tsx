import React from 'react';
import { Shield, Lock, Eye, Trash2 } from 'lucide-react';

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-10">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold">
          <Shield className="w-3.5 h-3.5" />
          Data Privacy & Cloud Security
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-xs text-slate-400">Effective Date: November 2026</p>
      </div>

      <div className="prose prose-slate max-w-none text-xs sm:text-sm text-slate-600 leading-relaxed space-y-6">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">1. Information We Collect</h2>
          <p>
            Lexus ICD collects essential technical information necessary to orchestrate secure large file transfers. When creating a transfer, we collect the sender’s email address, recipient email addresses (for email transfers), filenames, file sizes, and MIME types. We do not inspect, monetize, or index the contents of your files.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">2. Google Drive Storage & Zero Public Exposure</h2>
          <p>
            Uploaded files are stored directly in isolated, application-managed Google Drive cloud infrastructure using the official Google Drive API v3. Uploaded assets are never marked public in Google Drive. All file streaming, single file downloads, and dynamic ZIP generation are routed through secure, authenticated, and rate-limited backend application proxies.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">3. Cryptographic Token Hashing</h2>
          <p>
            Download links utilize 128-bit cryptographically secure random tokens. In our PostgreSQL database, we store exclusively the SHA-256 hash of these tokens. In the unlikely event of a metadata database disclosure, active download links cannot be reversed or derived.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">4. Automated Expiration and Permanent Purging</h2>
          <p>
            Transfers are strictly ephemeral. Once a transfer passes its designated expiration date (between 1 and 30 days) or reaches its download limit, our automated background worker permanently deletes the associated folder and files from Google Drive cloud storage. Deleted files cannot be restored.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">5. Recipient Access Logs</h2>
          <p>
            To provide delivery confirmation and protect against unauthorized access, Lexus ICD logs recipient download activity, including timestamp, download format (single file vs ZIP archive), and IP address. Senders can inspect these logs in their user dashboard.
          </p>
        </section>
      </div>
    </div>
  );
};
