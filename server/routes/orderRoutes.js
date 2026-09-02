import { Router } from 'express';
import { createOrder, getOrder, listOrders, updateOrderStatus } from '../controllers/orderController.js';
import { requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

// Customer-facing (no auth — this is the kiosk placing/looking up its own order).
router.post('/', createOrder);
router.get('/:orderNumber', getOrder);

// Merchant-only.
router.get('/', requireAdmin, listOrders);
router.patch('/:id/status', requireAdmin, updateOrderStatus);

export default router;
