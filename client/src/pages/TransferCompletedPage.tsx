import React, { useEffect, useState } from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
import { 
  CheckCircle2, 
  Copy, 
  Check, 
  QrCode, 
  Send, 
  ArrowRight, 
  Share2, 
  Clock, 
  ShieldCheck, 
  Files 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { QRCodeSVG } from 'qrcode.react';
import { formatBytes } from '../utils/format.js';

export const TransferCompletedPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const state = location.state as {
    token?: string;
    downloadUrl?: string;
    filesCount?: number;
    totalBytes?: number;
  } | null;

  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const downloadUrl = state?.downloadUrl || `${window.location.origin}/download/${state?.token || id}`;

  useEffect(() => {
    // Fire festive celebratory confetti on mount
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#026fc7', '#38a9f7', '#06b6d4', '#10b981'],
    });
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(downloadUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 sm:py-24">
      <div className="bg-white rounded-3xl shadow-luxury border border-slate-200/80 p-8 sm:p-12 text-center space-y-8 animate-in fade-in-50 zoom-in-95 duration-200">
        {/* Success Icon */}
        <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-500 mx-auto flex items-center justify-center shadow-inner">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Files Successfully Transferred!
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Your transfer is uploaded and securely stored in Google Drive cloud storage.
          </p>
        </div>

        {/* Transfer Metrics Badge */}
        {state && (
          <div className="inline-flex items-center gap-6 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200/60 text-xs font-semibold text-slate-700">
            <span className="flex items-center gap-1.5">
              <Files className="w-3.5 h-3.5 text-brand-600" />
              {state.filesCount || 1} File{(state.filesCount || 1) > 1 ? 's' : ''}
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span>{formatBytes(state.totalBytes || 0)}</span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span className="flex items-center gap-1.5 text-emerald-600">
              <ShieldCheck className="w-3.5 h-3.5" />
              Cloud Verified
            </span>
          </div>
        )}

        {/* Copyable Download Link Box */}
        <div className="space-y-2 text-left">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            Shareable Download Link
          </label>
          <div className="flex items-center gap-2 p-2 rounded-2xl border border-slate-200 bg-slate-50/70 focus-within:border-brand-500 transition-colors">
            <input
              type="text"
              readOnly
              value={downloadUrl}
              className="flex-1 bg-transparent px-3 text-xs sm:text-sm font-medium text-slate-800 outline-none truncate"
            />
            <button
              onClick={handleCopy}
              className={`px-4 py-2 rounded-xl font-semibold text-xs transition-all flex items-center gap-1.5 flex-shrink-0 ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy Link
                </>
              )}
            </button>
            <button
              onClick={() => setShowQr(!showQr)}
              title="Show QR Code"
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition-colors"
            >
              <QrCode className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* QR Code Modal Drawer */}
        {showQr && (
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 inline-block mx-auto space-y-3">
            <QRCodeSVG value={downloadUrl} size={160} level="M" />
            <p className="text-[11px] text-slate-500 font-medium">Scan with camera to open download page</p>
          </div>
        )}

        {/* Primary Action Buttons */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-sm transition-all text-center flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            Send Another Transfer
          </Link>
          <Link
            to="/transfers"
            className="w-full sm:w-auto px-6 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-all text-center"
          >
            View Transfer Status
          </Link>
        </div>
      </div>
    </div>
  );
};
