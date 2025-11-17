import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { fromPath } from 'pdf2pic';
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

      // Analyze pages to detect double pages
      const pageStructure = await this.analyzePages(pdfDoc);
      const totalOutputPages = pageStructure.reduce((sum, p) => sum + (p.isDoublePage ? 2 : 1), 0);

      console.log(`Detected ${totalOutputPages} output pages (${pageStructure.filter(p => p.isDoublePage).length} double pages will be split)`);

      // Update catalog with page count
      await db('catalogs').where({ id: this.catalogId }).update({
        total_pages: totalOutputPages,
        status: 'processing',
      });

      // Process each page (with splitting for double pages)
      let outputPageNumber = 1;
      for (let i = 0; i < pageCount; i++) {
        const pageInfo = pageStructure[i];
        console.log(`Processing source page ${i + 1}/${pageCount} (output page ${outputPageNumber})`);

        try {
          if (pageInfo.isDoublePage) {
            // Split into two pages
            console.log(`  Splitting double page into pages ${outputPageNumber} and ${outputPageNumber + 1}`);
            await this.processDoublePage(pdfDoc, pdfBytes, i, outputPageNumber);
            outputPageNumber += 2;
          } else {
            // Process as single page
            await this.processPage(pdfDoc, pdfBytes, i, outputPageNumber);
            outputPageNumber += 1;
          }
        } catch (error) {
          console.error(`Error processing page ${i + 1}:`, error);
          throw error;
        }
      }

      // Update catalog status
      await db('catalogs').where({ id: this.catalogId }).update({
        processed: true,
        status: 'ready',
      });

      console.log(`PDF processing completed for catalog ${this.catalogId}`);
      return { success: true, pageCount: totalOutputPages };
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

  async analyzePages(pdfDoc) {
    const pageCount = pdfDoc.getPageCount();
    const pageStructure = [];

    for (let i = 0; i < pageCount; i++) {
      const page = pdfDoc.getPage(i);
      const { width, height } = page.getSize();
      const aspectRatio = width / height;

      // Consider it a double page if:
      // 1. Width is significantly larger than height (landscape)
      // 2. Aspect ratio > 1.5 (indicating two pages side by side)
      const isDoublePage = aspectRatio > 1.5;

      pageStructure.push({
        index: i,
        width,
        height,
        aspectRatio,
        isDoublePage,
      });

      if (isDoublePage) {
        console.log(`  Page ${i + 1}: ${width}x${height} (ratio: ${aspectRatio.toFixed(2)}) - DOUBLE PAGE`);
      }
    }

    return pageStructure;
  }

  async processDoublePage(pdfDoc, pdfBytes, pageIndex, startPageNumber) {
    // Extract the double page
    const page = pdfDoc.getPage(pageIndex);
    const { width, height } = page.getSize();

    // Split into left and right halves
    const halfWidth = width / 2;

    // Create left page
    await this.processSplitPage(pdfDoc, pdfBytes, pageIndex, startPageNumber, 0, 0, halfWidth, height, 'left');

    // Create right page
    await this.processSplitPage(pdfDoc, pdfBytes, pageIndex, startPageNumber + 1, halfWidth, 0, halfWidth, height, 'right');
  }

  async processSplitPage(pdfDoc, pdfBytes, pageIndex, outputPageNumber, cropX, cropY, cropWidth, cropHeight, side) {
    const pagePrefix = `page_${outputPageNumber}`;

    // 1. Extract and crop the page
    const croppedPdf = await this.extractAndCropPage(pdfDoc, pageIndex, cropX, cropY, cropWidth, cropHeight);
    const pdfPath = path.join(this.outputDir, 'pages', `${pagePrefix}.pdf`);
    await fs.writeFile(pdfPath, croppedPdf);

    // 2. Generate images
    const { pngPath, jpgPath, width, height } = await this.generateImages(pdfPath, pagePrefix);

    // 3. Extract text with coordinates (adjusted for crop)
    const textDbPath = await this.extractTextFromCrop(pdfBytes, pageIndex, outputPageNumber, cropX, cropY, cropWidth, cropHeight);

    // 4. Create page record
    const [pageId] = await db('pages').insert({
      catalog_id: this.catalogId,
      page_number: outputPageNumber,
      pdf_path: path.relative(this.uploadDir, pdfPath),
      png_path: path.relative(this.uploadDir, pngPath),
      jpg_path: path.relative(this.uploadDir, jpgPath),
      svg_path: null,
      text_db_path: textDbPath,
      width,
      height,
    });

    console.log(`  Page ${outputPageNumber} (${side} half) processed successfully (ID: ${pageId})`);
    return pageId;
  }

  async extractAndCropPage(pdfDoc, pageIndex, cropX, cropY, cropWidth, cropHeight) {
    const newPdf = await PDFDocument.create();
    const [copiedPage] = await newPdf.copyPages(pdfDoc, [pageIndex]);

    // Set crop box to extract only the specified region
    copiedPage.setCropBox(cropX, cropY, cropWidth, cropHeight);
    copiedPage.setMediaBox(cropX, cropY, cropWidth, cropHeight);

    newPdf.addPage(copiedPage);
    return await newPdf.save();
  }

  async extractTextFromCrop(pdfBytes, pageIndex, outputPageNumber, cropX, cropY, cropWidth, cropHeight) {
    try {
      await initTextDb(this.catalogId, outputPageNumber);

      const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(pageIndex + 1);

      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1.0 });

      const textDb = getTextDb(this.catalogId, outputPageNumber);

      try {
        // Filter items that fall within the crop region and adjust coordinates
        const filteredItems = textContent.items.filter(item => {
          const x = item.transform[4];
          const y = viewport.height - item.transform[5];
          return x >= cropX && x < (cropX + cropWidth) && y >= cropY && y < (cropY + cropHeight);
        });

        // Adjust coordinates relative to crop
        const adjustedItems = filteredItems.map(item => ({
          ...item,
          transform: [
            ...item.transform.slice(0, 4),
            item.transform[4] - cropX, // Adjust X
            item.transform[5] - cropY  // Adjust Y
          ]
        }));

        // Create adjusted viewport for the cropped area
        const croppedViewport = {
          width: cropWidth,
          height: cropHeight
        };

        const paragraphs = this.groupIntoParagraphs(adjustedItems, croppedViewport);

        for (const para of paragraphs) {
          const [paraId] = await textDb('paragraphs').insert({
            text: para.text,
            x: para.x,
            y: para.y,
            width: para.width,
            height: para.height,
            word_count: para.words.length,
          });

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

        console.log(`    Extracted text: ${paragraphs.length} paragraphs`);
      } finally {
        await textDb.destroy();
      }

      return `data/page_${this.catalogId}_${outputPageNumber}.db`;
    } catch (error) {
      console.error('Text extraction error:', error);
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
      // Convert PDF to PNG using pdf2pic
      const pngPath = path.join(outputPath, `${pagePrefix}.png`);
      let width = 0;
      let height = 0;

      // Configure pdf2pic
      const options = {
        density: 300,           // High quality
        saveFilename: pagePrefix,
        savePath: outputPath,
        format: 'png',
        width: 2400,           // Max width for high quality
        height: 3200,          // Max height for high quality
      };

      const convert = fromPath(pdfPath, options);

      // Convert first page (page 1)
      const result = await convert(1, { responseType: 'buffer' });

      if (result && result.buffer) {
        // Save PNG
        await fs.writeFile(pngPath, result.buffer);

        // Get dimensions and create JPG
        const image = sharp(result.buffer);
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
