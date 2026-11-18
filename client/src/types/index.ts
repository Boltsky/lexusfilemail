export interface FileItem {
  id?: string;
  file?: File;
  name: string;
  size: number;
  type: string;
  progress?: number;
  status?: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export interface RecipientInfo {
  id: string;
  email: string;
  notificationStatus: string;
  notifiedAt?: string;
}

export interface TransferFile {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  downloadCount: number;
  status?: string;
}

export interface TransferDetails {
  id: string;
  type: 'email' | 'link';
  title?: string;
  message?: string;
  senderEmail: string;
  fileCount: number;
  totalSizeBytes: number;
  downloadCount: number;
  maxDownloads?: number;
  expiresAt: string;
  isActive: boolean;
  status: 'pending' | 'uploading' | 'completed' | 'expired' | 'deleted' | 'failed';
  createdAt: string;
  hasPassword?: boolean;
  requiresPassword?: boolean;
  files?: TransferFile[];
  recipients?: RecipientInfo[];
  downloadLogs?: {
    id: string;
    isZipDownload: boolean;
    ipAddress?: string;
    userAgent?: string;
    downloadedAt: string;
  }[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  avatarUrl?: string;
  storageUsedBytes: number;
  createdAt?: string;
  stats?: {
    totalTransfers: number;
    totalBytesSent: number;
    totalFilesSent: number;
    totalDownloads: number;
  };
}

export interface SystemMetrics {
  totalUsers: number;
  totalTransfers: number;
  activeTransfers: number;
  expiredTransfers: number;
  failedTransfers: number;
  totalFiles: number;
  totalDownloads: number;
  totalStorageBytes: number;
  storageEngine: string;
  cloudStorageUsedBytes: number;
  cloudStorageTotalBytes?: number;
}
