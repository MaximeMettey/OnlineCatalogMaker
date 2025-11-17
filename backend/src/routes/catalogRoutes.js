import express from 'express';
import multer from 'multer';
import path from 'path';
import {
  uploadCatalog,
  getCatalogs,
  getCatalog,
  deleteCatalog,
  getPages,
  getPage,
  getPageText,
} from '../controllers/catalogController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/originals/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'catalog-' + uniqueSuffix + path.extname(file.originalname));
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
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024, // 50MB default
  },
});

// All routes require authentication and admin role
router.use(authenticateToken, requireAdmin);

// Catalog routes
router.post('/', upload.single('pdf'), uploadCatalog);
router.get('/', getCatalogs);
router.get('/:id', getCatalog);
router.delete('/:id', deleteCatalog);

// Page routes
router.get('/:id/pages', getPages);
router.get('/:id/pages/:pageNum', getPage);
router.get('/:id/pages/:pageNum/text', getPageText);

export default router;
