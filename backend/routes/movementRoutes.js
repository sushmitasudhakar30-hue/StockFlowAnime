import { Router } from 'express';
import * as c from '../controllers/movementController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateParams } from '../middleware/validateId.js';
import { STOCK_STAFF } from '../config/roles.js';

const router = Router();
validateParams(router, 'id');
router.use(requireAuth);

router.get('/', c.listMovements);
router.get('/:id', c.getMovement);
router.post('/', requireRole(...STOCK_STAFF), c.createMovement); // Stock In / Stock Out / Transfer / Damaged

export default router;
