import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
  DownloadCloud, 
  FolderArchive, 
  FileText, 
  Lock, 
  KeyRound, 
  Clock, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  ArrowDownToLine, 
  Share2,
  Calendar
} from 'lucide-react';
import { apiClient } from '../api/client.js';
import { TransferDetails, TransferFile } from '../types/index.js';
import { formatBytes, formatDate } from '../utils/format.js';

export const DownloadPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const [loading, setLoading] = useState<boolean>(true);
  const [transfer, setTransfer] = useState<TransferDetails | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Password Unlock State
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [downloadGrant, setDownloadGrant] = useState<string | null>(null);

  const fetchTransferInfo = async (grant?: string) => {
    if (!token) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const headers: Record<string, string> = {};
      if (grant) {
        headers['x-download-grant'] = grant;
      }

      const res = await apiClient.get(`/download/${token}`, { headers });
      if (res.data.success && res.data.transfer) {
        setTransfer(res.data.transfer);
      } else {
        setErrorMsg('Transfer unavailable or invalid link.');
      }
    } catch (err: any) {
      console.error('Download info fetch error:', err);
      setErrorMsg(
        err.response?.data?.error || 'Transfer has expired or could not be found.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransferInfo(downloadGrant || undefined);
  }, [token]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim() || !token) return;

    setIsVerifying(true);
    setPasswordError(null);

    try {
      const res = await apiClient.post(`/download/${token}/verify-password`, {
        password: passwordInput,
      });

      if (res.data.success && res.data.downloadGrant) {
        const grant = res.data.downloadGrant;
        setDownloadGrant(grant);
        await fetchTransferInfo(grant);
      } else {
        setPasswordError('Invalid password. Please try again.');
      }
    } catch (err: any) {
      setPasswordError(err.response?.data?.error || 'Incorrect password.');
    } finally {
      setIsVerifying(false);
    }
  };

  const getDownloadUrlForFile = (fileId: string) => {
    let url = `/api/download/${token}/files/${fileId}`;
    if (downloadGrant) {
      url += `?grant=${encodeURIComponent(downloadGrant)}`;
    }
    return url;
  };

  const getZipDownloadUrl = () => {
    let url = `/api/download/${token}/archive`;
    if (downloadGrant) {
      url += `?grant=${encodeURIComponent(downloadGrant)}`;
    }
    return url;
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <div className="w-12 h-12 border-3 border-brand-500/20 border-t-brand-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-medium text-slate-600">Retrieving transfer package...</p>
      </div>
    );
  }

  if (errorMsg || !transfer) {
    return (
      <div className="max-w-md mx-auto px-4 py-24">
        <div className="bg-white rounded-3xl shadow-luxury border border-slate-200/80 p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-500 mx-auto flex items-center justify-center">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Transfer Unavailable</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {errorMsg || 'This transfer link has expired, reached its download limit, or was removed by the sender.'}
          </p>
        </div>
      </div>
    );
  }

  // Password Challenge View
  if (transfer.requiresPassword) {
    return (
      <div className="max-w-md mx-auto px-4 py-20">
        <div className="bg-white rounded-3xl shadow-luxury border border-slate-200/80 p-8 sm:p-10 space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 mx-auto flex items-center justify-center shadow-inner">
            <Lock className="w-7 h-7" />
          </div>

          <div className="text-center">
            <h2 className="text-xl font-extrabold text-slate-900">Password Protected Transfer</h2>
            <p className="text-xs text-slate-500 mt-1">
              {transfer.senderEmail && transfer.senderEmail !== 'guest@lexusicd.com' && transfer.senderEmail !== 'guest@lexusmail.com'
                ? `${transfer.senderEmail} has protected this transfer package with a security password.`
                : 'This transfer package is protected with a security password.'}
            </p>
          </div>

          {passwordError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Enter Password
              </label>
              <input
                type="password"
                required
                placeholder="Transfer password..."
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm bg-slate-50/50"
              />
            </div>

            <button
              type="submit"
              disabled={isVerifying || !passwordInput}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-brand-600 hover:bg-brand-700 shadow-sm transition-all flex items-center justify-center gap-2 disabled:bg-slate-300"
            >
              {isVerifying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Unlocking...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Unlock Files</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Unlocked Public Download View
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 sm:py-20">
      <div className="bg-white rounded-3xl shadow-luxury border border-slate-200/80 overflow-hidden">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-brand-700 via-brand-600 to-sky-600 p-8 sm:p-10 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-semibold backdrop-blur-md">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified Cloud Transfer
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {transfer.title || 'Files Ready for Download'}
              </h1>
              <p className="text-xs text-white/80">
                {transfer.senderEmail && transfer.senderEmail !== 'guest@lexusicd.com' && transfer.senderEmail !== 'guest@lexusmail.com'
                  ? <>Sent by <span className="font-semibold text-white">{transfer.senderEmail}</span></>
                  : <>Shared via <span className="font-semibold text-white">Lexus ICD</span></>}
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="flex sm:flex-col items-start sm:items-end gap-1.5 text-xs text-white/90">
              <span className="font-bold text-base sm:text-lg text-white">
                {formatBytes(transfer.totalSizeBytes)}
              </span>
              <span>{transfer.fileCount} file{transfer.fileCount > 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        {/* Transfer Body */}
        <div className="p-6 sm:p-10 space-y-8">
          {/* Sender Message Quote (if any) */}
          {transfer.message && (
            <div className="p-4 rounded-2xl bg-slate-50 border-l-4 border-brand-500 text-sm text-slate-700 italic">
              "{transfer.message}"
            </div>
          )}

          {/* Expiration and Download Limits Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-brand-500" />
              <span>Expires on: <strong className="text-slate-800">{formatDate(transfer.expiresAt)}</strong></span>
            </div>
            {transfer.maxDownloads && (
              <div>
                <span>Downloads remaining: <strong className="text-slate-800">{transfer.maxDownloads - transfer.downloadCount}</strong></span>
              </div>
            )}
          </div>

          {/* Primary Action: Download All as ZIP */}
          <div className="text-center">
            <a
              href={getZipDownloadUrl()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl font-bold text-base text-white bg-brand-600 hover:bg-brand-700 shadow-luxury shadow-brand-500/25 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <FolderArchive className="w-5 h-5" />
              Download All as ZIP ({formatBytes(transfer.totalSizeBytes)})
            </a>
            <p className="text-[11px] text-slate-400 mt-2">
              Streams all files dynamically into a single compressed archive.
            </p>
          </div>

          {/* Itemized File Listing */}
          <div>
            <div className="flex items-center justify-between mb-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <span>Files Included ({transfer.files?.length || 0})</span>
              <span>Action</span>
            </div>

            <div className="space-y-2.5">
              {transfer.files?.map((file) => (
                <div
                  key={file.id}
                  className="p-3.5 rounded-2xl border border-slate-200/80 bg-white hover:bg-slate-50/50 transition-colors flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 truncate">
                    <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {file.filename}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {formatBytes(file.sizeBytes)}
                      </p>
                    </div>
                  </div>

                  <a
                    href={getDownloadUrlForFile(file.id)}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:border-brand-500 hover:text-brand-600 text-xs font-semibold text-slate-700 transition-colors flex items-center gap-1.5 flex-shrink-0"
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
