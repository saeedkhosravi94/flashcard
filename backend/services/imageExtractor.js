/**
 * Image Extractor Service
 * Extracts images from PDF documents and saves them for use in flashcards
 */

const fs = require('fs').promises;
const path = require('path');
const pdfImgConvert = require('pdf-img-convert');
const sharp = require('sharp');

class ImageExtractor {
  constructor() {
    // Directory to store extracted images
    this.imagesDir = path.join(__dirname, '../uploads/extracted-images');
    this.ensureImageDirectory();
  }

  /**
   * Ensure the images directory exists
   */
  async ensureImageDirectory() {
    try {
      await fs.mkdir(this.imagesDir, { recursive: true });
    } catch (error) {
      console.error('Error creating images directory:', error);
    }
  }

  /**
   * Extract images from a PDF file
   * @param {string} pdfPath - Path to the PDF file
   * @param {string} baseFileName - Base filename for saving extracted images
   * @returns {Promise<Array>} Array of image metadata objects
   */
  async extractImagesFromPDF(pdfPath, baseFileName) {
    try {
      console.log(`🖼️  Extracting images from PDF: ${pdfPath}`);
      
      // Convert PDF pages to images
      const pdfArray = await pdfImgConvert.convert(pdfPath, {
        width: 2000, // High resolution for better quality
        height: 2000,
        page_numbers: [], // Extract all pages
        base64: false
      });

      console.log(`📄 PDF has ${pdfArray.length} pages`);

      const extractedImages = [];
      const timestamp = Date.now();

      // Process each page
      for (let pageIndex = 0; pageIndex < pdfArray.length; pageIndex++) {
        const pageNum = pageIndex + 1;
        
        try {
          // Save the page image
          const imageFileName = `${baseFileName}_page${pageNum}_${timestamp}.png`;
          const imagePath = path.join(this.imagesDir, imageFileName);
          
          // Convert buffer to PNG using sharp for optimization
          await sharp(pdfArray[pageIndex])
            .png({ quality: 90, compressionLevel: 9 })
            .toFile(imagePath);

          // Get image dimensions
          const metadata = await sharp(imagePath).metadata();

          extractedImages.push({
            fileName: imageFileName,
            filePath: imagePath,
            relativePath: `/uploads/extracted-images/${imageFileName}`,
            pageNumber: pageNum,
            width: metadata.width,
            height: metadata.height,
            format: 'png',
            size: metadata.size
          });

          console.log(`✅ Extracted image from page ${pageNum}: ${imageFileName}`);
        } catch (error) {
          console.error(`❌ Error processing page ${pageNum}:`, error.message);
        }
      }

      console.log(`🎉 Successfully extracted ${extractedImages.length} images from PDF`);
      return extractedImages;

    } catch (error) {
      console.error('Error extracting images from PDF:', error);
      throw new Error(`Failed to extract images: ${error.message}`);
    }
  }

  /**
   * Detect and extract specific regions/figures from a page image
   * This is a placeholder for more advanced image segmentation
   * @param {string} imagePath - Path to the page image
   * @returns {Promise<Array>} Array of detected figure regions
   */
  async detectFiguresInImage(imagePath) {
    // This would require computer vision libraries like OpenCV
    // For now, we'll return the full page image
    // Future enhancement: Use image segmentation to detect individual figures
    return [{
      type: 'full-page',
      bounds: null
    }];
  }

  /**
   * Clean up old extracted images (older than 7 days)
   */
  async cleanupOldImages() {
    try {
      const files = await fs.readdir(this.imagesDir);
      const now = Date.now();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.imagesDir, file);
        const stats = await fs.stat(filePath);
        const age = now - stats.mtimeMs;

        if (age > maxAge) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        console.log(`🗑️  Cleaned up ${deletedCount} old extracted images`);
      }
    } catch (error) {
      console.error('Error cleaning up old images:', error);
    }
  }

  /**
   * Get all images for a specific document
   * @param {string} baseFileName - Base filename used during extraction
   * @returns {Promise<Array>} Array of image metadata
   */
  async getImagesForDocument(baseFileName) {
    try {
      const files = await fs.readdir(this.imagesDir);
      const documentImages = [];

      for (const file of files) {
        if (file.startsWith(baseFileName)) {
          const filePath = path.join(this.imagesDir, file);
          const stats = await fs.stat(filePath);
          
          // Extract page number from filename
          const pageMatch = file.match(/_page(\d+)_/);
          const pageNumber = pageMatch ? parseInt(pageMatch[1]) : null;

          documentImages.push({
            fileName: file,
            filePath: filePath,
            relativePath: `/uploads/extracted-images/${file}`,
            pageNumber: pageNumber,
            size: stats.size,
            createdAt: stats.birthtime
          });
        }
      }

      return documentImages.sort((a, b) => (a.pageNumber || 0) - (b.pageNumber || 0));
    } catch (error) {
      console.error('Error getting images for document:', error);
      return [];
    }
  }

  /**
   * Delete images for a specific document
   * @param {string} baseFileName - Base filename used during extraction
   */
  async deleteImagesForDocument(baseFileName) {
    try {
      const images = await this.getImagesForDocument(baseFileName);
      
      for (const image of images) {
        await fs.unlink(image.filePath);
      }

      console.log(`🗑️  Deleted ${images.length} images for document: ${baseFileName}`);
    } catch (error) {
      console.error('Error deleting images for document:', error);
    }
  }
}

module.exports = new ImageExtractor();

