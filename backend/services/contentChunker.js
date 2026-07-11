/**
 * Intelligent Content Chunker
 * Divides large documents into logical sections for better flashcard generation
 */

class ContentChunker {
  constructor() {
    // Configuration for chunking
    this.config = {
      minChunkSize: 5000,        // Minimum characters per chunk
      maxChunkSize: 40000,       // Maximum characters per chunk (modern AI can handle larger contexts)
      targetChunkSize: 25000,    // Target characters per chunk for optimal processing
      overlapSize: 1000,         // Overlap between chunks to maintain context
    };
  }

  /**
   * Main method to chunk content intelligently
   * @param {string} text - The full text content to chunk
   * @param {number} numPages - Number of pages in the document (if available)
   * @returns {Array} Array of chunk objects with text and metadata
   */
  chunkContent(text, numPages = null) {
    // Validate input is a string
    if (typeof text !== 'string') {
      console.error('❌ ContentChunker ERROR: text parameter is not a string!');
      console.error('  Type:', typeof text);
      console.error('  Value:', text);
      console.error('  Constructor:', text?.constructor?.name);
      if (typeof text === 'object' && text !== null) {
        console.error('  Keys:', Object.keys(text));
        console.error('  Has .text property?:', !!text.text);
        console.error('  text.text type:', typeof text.text);
      }
      throw new Error(`ContentChunker expects string input, got ${typeof text}. Check if you're passing the parsed object instead of .text property.`);
    }
    
    console.log(`Starting intelligent chunking for ${text.length} characters, ${numPages || 'unknown'} pages`);
    
    // For very small documents, return as single chunk
    if (text.length < this.config.minChunkSize * 2) {
      return [{
        text: text,
        chunkIndex: 0,
        totalChunks: 1,
        startChar: 0,
        endChar: text.length,
        title: 'Complete Document'
      }];
    }

    // Try to detect natural section boundaries
    const chunks = this.detectAndSplitSections(text);
    
    // If sections are too large, split them further
    const refinedChunks = this.refineChunks(chunks);
    
    // Add metadata to chunks
    return refinedChunks.map((chunk, index) => ({
      text: chunk.text,
      chunkIndex: index,
      totalChunks: refinedChunks.length,
      startChar: chunk.startChar,
      endChar: chunk.endChar,
      title: chunk.title || `Section ${index + 1}`,
      estimatedPages: numPages ? Math.ceil((chunk.text.length / text.length) * numPages) : null
    }));
  }

  /**
   * Detect natural section boundaries in the text
   */
  detectAndSplitSections(text) {
    const sections = [];
    
    // Common section markers (case-insensitive)
    const sectionPatterns = [
      /^Chapter\s+\d+/im,
      /^CHAPTER\s+\d+/m,
      /^Section\s+\d+/im,
      /^Part\s+\d+/im,
      /^Unit\s+\d+/im,
      /^\d+\.\s+[A-Z]/m,           // "1. Title" format
      /^#{1,3}\s+.+$/m,             // Markdown headers
      /^[A-Z][A-Z\s]{3,}$/m,        // ALL CAPS HEADINGS
    ];

    // Split by double newlines to get paragraphs
    const lines = text.split('\n');
    let currentSection = {
      text: '',
      startChar: 0,
      endChar: 0,
      title: null
    };
    
    let charPosition = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineLength = line.length + 1; // +1 for newline
      
      // Check if this line is a section boundary
      let isSectionStart = false;
      let sectionTitle = null;
      
      for (const pattern of sectionPatterns) {
        if (pattern.test(line)) {
          isSectionStart = true;
          sectionTitle = line.trim().substring(0, 100); // Limit title length
          break;
        }
      }
      
      // If we found a new section and current section has content, save it
      if (isSectionStart && currentSection.text.length > this.config.minChunkSize) {
        currentSection.endChar = charPosition;
        sections.push({ ...currentSection });
        
        // Start new section
        currentSection = {
          text: line + '\n',
          startChar: charPosition,
          endChar: 0,
          title: sectionTitle
        };
      } else {
        // Add to current section
        currentSection.text += line + '\n';
      }
      
      charPosition += lineLength;
    }
    
    // Add the last section
    if (currentSection.text.length > 0) {
      currentSection.endChar = charPosition;
      sections.push(currentSection);
    }
    
    // If no sections were detected, use size-based chunking
    if (sections.length <= 1) {
      console.log('No clear sections detected, using size-based chunking');
      return this.chunkBySize(text);
    }
    
    console.log(`Detected ${sections.length} natural sections`);
    return sections;
  }

  /**
   * Refine chunks that are too large or too small
   */
  refineChunks(chunks) {
    const refined = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // If chunk is within acceptable size, keep it
      if (chunk.text.length >= this.config.minChunkSize && 
          chunk.text.length <= this.config.maxChunkSize) {
        refined.push(chunk);
      } 
      // If chunk is too large, split it
      else if (chunk.text.length > this.config.maxChunkSize) {
        const subChunks = this.splitLargeChunk(chunk);
        refined.push(...subChunks);
      }
      // If chunk is too small, merge with next or previous
      else if (chunk.text.length < this.config.minChunkSize) {
        // Try to merge with next chunk
        if (i < chunks.length - 1 && 
            chunk.text.length + chunks[i + 1].text.length <= this.config.maxChunkSize) {
          chunks[i + 1].text = chunk.text + chunks[i + 1].text;
          chunks[i + 1].startChar = chunk.startChar;
          chunks[i + 1].title = chunk.title || chunks[i + 1].title;
        } 
        // Otherwise, just keep it (better than losing content)
        else {
          refined.push(chunk);
        }
      }
    }
    
    return refined;
  }

  /**
   * Split a large chunk into smaller pieces
   */
  splitLargeChunk(chunk) {
    const subChunks = [];
    const text = chunk.text;
    const targetSize = this.config.targetChunkSize;
    
    let start = 0;
    let partIndex = 1;
    
    while (start < text.length) {
      let end = start + targetSize;
      
      // If this isn't the last chunk, try to find a good break point
      if (end < text.length) {
        // Look for paragraph break
        const nextParagraph = text.indexOf('\n\n', end);
        const prevParagraph = text.lastIndexOf('\n\n', end);
        
        if (prevParagraph > start && prevParagraph - start > this.config.minChunkSize) {
          end = prevParagraph + 2;
        } else if (nextParagraph !== -1 && nextParagraph - start < this.config.maxChunkSize) {
          end = nextParagraph + 2;
        } else {
          // Look for sentence break
          const sentenceBreak = text.lastIndexOf('. ', end);
          if (sentenceBreak > start) {
            end = sentenceBreak + 2;
          }
        }
      } else {
        end = text.length;
      }
      
      const subChunkText = text.substring(start, end);
      const title = chunk.title 
        ? `${chunk.title} (Part ${partIndex})`
        : `Part ${partIndex}`;
      
      subChunks.push({
        text: subChunkText,
        startChar: chunk.startChar + start,
        endChar: chunk.startChar + end,
        title: title
      });
      
      // Move to next chunk with overlap for context continuity
      const nextStart = end - this.config.overlapSize;
      
      // Prevent infinite loop: ensure we always make progress
      if (nextStart <= start) {
        start = end; // Jump to end without overlap
      } else {
        start = nextStart;
      }
      
      // Safety break
      if (start >= text.length || partIndex > 100) {
        break;
      }
      
      partIndex++;
    }
    
    return subChunks;
  }

  /**
   * Fallback: chunk by size when no structure is detected
   */
  chunkBySize(text) {
    const chunks = [];
    const targetSize = this.config.targetChunkSize;
    
    let start = 0;
    let chunkIndex = 1;
    
    while (start < text.length) {
      let end = Math.min(start + targetSize, text.length);
      
      // Try to break at paragraph
      if (end < text.length) {
        const paragraphBreak = text.lastIndexOf('\n\n', end);
        if (paragraphBreak > start && paragraphBreak - start > this.config.minChunkSize) {
          end = paragraphBreak + 2;
        }
      }
      
      const chunkText = text.substring(start, end);
      
      chunks.push({
        text: chunkText,
        startChar: start,
        endChar: end,
        title: `Chunk ${chunkIndex}`
      });
      
      // Move to next chunk - ensure we always progress forward
      const nextStart = end - this.config.overlapSize;
      
      // Prevent infinite loop: if we're not making progress, jump forward
      if (nextStart <= start) {
        start = start + Math.max(1000, this.config.minChunkSize);
      } else {
        start = nextStart;
      }
      
      // If we're at the end, break to prevent infinite loop
      if (start >= text.length) {
        break;
      }
      
      chunkIndex++;
    }
    
    console.log(`Document split into ${chunks.length} intelligent chunks`);
    return chunks;
  }

  /**
   * Calculate optimal number of flashcards per chunk
   */
  calculateFlashcardsPerChunk(chunkText) {
    const charCount = chunkText.length;
    
    // Base: ~1 flashcard per 200-300 characters
    // Min: 10 flashcards
    // Max: 50 flashcards per chunk
    const baseCount = Math.ceil(charCount / 250);
    
    return Math.max(10, Math.min(50, baseCount));
  }
}

module.exports = new ContentChunker();

