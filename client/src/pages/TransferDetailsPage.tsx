import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  FolderArchive, 
  FileText, 
  Clock, 
  Users, 
  Activity, 
  Download, 
  ShieldCheck, 
  Copy, 
  Check, 
  Lock 
} from 'lucide-react';
import { apiClient } from '../api/client.js';
import { TransferDetails } from '../types/index.js';
import { formatBytes, formatDate } from '../utils/format.js';

export const TransferDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [transfer, setTransfer] = useState<TransferDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const fetchDetails = async () => {
    try {
      const res = await apiClient.get(`/transfers/${id}`);
      if (res.data.success && res.data.transfer) {
        setTransfer(res.data.transfer);
      }
    } catch (err) {
      console.error('Fetch transfer details failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!transfer) return;
    const url = `${window.location.origin}/download/${transfer.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-xs text-slate-400">
        Loading transfer details...
      </div>
    );
  }

  if (!transfer) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-3">
        <p className="font-bold text-slate-800">Transfer not found</p>
        <Link to="/transfers" className="text-xs text-brand-600 hover:underline">
          Return to My Transfers
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Back button */}
      <div>
        <Link
          to="/transfers"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Transfers
        </Link>
      </div>

      {/* Header Info Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
            <FolderArchive className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {transfer.title || 'Untitled Transfer'}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  transfer.status === 'completed' && transfer.isActive
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {transfer.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Created {formatDate(transfer.createdAt)} • Sender: {transfer.senderEmail}
            </p>
          </div>
        </div>

        <button
          onClick={handleCopyLink}
          className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-sm transition-all flex items-center gap-1.5 flex-shrink-0"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied Link' : 'Copy Download Link'}</span>
        </button>
      </div>

      {/* Transfer Metrics Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Total Size</span>
          <span className="text-lg font-bold text-slate-800 mt-1 block">{formatBytes(transfer.totalSizeBytes)}</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Files</span>
          <span className="text-lg font-bold text-slate-800 mt-1 block">{transfer.fileCount}</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Downloads</span>
          <span className="text-lg font-bold text-slate-800 mt-1 block">{transfer.downloadCount}</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Expires</span>
          <span className="text-xs font-bold text-slate-800 mt-2 block">{formatDate(transfer.expiresAt)}</span>
        </div>
      </div>

      {/* Files Section */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Transfer Files ({transfer.files?.length || 0})</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {transfer.files?.map((f) => (
            <div key={f.id} className="p-4 flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3 truncate">
                <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="font-semibold text-slate-800 truncate">{f.filename}</span>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <span className="text-slate-400 font-mono">{formatBytes(f.sizeBytes)}</span>
                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[11px]">
                  {f.downloadCount} downloads
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recipients Delivery Section (if email mode) */}
      {transfer.recipients && transfer.recipients.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">Recipient Notifications</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {transfer.recipients.map((r) => (
              <div key={r.id} className="p-4 flex items-center justify-between gap-4 text-xs">
                <span className="font-semibold text-slate-800">{r.email}</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] uppercase">
                  {r.notificationStatus}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Download Activity Audit Logs */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Download Activity Audit Trail</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Real-time log of recipient access</p>
          </div>
          <Activity className="w-4 h-4 text-brand-600" />
        </div>

        {transfer.downloadLogs && transfer.downloadLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-6">Timestamp</th>
                  <th className="py-3 px-4">Download Type</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-6">User Agent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {transfer.downloadLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-6 font-medium">{formatDate(log.downloadedAt)}</td>
                    <td className="py-3 px-4">
                      {log.isZipDownload ? (
                        <span className="px-2 py-0.5 rounded bg-brand-50 text-brand-700 font-bold text-[10px]">
                          ZIP Archive
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[10px]">
                          Single File
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {log.ipAddress || 'Unknown'}
                    </td>
                    <td className="py-3 px-6 text-[11px] text-slate-400 truncate max-w-xs">
                      {log.userAgent || 'Direct HTTP'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-400">
            No downloads recorded yet for this transfer.
          </div>
        )}
      </div>
    </div>
  );
};
