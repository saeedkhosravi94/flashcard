/**
 * Background Processor for Large File Uploads
 * Handles async processing of file uploads with progress tracking
 */

const FlashcardSet = require('../models/FlashcardSet');
const aiService = require('./aiService');
const imageAssociator = require('./imageAssociator');
const { logActivity } = require('../utils/activityLogger');
const fs = require('fs').promises;

class BackgroundProcessor {
  constructor() {
    // Track ongoing processing jobs
    this.activeJobs = new Map();
  }

  /**
   * Process chunks in the background with progress updates
   */
  async processFlashcardGeneration(flashcardSetId, chunks, aiConfig, userId, fileName, filePath, extractedImages = []) {
    console.log(`🚀 Starting background processing for deck: ${flashcardSetId}`);
    console.log(`   Total chunks to process: ${chunks.length}`);
    
    // Mark job as active
    this.activeJobs.set(flashcardSetId.toString(), {
      status: 'processing',
      started: new Date(),
      current: 0,
      total: chunks.length
    });

    try {
      // Process chunks with progress tracking
      const progressCallback = async (progress) => {
        const message = `Processing ${progress.currentSection}`;
        console.log(`📊 Progress: ${progress.currentChunk}/${progress.totalChunks} - ${message} - Total cards: ${progress.flashcardsGenerated}`);
        
        // Update database with progress
        try {
          await FlashcardSet.findByIdAndUpdate(flashcardSetId, {
            'processingProgress.current': progress.currentChunk,
            'processingProgress.total': progress.totalChunks,
            'processingProgress.message': message
          });
          
          // Update active job tracking
          const jobKey = flashcardSetId.toString();
          if (this.activeJobs.has(jobKey)) {
            this.activeJobs.get(jobKey).current = progress.currentChunk;
          }
        } catch (updateError) {
          console.error('Error updating progress:', updateError);
        }

        if (progress.error) {
          console.error(`⚠️  Chunk error: ${progress.error}`);
        }
      };

      // Generate flashcards
      let flashcards = await aiService.processChunks(chunks, progressCallback, aiConfig);

      if (!flashcards || flashcards.length === 0) {
        throw new Error('No flashcards were generated from the content');
      }

      console.log(`✅ Generated ${flashcards.length} flashcards from ${chunks.length} sections`);

      // Associate images with flashcards if images were extracted
      if (extractedImages && extractedImages.length > 0) {
        console.log(`🖼️  Associating ${extractedImages.length} extracted images with flashcards...`);
        flashcards = imageAssociator.associateImagesWithCards(flashcards, extractedImages, chunks);
        const stats = imageAssociator.getAssociationStats(flashcards);
        console.log(`📊 Image Association Stats:`, stats);
      }

      // Convert to CSV
      const csvData = aiService.convertToCSV(flashcards);

      // Update flashcard set with completed data
      const updatedSet = await FlashcardSet.findByIdAndUpdate(
        flashcardSetId,
        {
          cards: flashcards,
          csvData: csvData,
          processingStatus: 'completed',
          'processingProgress.current': chunks.length,
          'processingProgress.total': chunks.length,
          'processingProgress.message': 'Completed successfully'
        },
        { new: true }
      );

      console.log(`✅ Flashcard set completed: ${updatedSet.title} with ${flashcards.length} cards`);

      // Log activity
      if (userId) {
        await logActivity(userId, 'upload_file', {
          deckId: flashcardSetId,
          title: updatedSet.title,
          fileName: fileName,
          cardCount: flashcards.length
        }, {});
      }

      // Clean up uploaded file
      try {
        await fs.unlink(filePath);
      } catch (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError);
      }

      // Remove from active jobs
      this.activeJobs.delete(flashcardSetId.toString());

      return { success: true, cardCount: flashcards.length };

    } catch (error) {
      console.error(`❌ Background processing error for ${flashcardSetId}:`, error);

      // Update status to failed
      try {
        await FlashcardSet.findByIdAndUpdate(flashcardSetId, {
          processingStatus: 'failed',
          processingError: error.message || 'Unknown error occurred',
          'processingProgress.message': `Failed: ${error.message}`
        });
      } catch (updateError) {
        console.error('Error updating failure status:', updateError);
      }

      // Clean up uploaded file
      try {
        await fs.unlink(filePath);
      } catch (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError);
      }

      // Remove from active jobs
      this.activeJobs.delete(flashcardSetId.toString());

      return { success: false, error: error.message };
    }
  }

  /**
   * Get status of a processing job
   */
  getJobStatus(flashcardSetId) {
    return this.activeJobs.get(flashcardSetId.toString()) || null;
  }

  /**
   * Check if a user has any active jobs
   */
  hasActiveJobs(userId) {
    // This would require tracking userId with jobs - for now return false
    // In a production system, you'd store userId with each job
    return false;
  }
}

// Export singleton instance
module.exports = new BackgroundProcessor();

