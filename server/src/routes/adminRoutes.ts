import { Router } from 'express';
import { AdminController } from '../controllers/adminController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// All routes require authenticated administrator
router.use(authenticate, requireAdmin);

router.get('/metrics', AdminController.getMetrics);
router.get('/users', AdminController.getUsers);
router.patch('/users/:id', AdminController.updateUser);
router.delete('/users/:id', AdminController.deleteUser);

router.get('/transfers', AdminController.getTransfers);
router.post('/transfers/:id/action', AdminController.manageTransfer);

router.get('/settings', AdminController.getSettings);
router.put('/settings', AdminController.updateSettings);

export default router;
