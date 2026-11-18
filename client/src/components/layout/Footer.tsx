import React from 'react';
import { Link } from 'react-router-dom';
import { Send, Shield, Cloud, Lock, Server } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 text-sm border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 text-white">
              <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white">
                <Send className="w-4 h-4 -rotate-12 translate-x-0.5" />
              </div>
              <span className="text-lg font-bold tracking-tight">
                Lexus<span className="text-brand-400">Mail</span>
              </span>
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed">
              Enterprise-grade large file transfers with resilient Google Drive cloud storage, dynamic ZIP streaming, and zero-trust download security.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              All Cloud Services Operational
            </div>
          </div>

          {/* Transfers & Product */}
          <div>
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">Platform</h3>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/" className="hover:text-white transition-colors">Send Files (Email / Link)</Link>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-white transition-colors">Subscription Plans</Link>
              </li>
              <li>
                <a href="/api/docs" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">API & Integrations</a>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-white transition-colors">User Dashboard</Link>
              </li>
            </ul>
          </div>

          {/* Infrastructure & Security */}
          <div>
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">Security & Cloud</h3>
            <ul className="space-y-2.5 text-xs">
              <li className="flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5 text-brand-400" />
                Google Drive Storage API
              </li>
              <li className="flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-brand-400" />
                Render.com Managed PostgreSQL
              </li>
              <li className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-brand-400" />
                SHA-256 Hashed Tokens & Bcrypt
              </li>
              <li className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-brand-400" />
                Automated Ephemeral Expiry
              </li>
            </ul>
          </div>

          {/* Legal & Trust */}
          <div>
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">Legal & Support</h3>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white transition-colors">Contact Support</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-10 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
          <p>© {new Date().getFullYear()} LexusMail. All rights reserved.</p>
          <p className="text-slate-500">
            Engineered for high-volume, reliable large file distribution.
          </p>
        </div>
      </div>
    </footer>
  );
};
