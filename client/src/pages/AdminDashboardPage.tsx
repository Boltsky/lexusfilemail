import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, 
  Users, 
  FolderArchive, 
  HardDrive, 
  Download, 
  Settings, 
  Trash2, 
  UserCheck, 
  UserX, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Save,
  Cloud
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { apiClient } from '../api/client.js';
import { SystemMetrics } from '../types/index.js';
import { formatBytes, formatDate } from '../utils/format.js';

export const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Tab: 'overview' | 'users' | 'transfers' | 'settings'
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'transfers' | 'settings'>('overview');

  // Metrics
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  // Users Tab State
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);

  // Transfers Tab State
  const [transfersList, setTransfersList] = useState<any[]>([]);
  const [transferSearch, setTransferSearch] = useState('');
  const [transfersLoading, setTransfersLoading] = useState(false);

  // Settings Tab State
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [actionNotice, setActionNotice] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'overview') fetchMetrics();
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'transfers') fetchTransfers();
    if (activeTab === 'settings') fetchSettings();
  }, [activeTab]);

  const fetchMetrics = async () => {
    setMetricsLoading(true);
    try {
      const res = await apiClient.get('/admin/metrics');
      if (res.data.success) {
        setMetrics(res.data.metrics);
      }
    } catch (err) {
      console.error('Fetch admin metrics error:', err);
    } finally {
      setMetricsLoading(false);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      let url = '/admin/users';
      if (userSearch.trim()) {
        url += `?search=${encodeURIComponent(userSearch.trim())}`;
      }
      const res = await apiClient.get(url);
      if (res.data.success) {
        setUsersList(res.data.users);
      }
    } catch (err) {
      console.error('Fetch users error:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchTransfers = async () => {
    setTransfersLoading(true);
    try {
      let url = '/admin/transfers';
      if (transferSearch.trim()) {
        url += `?search=${encodeURIComponent(transferSearch.trim())}`;
      }
      const res = await apiClient.get(url);
      if (res.data.success) {
        setTransfersList(res.data.transfers);
      }
    } catch (err) {
      console.error('Fetch admin transfers error:', err);
    } finally {
      setTransfersLoading(false);
    }
  };

  const fetchSettings = async () => {
    setSettingsLoading(true);
    try {
      const res = await apiClient.get('/admin/settings');
      if (res.data.success) {
        setSettings(res.data.settings);
      }
    } catch (err) {
      console.error('Fetch settings error:', err);
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleUpdateRole = async (targetUserId: string, newRole: string) => {
    try {
      await apiClient.patch(`/admin/users/${targetUserId}`, { role: newRole });
      setActionNotice(`User role updated to ${newRole}`);
      fetchUsers();
      setTimeout(() => setActionNotice(null), 3000);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update role');
    }
  };

  const handleDeleteUser = async (targetUserId: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await apiClient.delete(`/admin/users/${targetUserId}`);
      setActionNotice('User deleted successfully.');
      fetchUsers();
      setTimeout(() => setActionNotice(null), 3000);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete user');
    }
  };

  const handleManageTransfer = async (transferId: string, action: string) => {
    try {
      await apiClient.post(`/admin/transfers/${transferId}/action`, { action });
      setActionNotice(`Transfer action "${action}" executed.`);
      fetchTransfers();
      setTimeout(() => setActionNotice(null), 3000);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to manage transfer');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(false);

    const payload: Record<string, any> = {};
    for (const [key, item] of Object.entries(settings)) {
      payload[key] = item.value;
    }

    try {
      await apiClient.put('/admin/settings', payload);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update system settings');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Admin Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-semibold mb-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            Security & System Administration
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            LexusMail Control Center
          </h1>
        </div>

        {/* Tab Navigation */}
        <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold text-slate-600">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'overview' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'users' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('transfers')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'transfers' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
            }`}
          >
            Transfers
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'settings' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
            }`}
          >
            System Settings
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
          {actionNotice}
        </div>
      )}

      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {metricsLoading ? (
            <div className="p-16 text-center text-xs text-slate-400">Loading system metrics...</div>
          ) : (
            <>
              {/* Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase text-slate-500">Registered Users</span>
                    <Users className="w-5 h-5 text-brand-600" />
                  </div>
                  <p className="text-2xl font-extrabold text-slate-900">{metrics?.totalUsers}</p>
                  <p className="text-[11px] text-slate-400">Total registered accounts</p>
                </div>

                <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase text-slate-500">Active Transfers</span>
                    <FolderArchive className="w-5 h-5 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-extrabold text-slate-900">{metrics?.activeTransfers}</p>
                  <p className="text-[11px] text-slate-400">{metrics?.totalTransfers} cumulative transfers</p>
                </div>

                <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase text-slate-500">Cloud Storage Consumed</span>
                    <HardDrive className="w-5 h-5 text-sky-600" />
                  </div>
                  <p className="text-2xl font-extrabold text-slate-900">{formatBytes(metrics?.totalStorageBytes || 0)}</p>
                  <p className="text-[11px] text-slate-400">In Google Drive cloud folders</p>
                </div>

                <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase text-slate-500">Total Downloads</span>
                    <Download className="w-5 h-5 text-amber-600" />
                  </div>
                  <p className="text-2xl font-extrabold text-slate-900">{metrics?.totalDownloads}</p>
                  <p className="text-[11px] text-slate-400">Files & ZIP archives served</p>
                </div>
              </div>

              {/* Storage Architecture Callout */}
              <div className="p-6 rounded-3xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 text-brand-400 flex items-center justify-center flex-shrink-0">
                    <Cloud className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Active Storage Provider: <span className="text-brand-400 capitalize">{metrics?.storageEngine?.replace('_', ' ')}</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {metrics?.storageEngine === 'google_drive'
                        ? 'Connected to official Google Drive API v3 with automatic resumable sessions and Shared Drive support.'
                        : 'Operating in Local Storage fallback mode. To activate Google Drive, supply GOOGLE_SERVICE_ACCOUNT_JSON in environment.'}
                    </p>
                  </div>
                </div>

                <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex-shrink-0">
                  Storage Online
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* 2. USERS TAB */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchUsers();
            }}
            className="relative max-w-sm"
          >
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search user by name or email..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs bg-white"
            />
          </form>

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            {usersLoading ? (
              <div className="p-16 text-center text-xs text-slate-400">Loading users...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[10px] font-bold uppercase text-slate-500">
                      <th className="py-3.5 px-6">User</th>
                      <th className="py-3.5 px-4">Role</th>
                      <th className="py-3.5 px-4">Storage Used</th>
                      <th className="py-3.5 px-4">Joined</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/50">
                        <td className="py-3.5 px-6">
                          <p className="font-bold text-slate-900">{u.name}</p>
                          <p className="text-[11px] text-slate-400">{u.email}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              u.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono">{formatBytes(u.storageUsedBytes)}</td>
                        <td className="py-3.5 px-4 text-slate-500">{formatDate(u.createdAt)}</td>
                        <td className="py-3.5 px-6 text-right space-x-2">
                          <button
                            onClick={() => handleUpdateRole(u.id, u.role === 'admin' ? 'user' : 'admin')}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
                          >
                            {u.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-1.5 rounded-lg border border-slate-200 text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. TRANSFERS TAB */}
      {activeTab === 'transfers' && (
        <div className="space-y-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchTransfers();
            }}
            className="relative max-w-sm"
          >
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by ID, title or sender email..."
              value={transferSearch}
              onChange={(e) => setTransferSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs bg-white"
            />
          </form>

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            {transfersLoading ? (
              <div className="p-16 text-center text-xs text-slate-400">Loading transfers...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[10px] font-bold uppercase text-slate-500">
                      <th className="py-3.5 px-6">Sender & Title</th>
                      <th className="py-3.5 px-4">Size & Files</th>
                      <th className="py-3.5 px-4">Downloads</th>
                      <th className="py-3.5 px-4">Expires</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-6 text-right">Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {transfersList.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/50">
                        <td className="py-3.5 px-6">
                          <p className="font-bold text-slate-900">{t.title || 'Untitled Transfer'}</p>
                          <p className="text-[11px] text-slate-400">{t.senderEmail}</p>
                          <p className="text-[10px] font-mono text-slate-300 truncate max-w-xs">{t.id}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold">{formatBytes(t.totalSizeBytes)}</p>
                          <p className="text-[11px] text-slate-400">{t.fileCount} files</p>
                        </td>
                        <td className="py-3.5 px-4 font-semibold">{t.downloadCount}</td>
                        <td className="py-3.5 px-4 text-slate-500">{formatDate(t.expiresAt)}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              t.status === 'completed' && t.isActive
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {t.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-right space-x-1.5">
                          <button
                            onClick={() => handleManageTransfer(t.id, 'expire')}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px]"
                          >
                            Force Expire
                          </button>
                          <button
                            onClick={() => handleManageTransfer(t.id, 'toggle_active')}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px]"
                          >
                            {t.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleManageTransfer(t.id, 'delete')}
                            className="p-1.5 rounded-lg border border-slate-200 text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. SYSTEM SETTINGS TAB */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Global Transfer Engine Configuration</h2>
              <p className="text-xs text-slate-400">Settings persist dynamically in Render PostgreSQL database</p>
            </div>
          </div>

          {saveSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>System settings successfully saved and applied.</span>
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-5">
            {/* Max Upload Size */}
            {settings['max_upload_size_bytes'] && (
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Maximum Upload Size (Bytes)
                </label>
                <input
                  type="number"
                  value={settings['max_upload_size_bytes'].value}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      max_upload_size_bytes: {
                        ...settings['max_upload_size_bytes'],
                        value: parseInt(e.target.value, 10),
                      },
                    })
                  }
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/50"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Current: {formatBytes(settings['max_upload_size_bytes'].value)}
                </p>
              </div>
            )}

            {/* Max Files */}
            {settings['max_files_per_transfer'] && (
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Max Files Per Transfer
                </label>
                <input
                  type="number"
                  value={settings['max_files_per_transfer'].value}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      max_files_per_transfer: {
                        ...settings['max_files_per_transfer'],
                        value: parseInt(e.target.value, 10),
                      },
                    })
                  }
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/50"
                />
              </div>
            )}

            {/* Default Expiration Days */}
            {settings['default_expiration_days'] && (
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Default Expiration (Days)
                </label>
                <input
                  type="number"
                  value={settings['default_expiration_days'].value}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      default_expiration_days: {
                        ...settings['default_expiration_days'],
                        value: parseInt(e.target.value, 10),
                      },
                    })
                  }
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/50"
                />
              </div>
            )}

            {/* Guest Transfers Allowed Toggle */}
            {settings['allow_guest_transfers'] && (
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50">
                <div>
                  <p className="text-xs font-semibold text-slate-800">Allow Guest Transfers</p>
                  <p className="text-[10px] text-slate-400">Allow unauthenticated visitors to send files</p>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(settings['allow_guest_transfers'].value)}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      allow_guest_transfers: {
                        ...settings['allow_guest_transfers'],
                        value: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                />
              </div>
            )}

            {/* Maintenance Mode Toggle */}
            {settings['maintenance_mode'] && (
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50">
                <div>
                  <p className="text-xs font-semibold text-slate-800">Maintenance Mode</p>
                  <p className="text-[10px] text-slate-400">Temporarily suspend new transfer creation</p>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(settings['maintenance_mode'].value)}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      maintenance_mode: {
                        ...settings['maintenance_mode'],
                        value: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                />
              </div>
            )}

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-brand-600 hover:bg-brand-700 shadow-sm transition-all flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save System Settings</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
