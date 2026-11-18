import express, { Router } from 'express';
import { UploadController } from '../controllers/uploadController.js';
import { chunkUploadLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/init-file', UploadController.initFileUpload);

// Raw binary body parser for chunk streaming
router.put(
  '/:sessionId/chunk',
  chunkUploadLimiter,
  express.raw({ type: '*/*', limit: '50mb' }),
  UploadController.uploadChunk
);

router.get('/:sessionId/status', UploadController.getUploadStatus);

export default router;
