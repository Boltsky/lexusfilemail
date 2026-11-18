import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import swaggerUi from 'swagger-ui-express';
import { fileURLToPath } from 'url';

import { config } from './config/index.js';
import { db, initDb } from './db/db.js';
import { getStorageProvider } from './services/storage/index.js';
import { runMaintenanceTasks } from './worker/worker.js';

import authRoutes from './routes/authRoutes.js';
import transferRoutes from './routes/transferRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import downloadRoutes from './routes/downloadRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security Headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows flexible CDN font/script loading
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration
app.use(
  cors({
    origin: true,
    credentials: true,
    exposedHeaders: ['Content-Range', 'Content-Disposition', 'Accept-Ranges', 'Content-Length'],
  })
);

// Standard JSON parser (Chunk uploads use express.raw on their specific endpoint)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Swagger / OpenAPI documentation
let swaggerDocPath = path.resolve(__dirname, 'docs', 'swagger.json');
if (!fs.existsSync(swaggerDocPath)) {
  swaggerDocPath = path.resolve(process.cwd(), 'src', 'docs', 'swagger.json');
}
if (fs.existsSync(swaggerDocPath)) {
  const swaggerDoc = JSON.parse(fs.readFileSync(swaggerDocPath, 'utf8'));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));
}

// Health check endpoint for Render.com (responds instantly for zero-downtime deployment)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: process.uptime(),
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/download', downloadRoutes);
app.use('/api/admin', adminRoutes);

// Serve static frontend build in production
let clientDistPath = path.resolve(__dirname, 'public');
if (!fs.existsSync(clientDistPath)) {
  clientDistPath = path.resolve(__dirname, '../../client/dist');
}
if (!fs.existsSync(clientDistPath)) {
  clientDistPath = path.resolve(process.cwd(), '../client/dist');
}
if (!fs.existsSync(clientDistPath)) {
  clientDistPath = path.resolve(process.cwd(), 'client/dist');
}

console.log('[Server] Client static distribution path:', clientDistPath, 'Exists:', fs.existsSync(clientDistPath));

if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Global 404 handler for unmatched API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.originalUrl} not found` });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[UnhandledError]', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// Server Initialization
function startServer() {
  const server = app.listen(config.port, '0.0.0.0', () => {
    console.log(`\n========================================================`);
    console.log(`  🚀 Lexus ICD Server running on port ${config.port}`);
    console.log(`  🌐 Public App URL: ${config.appUrl}`);
    console.log(`  📚 API Documentation: http://localhost:${config.port}/api/docs`);
    console.log(`  ❤️  Health Check: http://localhost:${config.port}/health`);
    console.log(`========================================================\n`);
  });

  // Run database initialization asynchronously without blocking server port binding
  initDb()
    .then(() => {
      console.log('[Server] Database initialized successfully.');
      // Start background maintenance cycle (every 10 minutes)
      setInterval(() => {
        runMaintenanceTasks().catch(err => console.error('[MaintenanceCron] Error:', err));
      }, 10 * 60 * 1000);
    })
    .catch((err) => {
      console.error('[Server] Non-fatal DB init error (will retry on next request):', err);
    });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\n[Server] Shutting down gracefully...');
    server.close(async () => {
      await db.close();
      console.log('[Server] Connections closed. Exiting.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer();
