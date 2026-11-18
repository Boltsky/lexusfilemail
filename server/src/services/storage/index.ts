import { IStorageProvider } from './IStorageProvider.js';
import { GoogleDriveStorageProvider } from './GoogleDriveStorageProvider.js';
import { LocalStorageProvider } from './LocalStorageProvider.js';
import { config } from '../../config/index.js';

let storageInstance: IStorageProvider | null = null;

export function getStorageProvider(): IStorageProvider {
  if (storageInstance) {
    return storageInstance;
  }

  if (config.storageProvider === 'google_drive') {
    const gdrive = new GoogleDriveStorageProvider();
    storageInstance = gdrive;
    return storageInstance;
  }

  if (config.storageProvider === 'local') {
    storageInstance = new LocalStorageProvider();
    return storageInstance;
  }

  // Auto mode: use Google Drive if credentials exist, otherwise fall back to Local Storage
  const gdrive = new GoogleDriveStorageProvider();
  if (gdrive.isConfigured()) {
    console.log('[StorageFactory] Active Storage Engine: Google Drive API (Production Cloud Storage)');
    storageInstance = gdrive;
  } else {
    console.log('[StorageFactory] Active Storage Engine: Local Disk Storage (Provide GOOGLE_SERVICE_ACCOUNT_JSON to activate Google Drive)');
    storageInstance = new LocalStorageProvider();
  }

  return storageInstance;
}

export * from './IStorageProvider.js';
