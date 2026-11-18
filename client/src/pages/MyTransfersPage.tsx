import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FolderArchive, 
  Search, 
  Filter, 
  Copy, 
  Check, 
  CalendarPlus, 
  Trash2, 
  ExternalLink, 
  MoreVertical, 
  AlertCircle,
  FileText
} from 'lucide-react';
import { apiClient } from '../api/client.js';
import { formatBytes, formatDate } from '../utils/format.js';

export const MyTransfersPage: React.FC = () => {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchTransfers();
  }, [statusFilter]);

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      let url = `/transfers?status=${statusFilter}`;
      if (search.trim()) {
        url += `&search=${encodeURIComponent(search.trim())}`;
      }
      const res = await apiClient.get(url);
      if (res.data.success) {
        setTransfers(res.data.transfers);
      }
    } catch (err) {
      console.error('Fetch transfers failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTransfers();
  };

  const handleCopyLink = (transferId: string) => {
    const url = `${window.location.origin}/download/${transferId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(transferId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExtend = async (transferId: string) => {
    try {
      const res = await apiClient.patch(`/transfers/${transferId}/extend`, { days: 7 });
      if (res.data.success) {
        setActionMessage('Transfer expiration extended by 7 days.');
        fetchTransfers();
        setTimeout(() => setActionMessage(null), 3000);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to extend expiration');
    }
  };

  const handleDelete = async (transferId: string) => {
    if (!window.confirm('Are you sure you want to delete and revoke this transfer? The files will be purged from cloud storage.')) {
      return;
    }

    try {
      const res = await apiClient.delete(`/transfers/${transferId}`);
      if (res.data.success) {
        setActionMessage('Transfer revoked and files deleted.');
        fetchTransfers();
        setTimeout(() => setActionMessage(null), 3000);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete transfer');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          My Transfers
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Manage, search, extend or revoke your active and historical file transfer links
        </p>
      </div>

      {actionMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
          {actionMessage}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold text-slate-600">
          {['all', 'completed', 'expired'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-4 py-2 rounded-lg capitalize transition-all ${
                statusFilter === tab
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'hover:text-slate-900'
              }`}
            >
              {tab === 'all' ? 'All Transfers' : tab}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by title or recipient..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          />
        </form>
      </div>

      {/* Transfers Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-xs text-slate-400">Loading transfers...</div>
        ) : transfers.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <FolderArchive className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No transfers found</p>
            <p className="text-xs text-slate-400">No matching file transfers for the selected filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-4 px-6">Transfer / Title</th>
                  <th className="py-4 px-4">Size & Files</th>
                  <th className="py-4 px-4">Downloads</th>
                  <th className="py-4 px-4">Expires</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transfers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <Link
                            to={`/transfers/${t.id}`}
                            className="font-bold text-slate-900 hover:text-brand-600 transition-colors truncate block"
                          >
                            {t.title || 'Untitled Transfer'}
                          </Link>
                          <span className="text-[11px] text-slate-400">
                            Sent {formatDate(t.createdAt)}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="font-semibold text-slate-800">{formatBytes(t.totalSizeBytes)}</div>
                      <div className="text-[11px] text-slate-400">{t.fileCount} file(s)</div>
                    </td>

                    <td className="py-4 px-4">
                      <span className="font-semibold text-slate-800">{t.downloadCount}</span>
                      {t.maxDownloads && (
                        <span className="text-[11px] text-slate-400"> / {t.maxDownloads} max</span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-slate-600 font-medium">
                      {formatDate(t.expiresAt)}
                    </td>

                    <td className="py-4 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          t.status === 'completed' && t.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                            : t.status === 'expired'
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleCopyLink(t.id)}
                          title="Copy Download Link"
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-brand-600 hover:bg-slate-50 transition-colors"
                        >
                          {copiedId === t.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          onClick={() => handleExtend(t.id)}
                          title="Extend Expiry by 7 Days"
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-brand-600 hover:bg-slate-50 transition-colors"
                        >
                          <CalendarPlus className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDelete(t.id)}
                          title="Revoke & Delete Transfer"
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <Link
                          to={`/transfers/${t.id}`}
                          title="Inspect Details"
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-brand-600 hover:bg-slate-50 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
