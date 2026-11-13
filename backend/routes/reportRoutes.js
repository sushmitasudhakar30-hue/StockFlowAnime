import { Router } from 'express';
import * as c from '../controllers/reportController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { ADMIN_MANAGER, SALES_TEAM } from '../config/roles.js';

const router = Router();
router.use(requireAuth);

// Same visibility as the Reporting tabs in the app
router.get('/stock', requireRole(...SALES_TEAM), c.stockReport);
router.get('/sales', requireRole(...SALES_TEAM), c.salesReport);
router.get('/purchase', requireRole(...ADMIN_MANAGER), c.purchaseReport);
router.get('/warehouse', requireRole(...ADMIN_MANAGER), c.warehouseReport);

export default router;
