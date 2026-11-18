import { Router } from 'express';
import { DownloadController } from '../controllers/downloadController.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.get('/:token', DownloadController.getPublicTransfer);
router.post('/:token/verify-password', authLimiter, DownloadController.verifyPassword);
router.get('/:token/files/:fileId', DownloadController.streamFile);
router.get('/:token/archive', DownloadController.streamArchive);
router.get('/:token/zip', DownloadController.streamArchive);

export default router;
