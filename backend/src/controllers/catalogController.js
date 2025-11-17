import db from '../config/database.js';
import { PDFProcessor } from '../services/pdf/processor.js';
import slugify from 'slugify';
import path from 'path';
import fs from 'fs/promises';

export const uploadCatalog = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Catalog name is required' });
    }

    // Generate unique slug
    let slug = slugify(name, { lower: true, strict: true });
    const existingSlug = await db('catalogs').where({ slug }).first();
    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    // Create catalog record
    const [catalogId] = await db('catalogs').insert({
      name,
      original_filename: req.file.originalname,
      slug,
      status: 'processing',
    });

    console.log(`Created catalog ${catalogId}: ${name}`);

    // Start PDF processing asynchronously
    const uploadDir = path.resolve('./uploads');
    const processor = new PDFProcessor(catalogId, req.file.path, uploadDir);

    // Process in background
    processor.process().catch((error) => {
      console.error(`Background processing failed for catalog ${catalogId}:`, error);
    });

    res.status(201).json({
      message: 'Catalog upload started',
      catalog: {
        id: catalogId,
        name,
        slug,
        status: 'processing',
      },
    });
  } catch (error) {
    console.error('Upload catalog error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCatalogs = async (req, res) => {
  try {
    const catalogs = await db('catalogs')
      .select(
        'id',
        'name',
        'slug',
        'original_filename',
        'upload_date',
        'processed',
        'total_pages',
        'status',
        'created_at'
      )
      .orderBy('created_at', 'desc');

    res.json({ catalogs });
  } catch (error) {
    console.error('Get catalogs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCatalog = async (req, res) => {
  try {
    const { id } = req.params;

    const catalog = await db('catalogs')
      .where({ id })
      .select(
        'id',
        'name',
        'slug',
        'original_filename',
        'upload_date',
        'processed',
        'total_pages',
        'status',
        'error_message',
        'created_at',
        'updated_at'
      )
      .first();

    if (!catalog) {
      return res.status(404).json({ error: 'Catalog not found' });
    }

    res.json({ catalog });
  } catch (error) {
    console.error('Get catalog error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteCatalog = async (req, res) => {
  try {
    const { id } = req.params;

    const catalog = await db('catalogs').where({ id }).first();
    if (!catalog) {
      return res.status(404).json({ error: 'Catalog not found' });
    }

    // Delete files
    const catalogDir = path.resolve('./uploads/catalogs', id.toString());
    try {
      await fs.rm(catalogDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Error deleting catalog files:', error);
    }

    // Delete text databases
    const pages = await db('pages').where({ catalog_id: id });
    for (const page of pages) {
      const textDbPath = path.resolve(page.text_db_path);
      try {
        await fs.unlink(textDbPath);
      } catch (error) {
        console.error('Error deleting text database:', error);
      }
    }

    // Delete from database (cascade will handle pages and clickable_areas)
    await db('catalogs').where({ id }).delete();

    res.json({ message: 'Catalog deleted successfully' });
  } catch (error) {
    console.error('Delete catalog error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPages = async (req, res) => {
  try {
    const { id } = req.params;

    const catalog = await db('catalogs').where({ id }).first();
    if (!catalog) {
      return res.status(404).json({ error: 'Catalog not found' });
    }

    const pages = await db('pages')
      .where({ catalog_id: id })
      .select(
        'id',
        'page_number',
        'pdf_path',
        'png_path',
        'jpg_path',
        'svg_path',
        'width',
        'height',
        'created_at'
      )
      .orderBy('page_number');

    res.json({ pages });
  } catch (error) {
    console.error('Get pages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPage = async (req, res) => {
  try {
    const { id, pageNum } = req.params;

    const page = await db('pages')
      .where({ catalog_id: id, page_number: pageNum })
      .select(
        'id',
        'page_number',
        'pdf_path',
        'png_path',
        'jpg_path',
        'svg_path',
        'width',
        'height',
        'created_at'
      )
      .first();

    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }

    res.json({ page });
  } catch (error) {
    console.error('Get page error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPageText = async (req, res) => {
  try {
    const { id, pageNum } = req.params;

    const page = await db('pages')
      .where({ catalog_id: id, page_number: pageNum })
      .first();

    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }

    // Get text from the page's text database
    const { getTextDb } = await import('../config/database.js');
    const textDb = getTextDb(id, pageNum);

    try {
      const paragraphs = await textDb('paragraphs').select('*').orderBy('id');
      const words = await textDb('words').select('*').orderBy('id');

      res.json({
        paragraphs,
        words,
      });
    } finally {
      await textDb.destroy();
    }
  } catch (error) {
    console.error('Get page text error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export default {
  uploadCatalog,
  getCatalogs,
  getCatalog,
  deleteCatalog,
  getPages,
  getPage,
  getPageText,
};
