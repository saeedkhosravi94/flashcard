const fs = require('fs').promises;
const pdf = require('pdf-parse');
const path = require('path');
const imageExtractor = require('./imageExtractor');
const ankiParserService = require('./ankiParserService');

class FileParser {
  async parseFile(filePath, mimeType, pageRange = null, extractImages = true) {
    try {
      // Check if it's an Anki .apkg file
      const ext = path.extname(filePath).toLowerCase();
      if (ext === '.apkg' || mimeType === 'application/zip' || mimeType === 'application/x-zip-compressed') {
        // Double-check by looking at the file extension
        if (ext === '.apkg' || path.basename(filePath).toLowerCase().endsWith('.apkg')) {
          return await ankiParserService.parseApkg(filePath);
        }
      }

      const dataBuffer = await fs.readFile(filePath);
      
      if (!dataBuffer || dataBuffer.length === 0) {
        throw new Error('File is empty');
      }
      
      if (mimeType === 'application/pdf') {
        return await this.parsePDF(dataBuffer, pageRange, filePath, extractImages);
      } else if (mimeType === 'text/csv' || mimeType === 'application/csv') {
        return this.parseCSV(dataBuffer);
      } else if (mimeType === 'text/plain' || mimeType.includes('text')) {
        return this.parseText(dataBuffer);
      } else {
        // For other text-based formats, try to read as text
        return this.parseText(dataBuffer);
      }
    } catch (error) {
      console.error('Error parsing file:', error);
      throw new Error('Failed to parse file: ' + error.message);
    }
  }

  async parsePDF(dataBuffer, pageRange = null, filePath = null, extractImages = true) {
    try {
      // Remove custom pagerender - it was causing [object Object] issue
      // pdf-parse handles text extraction properly by default
      const options = {
        max: 0, // Process all pages
        version: 'v2.0.550'
      };
      
      const data = await pdf(dataBuffer, options);
      
      if (!data || !data.text) {
        throw new Error('No text could be extracted from the PDF');
      }
      
      let extractedText = data.text;
      
      // If page range is specified, extract only those pages
      if (pageRange && pageRange.from && pageRange.to) {
        console.log(`📄 Extracting pages ${pageRange.from}-${pageRange.to} from ${data.numpages} total pages`);
        extractedText = await this.extractPageRange(dataBuffer, pageRange.from, pageRange.to);
      }
      
      // Clean up the text
      const cleanedText = extractedText
        .replace(/\r\n/g, '\n') // Normalize line endings
        .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
        .trim();
      
      if (cleanedText.length === 0) {
        throw new Error('PDF appears to contain no readable text. It might be an image-based PDF.');
      }
      
      // Extract images if requested and filePath is provided
      let extractedImages = [];
      if (extractImages && filePath) {
        try {
          const baseFileName = path.basename(filePath, path.extname(filePath));
          console.log(`🖼️  Extracting images from PDF: ${baseFileName}`);
          extractedImages = await imageExtractor.extractImagesFromPDF(filePath, baseFileName);
          console.log(`✅ Extracted ${extractedImages.length} images from PDF`);
        } catch (imageError) {
          console.error('⚠️  Image extraction failed:', imageError.message);
          console.log('📄 Continuing with text-only processing...');
          // Continue without images - don't fail the entire parsing
        }
      }
      
      return {
        text: cleanedText,
        numPages: data.numpages,
        extractedPages: pageRange ? `${pageRange.from}-${pageRange.to}` : 'all',
        info: data.info,
        images: extractedImages
      };
    } catch (error) {
      if (error.message.includes('Invalid PDF')) {
        throw new Error('Invalid or corrupted PDF file');
      } else if (error.message.includes('encrypted')) {
        throw new Error('PDF is password-protected or encrypted');
      }
      throw new Error('Failed to parse PDF: ' + error.message);
    }
  }

  async extractPageRange(dataBuffer, fromPage, toPage) {
    try {
      // Validate page range
      if (fromPage < 1 || toPage < fromPage) {
        throw new Error('Invalid page range');
      }
      
      if (toPage - fromPage + 1 > 50) {
        throw new Error('Page range cannot exceed 50 pages');
      }
      
      // Use custom page renderer to extract specific pages
      const pageTexts = [];
      
      const options = {
        max: toPage,
        pagerender: async function(pageData) {
          const pageNum = pageData.pageIndex + 1; // pageIndex is 0-based
          
          if (pageNum >= fromPage && pageNum <= toPage) {
            const textContent = await pageData.getTextContent();
            let pageText = '';
            
            textContent.items.forEach(function(item) {
              pageText += item.str;
              if (item.hasEOL) {
                pageText += '\n';
              } else {
                pageText += ' ';
              }
            });
            
            pageTexts.push(pageText.trim());
          }
          
          // Return empty string - we're collecting in pageTexts array
          return '';
        }
      };
      
      // Parse PDF with custom renderer
      await pdf(dataBuffer, options);
      
      if (pageTexts.length === 0) {
        throw new Error('No text could be extracted from the specified page range');
      }
      
      return pageTexts.join('\n\n');
    } catch (error) {
      console.error('Page range extraction error:', error);
      throw new Error('Failed to extract page range: ' + error.message);
    }
  }

  parseText(dataBuffer) {
    try {
      // Try UTF-8 first
      let text = dataBuffer.toString('utf-8');
      
      // Check if the text contains too many invalid characters (possible encoding issue)
      const invalidChars = text.match(/�/g);
      if (invalidChars && invalidChars.length > text.length * 0.1) {
        // Try alternative encoding
        text = dataBuffer.toString('latin1');
      }
      
      // Clean up the text
      text = text
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      
      if (text.length === 0) {
        throw new Error('Text file is empty');
      }
      
      return {
        text: text,
        numPages: null,
        info: null
      };
    } catch (error) {
      throw new Error('Failed to parse text file: ' + error.message);
    }
  }

  parseCSV(dataBuffer) {
    try {
      // Try UTF-8 first
      let text = dataBuffer.toString('utf-8');
      
      // Check if the text contains too many invalid characters (possible encoding issue)
      const invalidChars = text.match(/�/g);
      if (invalidChars && invalidChars.length > text.length * 0.1) {
        // Try alternative encoding
        text = dataBuffer.toString('latin1');
      }
      
      // Clean up and split into lines
      const lines = text
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .trim()
        .split('\n')
        .filter(line => line.trim().length > 0);
      
      if (lines.length === 0) {
        throw new Error('CSV file is empty');
      }

      // Parse CSV lines
      const flashcards = [];
      
      // Skip header row if it looks like a header
      const startIndex = this.isHeaderRow(lines[0]) ? 1 : 0;
      
      for (let i = startIndex; i < lines.length; i++) {
        const columns = this.parseCSVLine(lines[i]);
        
        if (columns.length >= 2) {
          // First column is question, rest are combined for answer
          const question = columns[0].trim();
          const answer = columns.slice(1).join(' | ').trim();
          
          if (question && answer) {
            flashcards.push({
              question,
              answer,
              section: 'CSV Import',
              difficulty: 'medium'
            });
          }
        }
      }
      
      if (flashcards.length === 0) {
        throw new Error('No valid flashcard data found in CSV. Each row should have at least 2 columns.');
      }
      
      return {
        flashcards: flashcards,
        isCSV: true
      };
    } catch (error) {
      throw new Error('Failed to parse CSV file: ' + error.message);
    }
  }

  isHeaderRow(line) {
    const lower = line.toLowerCase();
    return lower.includes('question') || lower.includes('front') || 
           lower.includes('term') || lower.includes('prompt');
  }

  parseCSVLine(line) {
    const columns = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        columns.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add the last column
    columns.push(current);
    
    // Clean up columns (remove quotes, trim)
    return columns.map(col => col.replace(/^["']|["']$/g, '').trim());
  }
}

module.exports = new FileParser();

