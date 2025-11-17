import db, { getTextDb } from '../config/database.js';
import { PDFProcessor } from '../services/pdf/processor.js';
import fs from 'fs/promises';
import path from 'path';
import Joi from 'joi';

// Validation schemas
const reorderSchema = Joi.object({
  pageOrders: Joi.array()
    .items(
      Joi.object({
        pageId: Joi.number().required(),
        newPosition: Joi.number().min(1).required(),
      })
    )
    .required(),
});

export const deletePage = async (req, res) => {
  try {
    const { pageId } = req.params;

    const page = await db('pages').where({ id: pageId }).first();
    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }

    const catalogId = page.catalog_id;

    // Delete physical files
    const uploadDir = path.resolve('./uploads');
    try {
      if (page.pdf_path) await fs.unlink(path.join(uploadDir, page.pdf_path));
      if (page.png_path) await fs.unlink(path.join(uploadDir, page.png_path));
      if (page.jpg_path) await fs.unlink(path.join(uploadDir, page.jpg_path));
      if (page.svg_path) await fs.unlink(path.join(uploadDir, page.svg_path));
      if (page.text_db_path) await fs.unlink(path.join(uploadDir, '..', page.text_db_path));
    } catch (error) {
      console.error('Error deleting page files:', error);
    }

    // Delete from database (clickable areas cascade automatically)
    await db('pages').where({ id: pageId }).delete();

    // Renumber remaining pages
    const remainingPages = await db('pages')
      .where({ catalog_id: catalogId })
      .orderBy('page_number');

    for (let i = 0; i < remainingPages.length; i++) {
      if (remainingPages[i].page_number !== i + 1) {
        await db('pages')
          .where({ id: remainingPages[i].id })
          .update({ page_number: i + 1 });
      }
    }

    // Update catalog total pages
    await db('catalogs')
      .where({ id: catalogId })
      .update({ total_pages: remainingPages.length });

    res.json({ message: 'Page deleted successfully' });
  } catch (error) {
    console.error('Delete page error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const reorderPages = async (req, res) => {
  try {
    const { catalogId } = req.params;

    // Validate input
    const { error, value } = reorderSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { pageOrders } = value;

    // Verify catalog exists
    const catalog = await db('catalogs').where({ id: catalogId }).first();
    if (!catalog) {
      return res.status(404).json({ error: 'Catalog not found' });
    }

    // Update page numbers in a transaction
    await db.transaction(async (trx) => {
      for (const order of pageOrders) {
        await trx('pages')
          .where({ id: order.pageId, catalog_id: catalogId })
          .update({ page_number: order.newPosition });
      }
    });

    res.json({ message: 'Pages reordered successfully' });
  } catch (error) {
    console.error('Reorder pages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const insertPages = async (req, res) => {
  try {
    const { catalogId } = req.params;
    const { position } = req.body; // Position to insert at (1-based)

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const positionNum = parseInt(position);
    if (isNaN(positionNum) || positionNum < 1) {
      return res.status(400).json({ error: 'Invalid position' });
    }

    const catalog = await db('catalogs').where({ id: catalogId }).first();
    if (!catalog) {
      return res.status(404).json({ error: 'Catalog not found' });
    }

    // Shift existing pages to make room
    const pagesToShift = await db('pages')
      .where({ catalog_id: catalogId })
      .where('page_number', '>=', positionNum)
      .orderBy('page_number', 'desc');

    // Create a temporary processor to process the new pages
    const uploadDir = path.resolve('./uploads');
    const tempProcessor = new PDFProcessor(catalogId, req.file.path, uploadDir);

    // Load the PDF to get page count
    const { PDFDocument } = await import('pdf-lib');
    const pdfBytes = await fs.readFile(req.file.path);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const newPageCount = pdfDoc.getPageCount();

    // Analyze for double pages
    const pageStructure = await tempProcessor.analyzePages(pdfDoc);
    const totalNewPages = pageStructure.reduce((sum, p) => sum + (p.isDoublePage ? 2 : 1), 0);

    // Shift existing pages
    const shiftAmount = totalNewPages;
    for (const page of pagesToShift) {
      await db('pages')
        .where({ id: page.id })
        .update({ page_number: page.page_number + shiftAmount });
    }

    // Process and insert new pages
    let currentPageNumber = positionNum;
    for (let i = 0; i < pdfDoc.getPageCount(); i++) {
      const pageInfo = pageStructure[i];

      if (pageInfo.isDoublePage) {
        await tempProcessor.processDoublePage(pdfDoc, pdfBytes, i, currentPageNumber);
        currentPageNumber += 2;
      } else {
        await tempProcessor.processPage(pdfDoc, pdfBytes, i, currentPageNumber);
        currentPageNumber += 1;
      }
    }

    // Update catalog total pages
    const allPages = await db('pages').where({ catalog_id: catalogId });
    await db('catalogs')
      .where({ id: catalogId })
      .update({ total_pages: allPages.length });

    // Clean up uploaded file
    await fs.unlink(req.file.path);

    res.json({
      message: 'Pages inserted successfully',
      insertedCount: totalNewPages,
    });
  } catch (error) {
    console.error('Insert pages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const replacePage = async (req, res) => {
  try {
    const { pageId } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const page = await db('pages').where({ id: pageId }).first();
    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }

    const catalogId = page.catalog_id;
    const pageNumber = page.page_number;

    // Delete old files
    const uploadDir = path.resolve('./uploads');
    try {
      if (page.pdf_path) await fs.unlink(path.join(uploadDir, page.pdf_path));
      if (page.png_path) await fs.unlink(path.join(uploadDir, page.png_path));
      if (page.jpg_path) await fs.unlink(path.join(uploadDir, page.jpg_path));
      if (page.svg_path) await fs.unlink(path.join(uploadDir, page.svg_path));
      if (page.text_db_path) await fs.unlink(path.join(uploadDir, '..', page.text_db_path));
    } catch (error) {
      console.error('Error deleting old page files:', error);
    }

    // Delete clickable areas for this page
    await db('clickable_areas').where({ page_id: pageId }).delete();

    // Process new page
    const tempProcessor = new PDFProcessor(catalogId, req.file.path, uploadDir);

    const { PDFDocument } = await import('pdf-lib');
    const pdfBytes = await fs.readFile(req.file.path);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    if (pdfDoc.getPageCount() !== 1) {
      await fs.unlink(req.file.path);
      return res.status(400).json({ error: 'Replacement PDF must contain exactly one page' });
    }

    // Delete old page record
    await db('pages').where({ id: pageId }).delete();

    // Process the new page
    await tempProcessor.processPage(pdfDoc, pdfBytes, 0, pageNumber);

    // Clean up uploaded file
    await fs.unlink(req.file.path);

    // Get the new page data
    const newPage = await db('pages')
      .where({ catalog_id: catalogId, page_number: pageNumber })
      .first();

    res.json({
      message: 'Page replaced successfully',
      page: newPage,
    });
  } catch (error) {
    console.error('Replace page error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export default { deletePage, reorderPages, insertPages, replacePage };
