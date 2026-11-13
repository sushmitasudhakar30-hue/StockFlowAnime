import { Router } from 'express';
import * as c from '../controllers/supplierController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateParams } from '../middleware/validateId.js';
import { ADMIN_MANAGER } from '../config/roles.js';

const router = Router();
validateParams(router, 'id');
router.use(requireAuth);

router.get('/', c.listSuppliers);
router.get('/:id', c.getSupplier);
router.post('/', requireRole(...ADMIN_MANAGER), c.createSupplier);
router.put('/:id', requireRole(...ADMIN_MANAGER), c.updateSupplier);
router.delete('/:id', requireRole(...ADMIN_MANAGER), c.deleteSupplier);

export default router;
