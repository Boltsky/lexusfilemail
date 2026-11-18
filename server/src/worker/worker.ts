import { db, initDb } from '../db/db.js';
import { getStorageProvider } from '../services/storage/index.js';

export async function runMaintenanceTasks(): Promise<void> {
  console.log('[Worker] Starting periodic maintenance sweep...');

  try {
    const storage = getStorageProvider();

    // 1. Clean up Expired Transfers
    const expiredTransfers = await db.query<any>(
      "SELECT id, user_id, total_size_bytes FROM transfers WHERE expires_at <= CURRENT_TIMESTAMP AND status = 'completed' AND status != 'expired' AND status != 'deleted'"
    );

    console.log(`[Worker] Found ${expiredTransfers.length} expired transfer(s) to purge.`);

    for (const t of expiredTransfers) {
      console.log(`[Worker] Purging expired transfer ${t.id} from cloud storage...`);
      try {
        await storage.deleteTransferFolder(t.id);
        await db.execute("UPDATE transfers SET status = 'expired', is_active = $1 WHERE id = $2", [
          db.isPostgres ? false : 0,
          t.id,
        ]);

        // Deduct user storage usage if registered
        if (t.user_id) {
          await db.execute(
            'UPDATE users SET storage_used_bytes = GREATEST(0, storage_used_bytes - $1) WHERE id = $2',
            [t.total_size_bytes, t.user_id]
          );
        }
      } catch (err) {
        console.error(`[Worker] Error purging transfer ${t.id}:`, err);
      }
    }

    // 2. Clean up abandoned upload sessions (> 24 hours old)
    const staleSessions = await db.query<any>(
      "SELECT id, transfer_id FROM upload_sessions WHERE is_completed = $1 AND created_at < CURRENT_TIMESTAMP - INTERVAL '24 hours'",
      [db.isPostgres ? false : 0]
    );

    if (staleSessions.length > 0) {
      console.log(`[Worker] Found ${staleSessions.length} abandoned upload sessions to remove.`);
      for (const s of staleSessions) {
        await db.execute('DELETE FROM upload_sessions WHERE id = $1', [s.id]);
      }
    }

    console.log('[Worker] Maintenance sweep completed successfully.');
  } catch (err) {
    console.error('[Worker] Maintenance task error:', err);
  }
}

// If run directly via CLI / Render Worker service
if (process.argv[1]?.includes('worker')) {
  console.log('[Worker] LexusMail Background Worker started.');
  initDb().then(() => {
    // Run immediately once
    runMaintenanceTasks();
    // Then run every 10 minutes
    setInterval(runMaintenanceTasks, 10 * 60 * 1000);
  });
}
