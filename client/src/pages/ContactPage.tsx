import React, { useState } from 'react';
import { Mail, MessageSquare, Send, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

export const ContactPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const faqs = [
    {
      q: 'How large of a file can I send with LexusMail?',
      a: 'Free guest transfers support up to 5 GB per transfer session. Pro users can send up to 250 GB per transfer, while Business/Enterprise plans support unlimited file sizes.',
    },
    {
      q: 'Does the recipient need a LexusMail account to download files?',
      a: 'No! Recipients simply click the download link and can download individual files or the complete streaming ZIP archive instantly with zero registration or software installation required.',
    },
    {
      q: 'How does Google Drive storage integration work?',
      a: 'LexusMail orchestrates resumable chunked upload sessions directly into dedicated Google Drive cloud folders. Files are kept strictly private and accessed only through encrypted, rate-limited backend streaming proxies.',
    },
    {
      q: 'What happens when a transfer reaches its expiration date?',
      a: 'Once a transfer expires, our automated background worker permanently purges the files from Google Drive cloud storage and flags the link as expired in the database. Expired files cannot be downloaded by anyone.',
    },
    {
      q: 'What is dynamic ZIP streaming?',
      a: 'Instead of spending minutes creating a multi-gigabyte ZIP file on the server disk before downloading, LexusMail compresses and streams files on-the-fly directly to the recipient’s browser as packets arrive from Google Drive.',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-16">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-brand-600">Get In Touch</h2>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
          Support & Frequently Asked Questions
        </h1>
        <p className="text-sm text-slate-600">
          Have questions about transfer limits, Google Drive integration, or custom enterprise deployments? We're here to help.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Contact Form */}
        <div className="lg:col-span-5 p-8 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Send an Inquiry</h2>
              <p className="text-xs text-slate-400">Our engineering team responds within 24 hours</p>
            </div>
          </div>

          {submitted ? (
            <div className="p-6 rounded-2xl bg-emerald-50 text-emerald-800 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-sm font-semibold">Message Received</p>
              <p className="text-xs text-emerald-700">Thank you for reaching out. We will get back to you shortly.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="you@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Question about Enterprise API"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Message
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="How can we assist you?"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-brand-600 hover:bg-brand-700 shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Inquiry</span>
              </button>
            </form>
          )}
        </div>

        {/* FAQ Accordion */}
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = expandedFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setExpandedFaq(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-semibold text-xs sm:text-sm text-slate-800 hover:text-brand-600"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-brand-600 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
