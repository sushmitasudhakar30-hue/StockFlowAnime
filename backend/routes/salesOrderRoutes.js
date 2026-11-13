import { Router } from 'express';
import * as c from '../controllers/salesOrderController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateParams } from '../middleware/validateId.js';
import { ADMIN_MANAGER, SALES_TEAM } from '../config/roles.js';

const router = Router();
validateParams(router, 'id');
router.use(requireAuth);

const sales = requireRole(...SALES_TEAM);

router.get('/', c.listSalesOrders);
router.get('/:id', c.getSalesOrder);
router.post('/', sales, c.createSalesOrder);
router.put('/:id', sales, c.updateSalesOrder); // Pending orders only

// workflow: Pending → Confirmed → Shipped → Delivered
router.post('/:id/confirm', sales, c.confirmSalesOrder); // deducts stock
router.post('/:id/ship', sales, c.shipSalesOrder);
router.post('/:id/deliver', sales, c.deliverSalesOrder);

// Sales Staff cannot cancel / return (same as the UI)
router.post('/:id/cancel', requireRole(...ADMIN_MANAGER), c.cancelSalesOrder);
router.post('/:id/return', requireRole(...ADMIN_MANAGER), c.returnSalesOrder);

router.delete('/:id', sales, c.deleteSalesOrder);

export default router;
