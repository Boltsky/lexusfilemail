import { Router } from 'express';
import { TransferController } from '../controllers/transferController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { transferInitLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/init', transferInitLimiter, optionalAuth, TransferController.initTransfer);
router.post('/:id/finalize', TransferController.finalizeTransfer);
router.get('/', authenticate, TransferController.getUserTransfers);
router.get('/:id', optionalAuth, TransferController.getTransferDetails);
router.delete('/:id', authenticate, TransferController.deleteTransfer);
router.patch('/:id/extend', authenticate, TransferController.extendExpiration);

export default router;
