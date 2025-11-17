import express from 'express';
import {
  createArea,
  updateArea,
  deleteArea,
  getPageAreas,
} from '../controllers/clickableAreaController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticateToken, requireAdmin);

router.post('/pages/:pageId/areas', createArea);
router.get('/pages/:pageId/areas', getPageAreas);
router.put('/areas/:id', updateArea);
router.delete('/areas/:id', deleteArea);

export default router;
