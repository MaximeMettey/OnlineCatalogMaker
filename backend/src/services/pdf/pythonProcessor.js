import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import db, { initTextDb, getTextDb } from '../../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class PythonPDFProcessor {
  constructor(catalogId, filePath, uploadDir) {
    this.catalogId = catalogId;
    this.filePath = filePath;
    this.uploadDir = uploadDir;
    this.outputDir = path.join(uploadDir, 'catalogs', catalogId.toString());
    this.pythonScript = path.join(__dirname, '../../../python/pdf_processor.py');
  }

  async callPython(command, args = []) {
    return new Promise((resolve, reject) => {
      const pythonArgs = [this.pythonScript, command, ...args];
      const python = spawn('python3', pythonArgs);

      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      python.stderr.on('data', (data) => {
        stderr += data.toString();
        // Log stderr for debugging
        if (stderr.trim()) {
          console.log(stderr.trim());
        }
      });

      python.on('close', (code) => {
        // Always try to parse stdout first (errors are now in JSON on stdout)
        try {
          const result = JSON.parse(stdout);
          if (result.success === false) {
            reject(new Error(result.error || 'Python script failed'));
          } else if (code !== 0) {
            // Exit code is non-zero but result shows success (shouldn't happen)
            reject(new Error(`Python script exited with code ${code}: ${stderr || 'No error message'}`));
          } else {
            resolve(result);
          }
        } catch (err) {
          // Failed to parse JSON
          if (code !== 0) {
            // Non-zero exit code and no valid JSON
            reject(new Error(`Python script failed with code ${code}:\nstderr: ${stderr}\nstdout: ${stdout}\nParse error: ${err.message}`));
          } else {
            reject(new Error(`Failed to parse Python output: ${err.message}\nOutput: ${stdout}`));
          }
        }
      });

      python.on('error', (err) => {
        reject(new Error(`Failed to spawn Python process: ${err.message}`));
      });
    });
  }

  async process() {
    try {
      console.log(`Starting PDF processing for catalog ${this.catalogId}`);

      // Create output directory
      await fs.mkdir(this.outputDir, { recursive: true });
      await fs.mkdir(path.join(this.outputDir, 'pages'), { recursive: true });

      // 1. Analyze pages for double page detection
      console.log('Analyzing PDF pages...');
      const analyzeResult = await this.callPython('analyze', [this.filePath, this.outputDir]);
      const pageStructure = analyzeResult.page_structure;

      const totalOutputPages = pageStructure.reduce((sum, p) => sum + (p.is_double_page ? 2 : 1), 0);
      console.log(`PDF has ${pageStructure.length} source pages`);
      console.log(`Detected ${totalOutputPages} output pages (${pageStructure.filter(p => p.is_double_page).length} double pages will be split)`);

      // Update catalog with page count
      await db('catalogs').where({ id: this.catalogId }).update({
        total_pages: totalOutputPages,
        status: 'processing',
      });

      // 2. Process each page
      let outputPageNumber = 1;
      for (let i = 0; i < pageStructure.length; i++) {
        const pageInfo = pageStructure[i];
        console.log(`Processing source page ${i + 1}/${pageStructure.length} (output page ${outputPageNumber})`);

        try {
          if (pageInfo.is_double_page) {
            // Split into two pages
            console.log(`  Splitting double page into pages ${outputPageNumber} and ${outputPageNumber + 1}`);
            await this.processDoublePage(i, outputPageNumber);
            outputPageNumber += 2;
          } else {
            // Process as single page
            await this.processSinglePage(i, outputPageNumber);
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

  async processSinglePage(pageIndex, outputPageNumber) {
    // Call Python to process single page
    const result = await this.callPython('process_page', [
      this.filePath,
      this.outputDir,
      pageIndex.toString(),
      outputPageNumber.toString()
    ]);

    const pageData = result.result;

    // Save text data to SQLite
    await this.saveTextData(outputPageNumber, pageData.text_data);

    // Create page record in database
    const [pageId] = await db('pages').insert({
      catalog_id: this.catalogId,
      page_number: outputPageNumber,
      pdf_path: pageData.pdf_path,
      png_path: pageData.png_path,
      jpg_path: pageData.jpg_path,
      svg_path: null,
      text_db_path: `data/page_${this.catalogId}_${outputPageNumber}.db`,
      width: pageData.width,
      height: pageData.height,
    });

    console.log(`Page ${outputPageNumber} processed successfully (ID: ${pageId})`);
    return pageId;
  }

  async processDoublePage(pageIndex, startPageNumber) {
    // Call Python to process double page
    const result = await this.callPython('process_double_page', [
      this.filePath,
      this.outputDir,
      pageIndex.toString(),
      startPageNumber.toString()
    ]);

    const results = result.results;

    // Process both pages (left and right)
    for (let i = 0; i < results.length; i++) {
      const pageData = results[i];
      const outputPageNumber = startPageNumber + i;

      // Save text data to SQLite
      await this.saveTextData(outputPageNumber, pageData.text_data);

      // Create page record in database
      await db('pages').insert({
        catalog_id: this.catalogId,
        page_number: outputPageNumber,
        pdf_path: pageData.pdf_path,
        png_path: pageData.png_path,
        jpg_path: pageData.jpg_path,
        svg_path: null,
        text_db_path: `data/page_${this.catalogId}_${outputPageNumber}.db`,
        width: pageData.width,
        height: pageData.height,
      });
    }
  }

  async saveTextData(pageNumber, textData) {
    // Initialize text database for this page
    await initTextDb(this.catalogId, pageNumber);
    const textDb = getTextDb(this.catalogId, pageNumber);

    try {
      // Insert paragraphs
      for (const para of textData.paragraphs) {
        const [paraId] = await textDb('paragraphs').insert({
          text: para.text,
          x: para.x,
          y: para.y,
          width: para.width,
          height: para.height,
          word_count: para.word_count,
        });

        // Find words that belong to this paragraph (approximate by position)
        const paraWords = textData.words.filter(w =>
          w.x >= para.x && w.x <= para.x + para.width &&
          w.y >= para.y && w.y <= para.y + para.height
        );

        // Insert words
        for (const word of paraWords) {
          await textDb('words').insert({
            text: word.text,
            x: word.x,
            y: word.y,
            width: word.width,
            height: word.height,
            font_name: word.font_name,
            font_size: word.font_size,
            paragraph_id: paraId,
          });
        }
      }

      console.log(`  Extracted text: ${textData.paragraphs.length} paragraphs, ${textData.words.length} words`);
    } finally {
      await textDb.destroy();
    }
  }
}

export default PythonPDFProcessor;
