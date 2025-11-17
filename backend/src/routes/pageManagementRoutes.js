import express from 'express';
import multer from 'multer';
import path from 'path';
import {
  deletePage,
  reorderPages,
  insertPages,
  replacePage,
} from '../controllers/pageManagementController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/originals/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'page-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024,
  },
});

// All routes require authentication and admin role
router.use(authenticateToken, requireAdmin);

// Page management routes
router.delete('/pages/:pageId', deletePage);
router.put('/catalogs/:catalogId/pages/reorder', reorderPages);
router.post('/catalogs/:catalogId/pages/insert', upload.single('pdf'), insertPages);
router.put('/pages/:pageId/replace', upload.single('pdf'), replacePage);

export default router;
