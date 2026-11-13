import { Router } from 'express';
import * as c from '../controllers/productController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateParams } from '../middleware/validateId.js';
import { ADMIN_MANAGER, STOCK_STAFF } from '../config/roles.js';

const router = Router();
validateParams(router, 'id');
router.use(requireAuth);

router.get('/', c.listProducts);
router.get('/categories', c.getCategories); // must stay above "/:id"
router.get('/:id', c.getProduct);

router.post('/', requireRole(...STOCK_STAFF), c.createProduct);
router.put('/:id', requireRole(...ADMIN_MANAGER), c.updateProduct);
router.delete('/:id', requireRole(...ADMIN_MANAGER), c.deleteProduct);

export default router;
