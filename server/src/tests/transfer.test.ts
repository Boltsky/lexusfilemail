import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import { db, initDb } from '../db/db.js';
import { TokenService } from '../services/token.js';
import { LocalStorageProvider } from '../services/storage/LocalStorageProvider.js';

describe('LexusMail Core Transfer & Storage Engine Tests', () => {
  beforeAll(async () => {
    await initDb();
  });

  afterAll(async () => {
    await db.close();
  });

  it('generates cryptographically secure transfer tokens and SHA-256 hashes', () => {
    const rawToken = TokenService.generateTransferToken();
    expect(rawToken).toBeDefined();
    expect(rawToken.length).toBeGreaterThan(20);

    const hash1 = TokenService.hashTransferToken(rawToken);
    const hash2 = TokenService.hashTransferToken(rawToken);
    expect(hash1).toEqual(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex length
    expect(hash1).not.toEqual(rawToken);
  });

  it('verifies LocalStorageProvider resumable chunking and byte integrity', async () => {
    const storage = new LocalStorageProvider();
    const testTransferId = `test-transfer-${crypto.randomUUID()}`;
    const testFilename = 'sample_large_payload.bin';
    const testData = Buffer.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`');
    const totalBytes = testData.length;

    // 1. Initialize upload
    const initRes = await storage.initUpload({
      filename: testFilename,
      mimeType: 'application/octet-stream',
      size: totalBytes,
      transferId: testTransferId,
    });

    expect(initRes.sessionUrl).toBeDefined();
    expect(initRes.sessionUrl.startsWith('local://')).toBe(true);

    // 2. Upload first chunk (half)
    const midPoint = Math.floor(totalBytes / 2);
    const chunk1 = testData.subarray(0, midPoint);
    const resChunk1 = await storage.uploadChunk({
      sessionUrl: initRes.sessionUrl,
      chunkBuffer: chunk1,
      startByte: 0,
      endByte: midPoint - 1,
      totalBytes,
      filename: testFilename,
    });

    expect(resChunk1.completed).toBe(false);
    expect(resChunk1.bytesUploaded).toBe(midPoint);

    // 3. Query status for resume check
    const status = await storage.getUploadStatus(initRes.sessionUrl, totalBytes);
    expect(status.lastByteUploaded).toBe(midPoint - 1);

    // 4. Upload second chunk (remaining)
    const chunk2 = testData.subarray(midPoint);
    const resChunk2 = await storage.uploadChunk({
      sessionUrl: initRes.sessionUrl,
      chunkBuffer: chunk2,
      startByte: midPoint,
      endByte: totalBytes - 1,
      totalBytes,
      filename: testFilename,
    });

    expect(resChunk2.completed).toBe(true);
    expect(resChunk2.fileId).toBeDefined();
    expect(resChunk2.checksum).toBeDefined();

    // 5. Test Streaming Download with Range support
    const fileId = resChunk2.fileId!;
    const downloadFull = await storage.downloadFileStream(fileId);
    expect(downloadFull.contentLength).toBe(totalBytes);

    // Read full stream into buffer
    const chunks: Buffer[] = [];
    for await (const chunk of downloadFull.stream) {
      chunks.push(Buffer.from(chunk));
    }
    const downloadedBuffer = Buffer.concat(chunks);
    expect(downloadedBuffer.toString()).toEqual(testData.toString());

    // 6. Test Range Request (bytes 5-15)
    const rangeDownload = await storage.downloadFileStream(fileId, { start: 5, end: 15 });
    expect(rangeDownload.contentLength).toBe(11);
    expect(rangeDownload.contentRange).toBe(`bytes 5-15/${totalBytes}`);

    const rangeChunks: Buffer[] = [];
    for await (const chunk of rangeDownload.stream) {
      rangeChunks.push(Buffer.from(chunk));
    }
    const rangeBuffer = Buffer.concat(rangeChunks);
    expect(rangeBuffer.toString()).toEqual(testData.subarray(5, 16).toString());

    // 7. Cleanup
    await storage.deleteTransferFolder(testTransferId);
  });

  it('persists transfer metadata in database with correct relations', async () => {
    const transferId = crypto.randomUUID();
    const token = TokenService.generateTransferToken();
    const tokenHash = TokenService.hashTransferToken(token);
    const expiresAt = new Date(Date.now() + 7 * 86400000);

    await db.execute(
      `INSERT INTO transfers (id, transfer_token_hash, type, sender_email, title, total_size_bytes, file_count, expires_at, status)
       VALUES ($1, $2, 'link', 'sender@example.com', 'Test Transfer', 1024, 1, $3, 'completed')`,
      [transferId, tokenHash, expiresAt.toISOString()]
    );

    const retrieved = await db.queryOne<any>('SELECT * FROM transfers WHERE transfer_token_hash = $1', [tokenHash]);
    expect(retrieved).not.toBeNull();
    expect(retrieved.sender_email).toBe('sender@example.com');
    expect(retrieved.title).toBe('Test Transfer');
    expect(parseInt(retrieved.total_size_bytes, 10)).toBe(1024);

    // Cleanup
    await db.execute('DELETE FROM transfers WHERE id = $1', [transferId]);
  });
});
