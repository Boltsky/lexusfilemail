import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FolderArchive, 
  Send, 
  ArrowUpRight, 
  HardDrive, 
  Files, 
  Download, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { apiClient } from '../api/client.js';
import { formatBytes, formatDate } from '../utils/format.js';

export const UserDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentTransfers();
  }, []);

  const fetchRecentTransfers = async () => {
    try {
      const res = await apiClient.get('/transfers?limit=5');
      if (res.data.success) {
        setTransfers(res.data.transfers);
      }
    } catch (err) {
      console.error('Failed to load transfers:', err);
    } finally {
      setLoading(false);
    }
  };

  const stats = user?.stats || {
    totalTransfers: 0,
    totalBytesSent: 0,
    totalFilesSent: 0,
    totalDownloads: 0,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Welcome back, <span className="font-semibold text-slate-800">{user?.name}</span>. Here is your file transfer activity.
          </p>
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Send New Files
        </Link>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Transfers</span>
            <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
              <FolderArchive className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{stats.totalTransfers}</p>
          <p className="text-[11px] text-slate-400">All created transfer sessions</p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Data Transferred</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{formatBytes(stats.totalBytesSent)}</p>
          <p className="text-[11px] text-slate-400">Total volume pushed to cloud</p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Files Uploaded</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Files className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{stats.totalFilesSent}</p>
          <p className="text-[11px] text-slate-400">Individual assets stored</p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Recipient Downloads</span>
            <div className="w-8 h-8 rounded-lg bg-accent-amber/10 text-amber-600 flex items-center justify-center">
              <Download className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{stats.totalDownloads}</p>
          <p className="text-[11px] text-slate-400">Total downloads recorded</p>
        </div>
      </div>

      {/* Recent Transfers Section */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent File Transfers</h2>
            <p className="text-xs text-slate-400 mt-0.5">Your most recent uploads and active download links</p>
          </div>
          <Link
            to="/transfers"
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            View all
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading transfers...</div>
        ) : transfers.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FolderArchive className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No transfers yet</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              You haven't sent any files yet. Drag and drop your first files on the home page!
            </p>
            <Link
              to="/"
              className="inline-block px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-semibold"
            >
              Start First Transfer
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 overflow-x-auto">
            {transfers.map((t) => (
              <div
                key={t.id}
                className="p-5 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
                    <FolderArchive className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <Link
                      to={`/transfers/${t.id}`}
                      className="text-sm font-bold text-slate-900 hover:text-brand-600 transition-colors truncate block"
                    >
                      {t.title || 'Untitled Transfer'}
                    </Link>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {t.fileCount} file{t.fileCount > 1 ? 's' : ''} • {formatBytes(t.totalSizeBytes)} • Created {formatDate(t.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0 text-xs">
                  <div className="hidden sm:block text-right">
                    <p className="font-medium text-slate-700">{t.downloadCount} Downloads</p>
                    <p className="text-[11px] text-slate-400">Expires {formatDate(t.expiresAt)}</p>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full font-semibold text-[10px] uppercase tracking-wider ${
                      t.status === 'completed' && t.isActive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                        : t.status === 'expired'
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {t.status}
                  </span>

                  <Link
                    to={`/transfers/${t.id}`}
                    className="p-1.5 text-slate-400 hover:text-brand-600 transition-colors"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
