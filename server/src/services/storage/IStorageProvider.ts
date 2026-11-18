import { Readable } from 'stream';

export interface StorageInitUploadResult {
  sessionUrl: string;
  storageFileRef?: string;
}

export interface StorageChunkResult {
  completed: boolean;
  fileId?: string;
  checksum?: string;
  bytesUploaded: number;
}

export interface StorageDownloadResult {
  stream: Readable;
  contentLength?: number;
  contentType?: string;
  contentRange?: string;
}

export interface IStorageProvider {
  readonly name: string;

  /**
   * Initialize a resumable upload session
   */
  initUpload(params: {
    filename: string;
    mimeType: string;
    size: number;
    transferId: string;
  }): Promise<StorageInitUploadResult>;

  /**
   * Upload a chunk of bytes to the storage provider
   */
  uploadChunk(params: {
    sessionUrl: string;
    chunkBuffer: Buffer;
    startByte: number;
    endByte: number;
    totalBytes: number;
    filename?: string;
  }): Promise<StorageChunkResult>;

  /**
   * Get the current byte progress of an in-progress upload session
   */
  getUploadStatus(sessionUrl: string, totalBytes: number): Promise<{ lastByteUploaded: number }>;

  /**
   * Stream a file download with optional byte range support
   */
  downloadFileStream(
    fileId: string,
    range?: { start: number; end?: number }
  ): Promise<StorageDownloadResult>;

  /**
   * Delete a file from storage
   */
  deleteFile(fileId: string): Promise<void>;

  /**
   * Delete an entire transfer folder from storage
   */
  deleteTransferFolder(transferId: string): Promise<void>;

  /**
   * Get storage usage statistics
   */
  getStorageUsage(): Promise<{ usedBytes: number; totalBytes?: number }>;
}
