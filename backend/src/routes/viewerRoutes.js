import express from 'express';
import {
  getCatalogBySlug,
  getViewerPages,
  getViewerPage,
} from '../controllers/viewerController.js';

const router = express.Router();

// Public routes - no authentication required
router.get('/:slug', getCatalogBySlug);
router.get('/:slug/pages', getViewerPages);
router.get('/:slug/pages/:pageNum', getViewerPage);

export default router;
