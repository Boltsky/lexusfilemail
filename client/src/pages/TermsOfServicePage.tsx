import React from 'react';
import { Scale, CheckCircle2, AlertTriangle } from 'lucide-react';

export const TermsOfServicePage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-10">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold">
          <Scale className="w-3.5 h-3.5" />
          Platform Agreement
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Terms of Service
        </h1>
        <p className="text-xs text-slate-400">Effective Date: November 2026</p>
      </div>

      <div className="prose prose-slate max-w-none text-xs sm:text-sm text-slate-600 leading-relaxed space-y-6">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">1. Acceptance of Terms</h2>
          <p>
            By using LexusMail ("Platform"), whether as an unauthenticated guest, registered user, or recipient downloading files, you agree to comply with and be legally bound by these Terms of Service.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">2. Acceptable Use Policy</h2>
          <p>
            You agree not to use the Platform to transmit, distribute, or store any content that is unlawful, malicious, infringing, defamatory, or harmful. Specifically prohibited activities include:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li>Distribution of malware, ransomware, trojans, or malicious scripts.</li>
            <li>Copyright infringement or distribution of unlicensed intellectual property.</li>
            <li>Uploading ZIP bombs or recursive archives designed to exhaust system resources.</li>
            <li>Attempting to probe, bypass, or compromise storage security controls or rate limits.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">3. Storage Lifespan & Service Boundaries</h2>
          <p>
            LexusMail is a file transfer and distribution utility, not a permanent backup service. All transfers have an expiration date after which all data is permanently destroyed. Users are solely responsible for maintaining local copies and primary backups of all transferred materials.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">4. Disclaimer of Warranties & Limitation of Liability</h2>
          <p>
            LexusMail is provided on an "AS IS" and "AS AVAILABLE" basis. While our cloud architecture employs redundant Google Drive API endpoints and PostgreSQL integrity checks, we do not guarantee uninterrupted availability. In no event shall LexusMail be liable for indirect, incidental, or consequential damages resulting from data loss or transfer delays.
          </p>
        </section>
      </div>
    </div>
  );
};
