import { Router } from 'express';
import { getUsers, createUser, updateUser, toggleUser, deleteUser } from '../controllers/userController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRole('Admin')); // every user-management route is Admin only

router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.patch('/:id/toggle', toggleUser);
router.delete('/:id', deleteUser);

export default router;
