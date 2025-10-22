const fs = require('fs').promises;
const pdf = require('pdf-parse');

class FileParser {
  async parseFile(filePath, mimeType) {
    try {
      const dataBuffer = await fs.readFile(filePath);
      
      if (!dataBuffer || dataBuffer.length === 0) {
        throw new Error('File is empty');
      }
      
      if (mimeType === 'application/pdf') {
        return await this.parsePDF(dataBuffer);
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

  async parsePDF(dataBuffer) {
    try {
      const options = {
        max: 0, // Process all pages
        version: 'v2.0.550'
      };
      
      const data = await pdf(dataBuffer, options);
      
      if (!data || !data.text) {
        throw new Error('No text could be extracted from the PDF');
      }
      
      // Clean up the text
      const cleanedText = data.text
        .replace(/\r\n/g, '\n') // Normalize line endings
        .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
        .trim();
      
      if (cleanedText.length === 0) {
        throw new Error('PDF appears to contain no readable text. It might be an image-based PDF.');
      }
      
      return {
        text: cleanedText,
        numPages: data.numpages,
        info: data.info
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
}

module.exports = new FileParser();

