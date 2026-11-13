import { Router } from 'express';
import { dashboard } from '../controllers/reportController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.get('/', requireAuth, dashboard); // every role sees the dashboard

export default router;
