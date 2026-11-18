import React from 'react';
import { TransferCard } from '../components/transfer/TransferCard.js';
import { 
  ShieldCheck, 
  Cloud, 
  Zap, 
  FolderArchive, 
  Lock, 
  FileCheck2, 
  ArrowRight, 
  CheckCircle, 
  Server, 
  Users 
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const HomePage: React.FC = () => {
  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 lg:pt-20 lg:pb-24">
        {/* Subtle background ambient gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-brand-200/40 via-sky-100/40 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Hero Copy */}
            <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-50 border border-brand-200/70 text-brand-700 text-xs font-semibold shadow-sm">
                <span className="w-2 h-2 rounded-full bg-brand-600 animate-ping"></span>
                Temporary Cloud File Storage & Sharing
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.12]">
                Upload Files. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 via-sky-500 to-brand-800">
                  Get a Shareable Link.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
                Temporary high-speed file storage. Drop your files, stream them securely to Google Drive, and get a direct download link to share anywhere. No account required.
              </p>

              {/* Value Highlights */}
              <div className="pt-2 grid grid-cols-2 gap-4 max-w-md mx-auto lg:mx-0 text-left text-xs font-medium text-slate-700">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>Resumable Chunked Uploads</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>Direct Google Drive Storage</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>1-Click Streaming ZIP Downloads</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>Password Protection & Expiry</span>
                </div>
              </div>
            </div>

            {/* Right Hero: Live Filemail-Style Transfer Card */}
            <div className="lg:col-span-6">
              <TransferCard />
            </div>
          </div>
        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-brand-600">Enterprise Capabilities</h2>
          <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Built for Creative Teams, Studios & Enterprises
          </p>
          <p className="text-sm text-slate-600">
            Lexus ICD eliminates file size roadblocks and network hiccups with dedicated cloud streaming.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 rounded-3xl bg-white border border-slate-200/80 shadow-sm hover:shadow-luxury transition-all space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <Cloud className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Google Drive Resumable Storage</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Files are sliced into 5MB chunks and streamed directly into Google Drive's resumable session architecture. Network drops? Uploads resume right where they paused.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-white border border-slate-200/80 shadow-sm hover:shadow-luxury transition-all space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <FolderArchive className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Instant Streaming ZIP Generation</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Recipients can download 50 files as a single consolidated ZIP archive without the server ever buffering gigabytes in RAM. Real-time streaming pipeline.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-white border border-slate-200/80 shadow-sm hover:shadow-luxury transition-all space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Zero-Knowledge Token Security</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Download tokens are hashed with SHA-256 before storage in PostgreSQL. Optional AES/Bcrypt password challenges guarantee your transfers remain strictly private.
            </p>
          </div>
        </div>
      </section>

      {/* Comparison: Email Attachments vs LexusMail */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 rounded-3xl text-white p-8 sm:p-12 lg:p-16 overflow-hidden relative">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-sky-400 text-xs font-semibold">
              <Zap className="w-3.5 h-3.5" />
              Overcome Email Limits
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Standard email caps attachments at 25 MB. <br />
              <span className="text-sky-400">Lexus ICD handles up to 250,000 MB.</span>
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Never worry about rejected email attachments, bounced mailboxes, or slow client downloads. Whether sending 4K RAW video, sound stems, architectural blueprints, or multi-gigabyte software builds, Lexus ICD delivers reliably every time.
            </p>
            <div className="pt-2">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm shadow-md transition-all"
              >
                Create Free Account
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
