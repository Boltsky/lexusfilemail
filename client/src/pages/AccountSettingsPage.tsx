import React, { useState } from 'react';
import { User, Lock, HardDrive, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { apiClient } from '../api/client.js';
import { formatBytes } from '../utils/format.js';

export const AccountSettingsPage: React.FC = () => {
  const { user, refreshUser } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<{ success: boolean; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);

    if (newPassword.length < 8) {
      setPasswordStatus({ success: false, msg: 'New password must be at least 8 characters.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordStatus({ success: false, msg: 'Passwords do not match.' });
      return;
    }

    setLoading(true);

    try {
      const res = await apiClient.post('/auth/reset-password', {
        token: 'settings-direct',
        newPassword,
      });

      if (res.data.success) {
        setPasswordStatus({ success: true, msg: 'Password updated successfully.' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setPasswordStatus({
        success: false,
        msg: err.response?.data?.error || 'Failed to update password',
      });
    } finally {
      setLoading(false);
    }
  };

  const storageUsed = user?.storageUsedBytes || 0;
  const storageLimit = 5 * 1024 * 1024 * 1024; // 5 GB standard
  const storagePercent = Math.min(100, Math.round((storageUsed / storageLimit) * 100));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Account Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Manage your personal profile, credentials and cloud quota
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="md:col-span-1 p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-6">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-brand-100 text-brand-700 mx-auto flex items-center justify-center font-bold text-2xl">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{user?.name}</h2>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
            <span className="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold uppercase tracking-wider">
              {user?.role} Tier
            </span>
          </div>

          {/* Storage Meter */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-brand-500" />
                Active Storage
              </span>
              <span className="font-bold text-slate-800">{storagePercent}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-600 rounded-full transition-all duration-300"
                style={{ width: `${storagePercent}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              {formatBytes(storageUsed)} used of {formatBytes(storageLimit)} quota
            </p>
          </div>
        </div>

        {/* Change Password & Security Form */}
        <div className="md:col-span-2 p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Security Credentials</h2>
              <p className="text-xs text-slate-400">Update your account authentication password</p>
            </div>
          </div>

          {passwordStatus && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
                passwordStatus.success
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-700'
              }`}
            >
              {passwordStatus.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-500" />
              )}
              <span>{passwordStatus.msg}</span>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                New Password (min 8 chars)
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-brand-600 hover:bg-brand-700 shadow-sm transition-all"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
