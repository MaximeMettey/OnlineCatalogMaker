import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { convert } from 'pdf-to-img';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import db, { initTextDb, getTextDb } from '../../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// For pdfjs-dist text extraction
pdfjsLib.GlobalWorkerOptions.workerSrc = `pdfjs-dist/legacy/build/pdf.worker.mjs`;

export class PDFProcessor {
  constructor(catalogId, filePath, uploadDir) {
    this.catalogId = catalogId;
    this.filePath = filePath;
    this.uploadDir = uploadDir;
    this.outputDir = path.join(uploadDir, 'catalogs', catalogId.toString());
  }

  async process() {
    try {
      console.log(`Starting PDF processing for catalog ${this.catalogId}`);

      // Create output directory
      await fs.mkdir(this.outputDir, { recursive: true });
      await fs.mkdir(path.join(this.outputDir, 'pages'), { recursive: true });

      // Load PDF
      const pdfBytes = await fs.readFile(this.filePath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pageCount = pdfDoc.getPageCount();

      console.log(`PDF has ${pageCount} pages`);

      // Update catalog with page count
      await db('catalogs').where({ id: this.catalogId }).update({
        total_pages: pageCount,
        status: 'processing',
      });

      // Process each page
      for (let i = 0; i < pageCount; i++) {
        const pageNumber = i + 1;
        console.log(`Processing page ${pageNumber}/${pageCount}`);

        try {
          await this.processPage(pdfDoc, pdfBytes, i, pageNumber);
        } catch (error) {
          console.error(`Error processing page ${pageNumber}:`, error);
          throw error;
        }
      }

      // Update catalog status
      await db('catalogs').where({ id: this.catalogId }).update({
        processed: true,
        status: 'ready',
      });

      console.log(`PDF processing completed for catalog ${this.catalogId}`);
      return { success: true, pageCount };
    } catch (error) {
      console.error('PDF processing error:', error);

      // Update catalog with error
      await db('catalogs').where({ id: this.catalogId }).update({
        status: 'error',
        error_message: error.message,
      });

      throw error;
    }
  }

  async processPage(pdfDoc, pdfBytes, pageIndex, pageNumber) {
    const pagePrefix = `page_${pageNumber}`;

    // 1. Extract single page PDF
    const singlePagePdf = await this.extractSinglePage(pdfDoc, pageIndex);
    const pdfPath = path.join(this.outputDir, 'pages', `${pagePrefix}.pdf`);
    await fs.writeFile(pdfPath, singlePagePdf);

    // 2. Generate images (PNG, JPG)
    const { pngPath, jpgPath, width, height } = await this.generateImages(
      pdfPath,
      pagePrefix
    );

    // 3. Extract text with coordinates
    const textDbPath = await this.extractText(pdfBytes, pageIndex, pageNumber);

    // 4. Create page record in database
    const [pageId] = await db('pages').insert({
      catalog_id: this.catalogId,
      page_number: pageNumber,
      pdf_path: path.relative(this.uploadDir, pdfPath),
      png_path: path.relative(this.uploadDir, pngPath),
      jpg_path: path.relative(this.uploadDir, jpgPath),
      svg_path: null, // SVG generation can be added later if needed
      text_db_path: textDbPath,
      width,
      height,
    });

    console.log(`Page ${pageNumber} processed successfully (ID: ${pageId})`);
    return pageId;
  }

  async extractSinglePage(pdfDoc, pageIndex) {
    const newPdf = await PDFDocument.create();
    const [copiedPage] = await newPdf.copyPages(pdfDoc, [pageIndex]);
    newPdf.addPage(copiedPage);
    return await newPdf.save();
  }

  async generateImages(pdfPath, pagePrefix) {
    const outputPath = path.join(this.outputDir, 'pages');

    try {
      // Convert PDF to PNG using pdf-to-img
      const pngPath = path.join(outputPath, `${pagePrefix}.png`);
      let width = 0;
      let height = 0;

      // Use pdf-to-img to convert
      const document = await convert(pdfPath, {
        scale: 2.0, // Higher quality
      });

      let pageBuffer;
      for await (const page of document) {
        pageBuffer = page; // Get first (and only) page
        break;
      }

      if (pageBuffer) {
        // Save PNG
        await fs.writeFile(pngPath, pageBuffer);

        // Get dimensions and create JPG
        const image = sharp(pageBuffer);
        const metadata = await image.metadata();
        width = metadata.width;
        height = metadata.height;

        // Convert to JPG
        const jpgPath = path.join(outputPath, `${pagePrefix}.jpg`);
        await image.jpeg({ quality: 90 }).toFile(jpgPath);

        return { pngPath, jpgPath, width, height };
      } else {
        throw new Error('Failed to convert PDF page to image');
      }
    } catch (error) {
      console.error('Image generation error:', error);
      throw error;
    }
  }

  async extractText(pdfBytes, pageIndex, pageNumber) {
    try {
      // Initialize text database for this page
      await initTextDb(this.catalogId, pageNumber);

      // Load PDF with pdfjs
      const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(pageIndex + 1);

      // Get text content with positions
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1.0 });

      const textDb = getTextDb(this.catalogId, pageNumber);

      try {
        // Group items into paragraphs (simple heuristic: by Y position)
        const paragraphs = this.groupIntoParagraphs(textContent.items, viewport);

        // Insert paragraphs and words
        for (const para of paragraphs) {
          const [paraId] = await textDb('paragraphs').insert({
            text: para.text,
            x: para.x,
            y: para.y,
            width: para.width,
            height: para.height,
            word_count: para.words.length,
          });

          // Insert words
          for (const word of para.words) {
            await textDb('words').insert({
              text: word.text,
              x: word.x,
              y: word.y,
              width: word.width,
              height: word.height,
              font_name: word.fontName,
              font_size: word.fontSize,
              paragraph_id: paraId,
            });
          }
        }

        console.log(`Extracted text for page ${pageNumber}: ${paragraphs.length} paragraphs`);
      } finally {
        await textDb.destroy();
      }

      const textDbPath = `data/page_${this.catalogId}_${pageNumber}.db`;
      return textDbPath;
    } catch (error) {
      console.error('Text extraction error:', error);
      throw error;
    }
  }

  groupIntoParagraphs(items, viewport) {
    const paragraphs = [];
    let currentParagraph = null;
    let lastY = null;
    const lineThreshold = 5; // pixels

    for (const item of items) {
      if (!item.str.trim()) continue;

      const transform = item.transform;
      const x = transform[4];
      const y = viewport.height - transform[5]; // Flip Y coordinate
      const width = item.width;
      const height = item.height;
      const fontSize = transform[0];

      const word = {
        text: item.str,
        x,
        y,
        width,
        height,
        fontName: item.fontName,
        fontSize,
      };

      // Start new paragraph if Y position changes significantly
      if (!currentParagraph || Math.abs(y - lastY) > lineThreshold) {
        if (currentParagraph) {
          paragraphs.push(currentParagraph);
        }

        currentParagraph = {
          text: item.str,
          x,
          y,
          width,
          height,
          words: [word],
        };
      } else {
        // Continue current paragraph
        currentParagraph.text += ' ' + item.str;
        currentParagraph.width = Math.max(
          currentParagraph.width,
          x + width - currentParagraph.x
        );
        currentParagraph.height = Math.max(currentParagraph.height, height);
        currentParagraph.words.push(word);
      }

      lastY = y;
    }

    if (currentParagraph) {
      paragraphs.push(currentParagraph);
    }

    return paragraphs;
  }
}

export default PDFProcessor;
