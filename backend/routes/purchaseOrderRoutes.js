import { Router } from 'express';
import * as c from '../controllers/purchaseOrderController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateParams } from '../middleware/validateId.js';
import { ADMIN_MANAGER } from '../config/roles.js';

const router = Router();
validateParams(router, 'id');
router.use(requireAuth);

const manage = requireRole(...ADMIN_MANAGER);

router.get('/', c.listPurchaseOrders);
router.get('/:id', c.getPurchaseOrder);
router.post('/', manage, c.createPurchaseOrder);
router.put('/:id', manage, c.updatePurchaseOrder); // Pending only
router.post('/:id/receive', manage, c.receivePurchaseOrder); // adds stock
router.post('/:id/cancel', manage, c.cancelPurchaseOrder); // Pending only
router.delete('/:id', manage, c.deletePurchaseOrder); // Pending only

export default router;
