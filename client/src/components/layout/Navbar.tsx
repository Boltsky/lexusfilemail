import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Send, 
  ShieldCheck, 
  LayoutDashboard, 
  FolderArchive, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  UserCircle, 
  ShieldAlert,
  HardDrive
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setDropdownOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src="/lexus-icd-logo.png"
              alt="Lexus ICD"
              className="h-10 sm:h-11 w-auto object-contain transition-transform group-hover:scale-105"
            />
            <span className="hidden sm:inline-block text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-full border border-slate-200/80">
              Cloud Transfer
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/"
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/') ? 'text-brand-600 bg-brand-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              Transfer Files
            </Link>
            <Link
              to="/pricing"
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/pricing') ? 'text-brand-600 bg-brand-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              Pricing
            </Link>
            <Link
              to="/contact"
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/contact') ? 'text-brand-600 bg-brand-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              Support & FAQ
            </Link>
            <a
              href="/api/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition-colors"
            >
              API Docs
            </a>
          </nav>

          {/* Desktop User Section */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 transition-all text-sm font-medium text-slate-700 shadow-sm"
                >
                  <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold text-xs">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="max-w-[120px] truncate">{user.name}</span>
                </button>

                {dropdownOpen && (
                  <div 
                    className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-luxury border border-slate-200/80 py-1.5 z-50 text-sm animate-in fade-in-50 zoom-in-95 duration-100"
                    onMouseLeave={() => setDropdownOpen(false)}
                  >
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="font-medium text-slate-900 truncate">{user.name}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>

                    <Link
                      to="/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50 hover:text-brand-600 transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4 text-slate-400" />
                      Dashboard
                    </Link>

                    <Link
                      to="/transfers"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50 hover:text-brand-600 transition-colors"
                    >
                      <FolderArchive className="w-4 h-4 text-slate-400" />
                      My Transfers
                    </Link>

                    <Link
                      to="/settings"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50 hover:text-brand-600 transition-colors"
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      Account Settings
                    </Link>

                    {user.role === 'admin' && (
                      <Link
                        to="/admin"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-amber-700 bg-amber-50/50 hover:bg-amber-100/60 transition-colors font-medium"
                      >
                        <ShieldAlert className="w-4 h-4 text-amber-600" />
                        Admin Panel
                      </Link>
                    )}

                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-rose-600 hover:bg-rose-50 transition-colors text-left"
                      >
                        <LogOut className="w-4 h-4 text-rose-500" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100/70 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 shadow-sm shadow-brand-500/30 transition-all hover:scale-[1.02]"
                >
                  Create Account
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-6 space-y-2">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-slate-800 hover:bg-slate-50"
          >
            Transfer Files
          </Link>
          <Link
            to="/pricing"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-slate-800 hover:bg-slate-50"
          >
            Pricing
          </Link>
          <Link
            to="/contact"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-slate-800 hover:bg-slate-50"
          >
            Support
          </Link>
          {user ? (
            <>
              <div className="border-t border-slate-100 pt-3 mt-3">
                <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">My Account</p>
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-base font-medium text-slate-800 hover:bg-slate-50"
                >
                  Dashboard
                </Link>
                <Link
                  to="/transfers"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-base font-medium text-slate-800 hover:bg-slate-50"
                >
                  My Transfers
                </Link>
                {user.role === 'admin' && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-base font-medium text-amber-700 bg-amber-50"
                  >
                    Admin Control Center
                  </Link>
                )}
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-rose-600 font-medium hover:bg-rose-50 rounded-lg mt-2"
                >
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <div className="border-t border-slate-100 pt-4 mt-2 flex flex-col gap-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-lg border border-slate-200 text-slate-700 font-medium"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-lg bg-brand-600 text-white font-medium shadow-sm"
              >
                Create Account
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
