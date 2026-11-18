import React, { useState, useRef } from 'react';
import { 
  Mail, 
  Link as LinkIcon, 
  UploadCloud, 
  FolderPlus, 
  FilePlus, 
  Trash2, 
  Lock, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  AlertCircle, 
  X, 
  FileText,
  Sliders,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { apiClient } from '../../api/client.js';
import { formatBytes } from '../../utils/format.js';
import { UploadProgressModal } from './UploadProgressModal.js';

interface RawSelectedFile {
  file: File;
  id: string;
  name: string;
  size: number;
  mimeType: string;
}

export const TransferCard: React.FC = () => {
  const { user } = useAuth();

  // Mode: 'link' | 'email' (default to link for instant shareable link generation)
  const [transferMode, setTransferMode] = useState<'link' | 'email'>('link');

  // Files
  const [selectedFiles, setSelectedFiles] = useState<RawSelectedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  // Form Fields
  const [recipientEmails, setRecipientEmails] = useState<string>('');
  const [senderEmail, setSenderEmail] = useState<string>(user?.email || '');
  const [title, setTitle] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  // Transfer Options
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState<number>(7);
  const [passwordProtection, setPasswordProtection] = useState(false);
  const [password, setPassword] = useState('');
  const [maxDownloads, setMaxDownloads] = useState<string>('');

  // Validation / Error state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Upload Progress Modal State
  const [uploadModalData, setUploadModalData] = useState<{
    isOpen: boolean;
    transferId: string;
    token: string;
    downloadUrl: string;
    files: any[];
    chunkSizeBytes: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Sync user email if logged in
  React.useEffect(() => {
    if (user?.email && !senderEmail) {
      setSenderEmail(user.email);
    }
  }, [user]);

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const addFiles = (newFiles: File[]) => {
    setErrorMsg(null);
    const updated = [...selectedFiles];

    for (const file of newFiles) {
      // Duplicate detection
      const exists = updated.some(
        (f) => f.name === file.name && f.size === file.size
      );
      if (!exists) {
        updated.push({
          file,
          id: `${file.name}-${file.size}-${Math.random()}`,
          name: file.name,
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
        });
      }
    }
    setSelectedFiles(updated);
  };

  const removeFile = (id: string) => {
    setSelectedFiles(selectedFiles.filter((f) => f.id !== id));
  };

  const clearAllFiles = () => {
    setSelectedFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (folderInputRef.current) folderInputRef.current.value = '';
  };

  const totalTransferBytes = selectedFiles.reduce((acc, f) => acc + f.size, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validation
    if (selectedFiles.length === 0) {
      setErrorMsg('Please select at least one file to transfer.');
      return;
    }

    let parsedRecipients: string[] = [];
    if (transferMode === 'email') {
      if (!senderEmail || !senderEmail.includes('@')) {
        setErrorMsg('Please provide your sender email address so recipients know who sent the files.');
        return;
      }

      parsedRecipients = recipientEmails
        .split(/[,;\s]+/)
        .map((e) => e.trim())
        .filter((e) => e.length > 0);

      if (parsedRecipients.length === 0) {
        setErrorMsg('Please enter at least one recipient email address.');
        return;
      }

      for (const email of parsedRecipients) {
        if (!email.includes('@')) {
          setErrorMsg(`"${email}" is not a valid email address.`);
          return;
        }
      }
    }

    if (passwordProtection && (!password || password.length < 4)) {
      setErrorMsg('Password protection must be at least 4 characters long.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Initialize transfer on backend
      const payload = {
        type: transferMode,
        senderEmail: transferMode === 'email' ? senderEmail.trim() : (user?.email || 'guest@lexusicd.com'),
        recipientEmails: parsedRecipients,
        title: title.trim() || undefined,
        message: message.trim() || undefined,
        password: passwordProtection && password ? password : null,
        expiresInDays,
        maxDownloads: maxDownloads ? parseInt(maxDownloads, 10) : null,
        files: selectedFiles.map((f) => ({
          filename: f.name,
          size: f.size,
          mimeType: f.mimeType,
        })),
      };

      const res = await apiClient.post('/transfers/init', payload);
      const data = res.data;

      // Merge backend files metadata with actual File objects
      const readyFiles = data.files.map((bf: any) => {
        const matchingRaw = selectedFiles.find((sf) => sf.name === bf.filename);
        return {
          fileId: bf.fileId,
          filename: bf.filename,
          size: bf.size,
          mimeType: bf.mimeType,
          uploadSessionId: bf.uploadSessionId,
          rawFile: matchingRaw!.file,
        };
      });

      // Launch upload progress modal
      setUploadModalData({
        isOpen: true,
        transferId: data.transferId,
        token: data.token,
        downloadUrl: data.downloadUrl,
        files: readyFiles,
        chunkSizeBytes: data.chunkSizeBytes,
      });
    } catch (err: any) {
      console.error('Transfer init failed:', err);
      setErrorMsg(
        err.response?.data?.error || err.message || 'Failed to initialize transfer.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-3xl shadow-luxury border border-slate-200/80 overflow-hidden transition-all duration-300">
        {/* Dual Mode Switcher Tabs */}
        <div className="flex border-b border-slate-200/80 bg-slate-50/70 p-1.5">
          <button
            type="button"
            onClick={() => setTransferMode('link')}
            className={`flex-1 py-3 px-4 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold transition-all ${
              transferMode === 'link'
                ? 'bg-white text-brand-700 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <LinkIcon className="w-4 h-4 text-brand-600" />
            Get Shareable Link
          </button>
          <button
            type="button"
            onClick={() => setTransferMode('email')}
            className={`flex-1 py-3 px-4 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold transition-all ${
              transferMode === 'email'
                ? 'bg-white text-brand-700 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <Mail className="w-4 h-4 text-brand-600" />
            Send as Email
          </button>
        </div>

        {/* Transfer Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
              isDragOver
                ? 'border-brand-500 bg-brand-50/60 scale-[1.01]'
                : selectedFiles.length > 0
                ? 'border-slate-300 bg-slate-50/40 hover:border-slate-400'
                : 'border-slate-300 hover:border-brand-400 bg-slate-50/50 hover:bg-brand-50/20'
            }`}
          >
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center shadow-inner">
                <UploadCloud className="w-7 h-7" />
              </div>
              <div>
                <p className="text-base font-bold text-slate-800">
                  Drag and drop files or folders here
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Files up to 5 GB supported on standard plan (250 GB on Pro)
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:border-brand-500 hover:text-brand-600 font-medium text-xs shadow-sm flex items-center gap-1.5 transition-all"
                >
                  <FilePlus className="w-4 h-4 text-brand-600" />
                  Add Files
                </button>
                <button
                  type="button"
                  onClick={() => folderInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:border-brand-500 hover:text-brand-600 font-medium text-xs shadow-sm flex items-center gap-1.5 transition-all"
                >
                  <FolderPlus className="w-4 h-4 text-brand-600" />
                  Add Folder
                </button>
              </div>

              {/* Hidden HTML Inputs */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addFiles(Array.from(e.target.files));
                }}
              />
              <input
                ref={folderInputRef}
                type="file"
                // @ts-ignore
                webkitdirectory="true"
                directory="true"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addFiles(Array.from(e.target.files));
                }}
              />
            </div>
          </div>

          {/* Selected Files Drawer */}
          {selectedFiles.length > 0 && (
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>
                  {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected ({formatBytes(totalTransferBytes)})
                </span>
                <button
                  type="button"
                  onClick={clearAllFiles}
                  className="text-rose-600 hover:text-rose-700 flex items-center gap-1 font-medium transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear all
                </button>
              </div>

              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                {selectedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/70 text-xs text-slate-800"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate font-medium">{file.name}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-slate-400 font-mono">{formatBytes(file.size)}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(file.id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Input Fields */}
          <div className="space-y-4">
            {transferMode === 'email' && (
              <>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    To (Recipient Emails) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="client@company.com, colleague@work.com"
                    value={recipientEmails}
                    onChange={(e) => setRecipientEmails(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm bg-slate-50/30 text-slate-900 transition-all placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    From (Your Email) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="you@domain.com"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm bg-slate-50/30 text-slate-900 transition-all placeholder:text-slate-400"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Subject (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Q4 Master Project Deliverables"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm bg-slate-50/30 text-slate-900 transition-all placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Message (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Add a personal note or instructions for the recipient..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm bg-slate-50/30 text-slate-900 transition-all placeholder:text-slate-400 resize-none"
              />
            </div>
          </div>

          {/* Transfer Options Accordion */}
          <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-slate-50/40">
            <button
              type="button"
              onClick={() => setOptionsOpen(!optionsOpen)}
              className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-700 hover:bg-slate-100/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-brand-600" />
                <span>Transfer Security & Expiration Settings</span>
              </div>
              {optionsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {optionsOpen && (
              <div className="p-4 border-t border-slate-200/80 space-y-4 bg-white text-xs">
                {/* Expiration Slider */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="font-medium text-slate-700 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-brand-500" />
                      Expires After
                    </span>
                    <span className="font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md">
                      {expiresInDays} Day{expiresInDays > 1 ? 's' : ''}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(parseInt(e.target.value, 10))}
                    className="w-full accent-brand-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>1 Day</span>
                    <span>7 Days</span>
                    <span>14 Days</span>
                    <span>30 Days</span>
                  </div>
                </div>

                {/* Password Protection Toggle */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={passwordProtection}
                      onChange={(e) => setPasswordProtection(e.target.checked)}
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-4 h-4"
                    />
                    <Lock className="w-3.5 h-3.5 text-brand-500" />
                    <span>Password protect download link</span>
                  </label>

                  {passwordProtection && (
                    <div className="mt-2.5">
                      <input
                        type="password"
                        placeholder="Enter download password (min 4 characters)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs bg-slate-50/50"
                      />
                    </div>
                  )}
                </div>

                {/* Max Download Limit */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-700">Download Limit</p>
                    <p className="text-[10px] text-slate-400">Deactivates link after N downloads</p>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    placeholder="Unlimited"
                    value={maxDownloads}
                    onChange={(e) => setMaxDownloads(e.target.value)}
                    className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-center focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={isSubmitting || selectedFiles.length === 0}
            className={`w-full py-4 px-6 rounded-2xl font-bold text-base text-white shadow-luxury transition-all flex items-center justify-center gap-2 ${
              isSubmitting || selectedFiles.length === 0
                ? 'bg-slate-300 cursor-not-allowed shadow-none'
                : 'bg-brand-600 hover:bg-brand-700 active:scale-[0.99] shadow-brand-500/25'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Preparing Cloud Session...</span>
              </>
            ) : transferMode === 'email' ? (
              <>
                <Mail className="w-5 h-5" />
                <span>Send Files via Email</span>
              </>
            ) : (
              <>
                <LinkIcon className="w-5 h-5" />
                <span>Upload & Get Shareable Link</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Upload Progress Modal */}
      {uploadModalData && (
        <UploadProgressModal
          isOpen={uploadModalData.isOpen}
          onClose={() => setUploadModalData(null)}
          transferId={uploadModalData.transferId}
          token={uploadModalData.token}
          downloadUrl={uploadModalData.downloadUrl}
          files={uploadModalData.files}
          chunkSizeBytes={uploadModalData.chunkSizeBytes}
        />
      )}
    </>
  );
};
