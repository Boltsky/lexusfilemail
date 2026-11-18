import https from 'https';
import http from 'http';
import { config } from '../config/index.js';

let keepAliveInterval: NodeJS.Timeout | null = null;

export function startKeepAliveJob(intervalMs: number = 10 * 60 * 1000): void {
  // Determine target URL for health pings
  let targetUrl = config.appUrl;
  if (!targetUrl || targetUrl.includes('localhost') || targetUrl.includes('127.0.0.1')) {
    // If running in development with localhost, check if deployed URL is available
    targetUrl = 'https://lexusfilemail.onrender.com';
  }

  const pingUrl = `${targetUrl.replace(/\/$/, '')}/health`;
  console.log(`[KeepAlive] Service ping scheduled for: ${pingUrl} (every ${Math.round(intervalMs / 60000)} minutes)`);

  const doPing = () => {
    try {
      const client = pingUrl.startsWith('https') ? https : http;
      const req = client.get(pingUrl, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          console.log(`[KeepAlive] Ping dispatched at ${new Date().toISOString()} -> HTTP ${res.statusCode}`);
        });
      });

      req.on('error', (err) => {
        console.warn(`[KeepAlive] Warning pinging ${pingUrl}:`, err.message);
      });

      // 10 second timeout
      req.setTimeout(10000, () => {
        req.destroy();
      });
    } catch (err: any) {
      console.warn('[KeepAlive] Unexpected ping error:', err.message);
    }
  };

  // Run initial ping after 45 seconds to let server settle
  setTimeout(doPing, 45 * 1000);

  // Set recurring interval
  keepAliveInterval = setInterval(doPing, intervalMs);
}

export function stopKeepAliveJob(): void {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}
