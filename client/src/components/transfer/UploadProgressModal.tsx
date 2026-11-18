import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Pause, 
  Play, 
  FileText, 
  Timer, 
  Zap, 
  ShieldCheck 
} from 'lucide-react';
import { apiClient } from '../../api/client.js';
import { FileItem } from '../../types/index.js';
import { formatBytes, formatDuration } from '../../utils/format.js';

interface UploadProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  transferId: string;
  token: string;
  downloadUrl: string;
  files: {
    fileId: string;
    filename: string;
    size: number;
    mimeType: string;
    uploadSessionId: string;
    rawFile: File;
  }[];
  chunkSizeBytes: number;
}

export const UploadProgressModal: React.FC<UploadProgressModalProps> = ({
  isOpen,
  onClose,
  transferId,
  token,
  downloadUrl,
  files,
  chunkSizeBytes,
}) => {
  const navigate = useNavigate();
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [totalBytesUploaded, setTotalBytesUploaded] = useState(0);
  const [totalTransferBytes, setTotalTransferBytes] = useState(0);
  const [fileProgressMap, setFileProgressMap] = useState<Record<string, number>>({});
  const [fileStatusMap, setFileStatusMap] = useState<Record<string, 'pending' | 'uploading' | 'completed' | 'error'>>({});
  const [uploadSpeedBytesPerSec, setUploadSpeedBytesPerSec] = useState(0);
  const [estimatedSecondsRemaining, setEstimatedSecondsRemaining] = useState(0);
  const [isCancelled, setIsCancelled] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const uploadStartTimeRef = useRef<number>(Date.now());
  const lastSpeedSampleTimeRef = useRef<number>(Date.now());
  const lastSampledBytesRef = useRef<number>(0);

  useEffect(() => {
    const total = files.reduce((acc, f) => acc + f.size, 0);
    setTotalTransferBytes(total);

    const initialProgress: Record<string, number> = {};
    const initialStatus: Record<string, 'pending' | 'uploading' | 'completed' | 'error'> = {};
    files.forEach((f) => {
      initialProgress[f.fileId] = 0;
      initialStatus[f.fileId] = 'pending';
    });
    setFileProgressMap(initialProgress);
    setFileStatusMap(initialStatus);

    startUploadProcess();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const startUploadProcess = async () => {
    uploadStartTimeRef.current = Date.now();
    lastSpeedSampleTimeRef.current = Date.now();
    lastSampledBytesRef.current = 0;
    let accumulatedBytes = 0;

    for (let i = 0; i < files.length; i++) {
      if (isCancelled) break;
      const fileMeta = files[i];
      setCurrentFileIndex(i);

      setFileStatusMap((prev) => ({ ...prev, [fileMeta.fileId]: 'uploading' }));

      try {
        // Step 1: Initialize resumable session with storage provider
        const initRes = await apiClient.post('/uploads/init-file', {
          transferId,
          fileId: fileMeta.fileId,
        });

        const sessionId = initRes.data.sessionId;
        const effectiveChunkSize = initRes.data.chunkSize || chunkSizeBytes || 5 * 1024 * 1024;
        const totalFileSize = fileMeta.size;

        // Step 2: Stream file in discrete chunks
        let offset = 0;
        while (offset < totalFileSize) {
          if (isCancelled) {
            throw new Error('Upload cancelled by user');
          }

          const end = Math.min(offset + effectiveChunkSize, totalFileSize);
          const chunkBlob = fileMeta.rawFile.slice(offset, end);
          const chunkBuffer = await chunkBlob.arrayBuffer();

          const contentRange = `bytes ${offset}-${end - 1}/${totalFileSize}`;

          abortControllerRef.current = new AbortController();

          await apiClient.put(`/uploads/${sessionId}/chunk`, chunkBuffer, {
            headers: {
              'Content-Type': 'application/octet-stream',
              'Content-Range': contentRange,
            },
            signal: abortControllerRef.current.signal,
          });

          offset = end;
          accumulatedBytes += chunkBlob.size;
          setTotalBytesUploaded(accumulatedBytes);

          // Update per-file progress percentage
          const filePercent = Math.min(100, Math.round((offset / totalFileSize) * 100));
          setFileProgressMap((prev) => ({ ...prev, [fileMeta.fileId]: filePercent }));

          // Update speed & ETA calculation
          const now = Date.now();
          const timeDelta = (now - lastSpeedSampleTimeRef.current) / 1000;
          if (timeDelta >= 0.5) {
            const bytesDelta = accumulatedBytes - lastSampledBytesRef.current;
            const currentSpeed = bytesDelta / timeDelta;
            setUploadSpeedBytesPerSec(currentSpeed);

            const remainingBytes = totalTransferBytes - accumulatedBytes;
            if (currentSpeed > 0) {
              setEstimatedSecondsRemaining(Math.round(remainingBytes / currentSpeed));
            }

            lastSpeedSampleTimeRef.current = now;
            lastSampledBytesRef.current = accumulatedBytes;
          }
        }

        setFileStatusMap((prev) => ({ ...prev, [fileMeta.fileId]: 'completed' }));
      } catch (err: any) {
        if (err.name === 'CanceledError' || isCancelled) {
          console.log('Upload cancelled');
          return;
        }
        console.error(`Error uploading file ${fileMeta.filename}:`, err);
        setFileStatusMap((prev) => ({ ...prev, [fileMeta.fileId]: 'error' }));
        setErrorMessage(`Failed to upload ${fileMeta.filename}: ${err.response?.data?.error || err.message}`);
        return;
      }
    }

    // All files uploaded successfully: Finalize transfer
    try {
      await apiClient.post(`/transfers/${transferId}/finalize`, {
        rawToken: token,
      });

      // Navigate to completed screen
      navigate(`/transfer-completed/${transferId}`, {
        state: {
          token,
          downloadUrl,
          filesCount: files.length,
          totalBytes: totalTransferBytes,
        },
      });
    } catch (err: any) {
      console.error('Finalize error:', err);
      setErrorMessage(err.response?.data?.error || 'Failed to finalize transfer package.');
    }
  };

  const handleCancel = () => {
    setIsCancelled(true);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    onClose();
  };

  if (!isOpen) return null;

  const overallPercent = totalTransferBytes > 0
    ? Math.min(100, Math.round((totalBytesUploaded / totalTransferBytes) * 100))
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-luxury border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <UploadCloud className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Transferring Files</h3>
              <p className="text-xs text-slate-500">
                Streaming directly to Google Drive cloud storage
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
              <div>
                <p className="font-semibold">Upload Interrupted</p>
                <p className="text-xs mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Large Overall Progress Bar */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {overallPercent}%
              </span>
              <span className="text-xs font-medium text-slate-500">
                {formatBytes(totalBytesUploaded)} of {formatBytes(totalTransferBytes)}
              </span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
              <div
                className="h-full bg-gradient-to-r from-brand-600 via-sky-500 to-accent-cyan rounded-full transition-all duration-300 ease-out"
                style={{ width: `${overallPercent}%` }}
              />
            </div>
          </div>

          {/* Metrics Row (Speed, Remaining Time, File Count) */}
          <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 text-center">
            <div>
              <div className="flex items-center justify-center gap-1 text-[11px] font-medium text-slate-500 mb-0.5">
                <Zap className="w-3.5 h-3.5 text-brand-500" />
                Upload Speed
              </div>
              <p className="text-sm font-bold text-slate-800">
                {formatBytes(uploadSpeedBytesPerSec)}/s
              </p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 text-[11px] font-medium text-slate-500 mb-0.5">
                <Timer className="w-3.5 h-3.5 text-brand-500" />
                Est. Time Left
              </div>
              <p className="text-sm font-bold text-slate-800">
                {formatDuration(estimatedSecondsRemaining)}
              </p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 text-[11px] font-medium text-slate-500 mb-0.5">
                <FileText className="w-3.5 h-3.5 text-brand-500" />
                Files
              </div>
              <p className="text-sm font-bold text-slate-800">
                {currentFileIndex + 1} / {files.length}
              </p>
            </div>
          </div>

          {/* Per-file Progress List */}
          <div>
            <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2.5">
              Individual Files
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {files.map((file) => {
                const percent = fileProgressMap[file.fileId] || 0;
                const status = fileStatusMap[file.fileId] || 'pending';

                return (
                  <div
                    key={file.fileId}
                    className="p-2.5 rounded-xl border border-slate-200/70 bg-white text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="font-medium text-slate-800 truncate">{file.filename}</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-slate-400 font-mono">{formatBytes(file.size)}</span>
                        {status === 'completed' && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        )}
                        {status === 'error' && (
                          <AlertCircle className="w-4 h-4 text-rose-500" />
                        )}
                      </div>
                    </div>
                    {/* Tiny File Bar */}
                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-200 ${
                          status === 'completed'
                            ? 'bg-emerald-500'
                            : status === 'error'
                            ? 'bg-rose-500'
                            : 'bg-brand-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex justify-between items-center text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-brand-600" />
            <span>Chunked TLS 1.3 Transport</span>
          </div>
          <button
            onClick={handleCancel}
            className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-medium transition-colors"
          >
            Cancel Upload
          </button>
        </div>
      </div>
    </div>
  );
};
