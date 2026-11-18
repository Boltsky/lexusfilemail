import React from 'react';
import { Link } from 'react-router-dom';
import { Check, Zap, Sparkles, ShieldCheck, ArrowRight } from 'lucide-react';

export const PricingPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-16">
      {/* Title */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-brand-600">Transparent Pricing</h2>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
          Simple Plans for Any Transfer Scale
        </h1>
        <p className="text-sm text-slate-600">
          Start sending large files for free, or unlock enterprise transfer capacities with dedicated Google Cloud backing.
        </p>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {/* Free Plan */}
        <div className="p-8 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-8">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Basic / Guest</h3>
              <p className="text-xs text-slate-500 mt-1">For casual quick transfers</p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-slate-900">$0</span>
              <span className="text-xs text-slate-400">/ forever</span>
            </div>

            <ul className="space-y-3 text-xs text-slate-600">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Up to <strong>5 GB</strong> per transfer</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Files retained for <strong>7 days</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Send as Email or Link</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>1-Click Streaming ZIP Downloads</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Standard Resumable Chunking</span>
              </li>
            </ul>
          </div>

          <Link
            to="/"
            className="w-full py-3 px-4 rounded-xl font-bold text-xs text-center border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Start Free
          </Link>
        </div>

        {/* Pro Plan (Featured) */}
        <div className="p-8 rounded-3xl bg-slate-900 text-white border-2 border-brand-500 shadow-luxury flex flex-col justify-between space-y-8 relative">
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-brand-500 text-white text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-md">
            <Sparkles className="w-3 h-3" />
            Most Popular
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white">Professional</h3>
              <p className="text-xs text-slate-400 mt-1">For freelancers, editors & studios</p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-white">$14</span>
              <span className="text-xs text-slate-400">/ month</span>
            </div>

            <ul className="space-y-3 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-sky-400 flex-shrink-0" />
                <span>Up to <strong>250 GB</strong> per transfer</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-sky-400 flex-shrink-0" />
                <span>Files retained for <strong>30 days</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-sky-400 flex-shrink-0" />
                <span>Password Protected Transfers</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-sky-400 flex-shrink-0" />
                <span>Download limits & access logs</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-sky-400 flex-shrink-0" />
                <span>Delivery tracking alerts</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-sky-400 flex-shrink-0" />
                <span>High-Speed Accelerated Chunks</span>
              </li>
            </ul>
          </div>

          <Link
            to="/register"
            className="w-full py-3.5 px-4 rounded-xl font-bold text-xs text-center bg-brand-500 hover:bg-brand-400 text-white shadow-md transition-colors flex items-center justify-center gap-1.5"
          >
            <span>Upgrade to Pro</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Business Plan */}
        <div className="p-8 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-8">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Business Team</h3>
              <p className="text-xs text-slate-500 mt-1">For production houses & enterprises</p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-slate-900">$24</span>
              <span className="text-xs text-slate-400">/ user / month</span>
            </div>

            <ul className="space-y-3 text-xs text-slate-600">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span><strong>Unlimited</strong> file transfer size</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span><strong>1 TB+</strong> persistent cloud storage per user</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Multi-User Administrative Roles</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Custom Branding & Subdomains</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Comprehensive Audit Logging & SSO</span>
              </li>
            </ul>
          </div>

          <Link
            to="/contact"
            className="w-full py-3 px-4 rounded-xl font-bold text-xs text-center border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Contact Sales
          </Link>
        </div>
      </div>
    </div>
  );
};
