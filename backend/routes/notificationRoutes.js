import { Router } from 'express';
import * as c from '../controllers/notificationController.js';
import { requireAuth } from '../middleware/auth.js';
import { validateParams } from '../middleware/validateId.js';

const router = Router();
validateParams(router, 'id');
router.use(requireAuth);

router.get('/', c.listNotifications); // optional ?unread=true
router.get('/unread-count', c.unreadCount);
router.post('/', c.createNotification);
router.patch('/read-all', c.markAllRead); // must stay above "/:id/read"
router.patch('/:id/read', c.markRead);
router.delete('/:id', c.deleteNotification);

export default router;
