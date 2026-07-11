/**
 * AI Service - Main Orchestrator
 * Routes flashcard generation requests to the appropriate AI provider
 * Supports: Google Gemini, OpenAI, Anthropic Claude
 */

const GeminiService = require('./geminiService');
const OpenAIService = require('./openaiService');
const AnthropicService = require('./anthropicService');

class AIService {
  constructor() {
    this.gemini = new GeminiService();
    this.openai = new OpenAIService();
    this.anthropic = new AnthropicService();
  }

  /**
   * Detect which AI provider to use based on model name
   * @param {string} modelName - The model identifier
   * @returns {string} Provider name: 'gemini', 'openai', or 'anthropic'
   */
  detectProvider(modelName) {
    if (OpenAIService.canHandle(modelName)) {
      return 'openai';
    } else if (AnthropicService.canHandle(modelName)) {
      return 'anthropic';
    } else {
      return 'gemini'; // Default to Gemini
    }
  }

  /**
   * Generate flashcards using the appropriate AI provider
   * @param {string} content - The text content to convert to flashcards
   * @param {number} cardCount - Number of flashcards to generate
   * @param {Object} aiConfig - AI configuration (customPrompt, model, apiKey)
   * @returns {Promise<Array>} Array of flashcard objects
   */
  async generateFlashcards(content, cardCount = 25, aiConfig = {}) {
    try {
      // Validate content is a string
      if (typeof content !== 'string') {
        console.error('❌ ERROR: content is not a string!');
        console.error('  Type:', typeof content);
        console.error('  Is Object?:', typeof content === 'object');
        console.error('  Constructor:', content?.constructor?.name);
        console.error('  Keys:', typeof content === 'object' ? Object.keys(content) : 'N/A');
        console.error('  Value preview:', JSON.stringify(content).substring(0, 200));
        console.error('  aiConfig:', aiConfig);
        throw new Error(`Invalid content type: expected string, got ${typeof content}. Check if you're passing the parsed object instead of the .text property.`);
      }

      if (!content || content.trim().length === 0) {
        throw new Error('Content is empty or whitespace only');
      }

      const { customPrompt, model: modelName, apiKey } = aiConfig;
      const selectedModel = modelName || 'gemini-2.5-flash';
      const provider = this.detectProvider(selectedModel);
      
      // 🔍 DEBUG LOG 5: In aiService.generateFlashcards before routing
      console.log('🔍 DEBUG LOG 5 - In aiService.generateFlashcards (before routing to provider):');
      console.log('  - content type:', typeof content);
      console.log('  - content is string?:', typeof content === 'string');
      console.log('  - content length:', content?.length || 0);
      console.log('  - content preview:', typeof content === 'string' ? content.substring(0, 150) : '[NOT A STRING]');
      console.log('  - provider:', provider);
      console.log('  - selectedModel:', selectedModel);
      console.log('  - cardCount:', cardCount);
      
      console.log(`🤖 AI Service: Routing to ${provider.toUpperCase()} for model ${selectedModel}`);
      
      // Route to appropriate provider
      let flashcards;
      if (provider === 'openai') {
        flashcards = await this.openai.generateFlashcards(
          content, 
          cardCount, 
          customPrompt, 
          selectedModel, 
          apiKey
        );
      } else if (provider === 'anthropic') {
        flashcards = await this.anthropic.generateFlashcards(
          content, 
          cardCount, 
          customPrompt, 
          selectedModel, 
          apiKey
        );
      } else {
        flashcards = await this.gemini.generateFlashcards(
          content, 
          cardCount, 
          customPrompt, 
          selectedModel, 
          apiKey
        );
      }
      
      // Validate results
      if (!Array.isArray(flashcards) || flashcards.length === 0) {
        throw new Error('No flashcards generated');
      }
      
      // Validate that flashcards are relevant to the input content
      this.validateFlashcardsRelevance(flashcards, content);
      
      return flashcards;
      
    } catch (error) {
      console.error('❌ AI Service Error:', error.message);
      throw new Error(`Failed to generate flashcards: ${error.message}`);
    }
  }

  /**
   * Process multiple chunks and generate flashcards for each
   * @param {Array} chunks - Array of chunk objects from ContentChunker
   * @param {Function} progressCallback - Optional callback for progress updates
   * @param {Object} aiConfig - AI configuration (customPrompt, model, apiKey, numCards)
   * @returns {Promise<Array>} Combined flashcards with section metadata
   */
  async processChunks(chunks, progressCallback = null, aiConfig = {}) {
    const allFlashcards = [];
    const contentChunker = require('./contentChunker');
    let apiKeyIssueDetected = false;
    
    console.log(`📚 Processing ${chunks.length} chunks with configuration:`, {
      model: aiConfig.model || 'gemini-2.5-flash',
      customPrompt: !!aiConfig.customPrompt,
      numCards: aiConfig.numCards || 'auto'
    });
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      try {
        // Calculate optimal flashcard count for this chunk
        let cardCount;
        if (aiConfig.numCards) {
          // User specified total cards - distribute evenly across chunks
          cardCount = Math.max(1, Math.floor(aiConfig.numCards / chunks.length));
        } else {
          // Auto-calculate based on chunk size
          cardCount = contentChunker.calculateFlashcardsPerChunk(chunk.text);
        }
        
        // Validate chunk has text property
        if (!chunk.text || typeof chunk.text !== 'string') {
          console.error(`❌ ERROR: chunk ${i + 1} has invalid text:`, {
            hasText: !!chunk.text,
            type: typeof chunk.text,
            chunk: chunk
          });
          throw new Error(`Chunk ${i + 1} has invalid text property`);
        }

        console.log(`📄 Processing chunk ${i + 1}/${chunks.length}: "${chunk.title}" (${chunk.text.length} chars, targeting ${cardCount} cards)`);
        
        // 🔍 DEBUG LOG 4: Before calling generateFlashcards
        console.log(`🔍 DEBUG LOG 4 - Before aiService.generateFlashcards (chunk ${i + 1}):` );
        console.log('  - chunk.text type:', typeof chunk.text);
        console.log('  - chunk.text is string?:', typeof chunk.text === 'string');
        console.log('  - chunk.text length:', chunk.text?.length || 0);
        console.log('  - chunk.text preview:', 
          typeof chunk.text === 'string' ? chunk.text.substring(0, 150) : '[NOT A STRING]');
        console.log('  - cardCount:', cardCount);
        console.log('  - aiConfig.model:', aiConfig.model);
        
        // Generate flashcards for this chunk
        const flashcards = await this.generateFlashcards(chunk.text, cardCount, aiConfig);
        
        // Add metadata to each flashcard
        const enrichedFlashcards = flashcards.map(card => ({
          ...card,
          section: chunk.title,
          chunkIndex: chunk.chunkIndex,
          sourcePages: chunk.estimatedPages
        }));
        
        allFlashcards.push(...enrichedFlashcards);
        
        console.log(`✅ Generated ${flashcards.length} flashcards for "${chunk.title}"`);
        
        // Call progress callback if provided
        if (progressCallback) {
          progressCallback({
            currentChunk: i + 1,
            totalChunks: chunks.length,
            flashcardsGenerated: allFlashcards.length,
            currentSection: chunk.title
          });
        }
        
        // Add delay to avoid rate limiting
        if (i < chunks.length - 1) {
          await this.delay(1000); // 1 second between chunks
        }
        
        // Clear chunk from memory
        chunk.text = null;
        chunks[i] = null;
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        } else if (i % 5 === 0) {
          // Hint at GC every 5 chunks
          const temp = new Array(1000).fill(null);
          temp.length = 0;
        }
        
      } catch (error) {
        console.error(`❌ Error processing chunk ${i + 1} ("${chunk.title}"):`, error.message);

        if (this.isApiKeyIssue(error.message)) {
          apiKeyIssueDetected = true;
        }

        // Continue with next chunk instead of failing completely
        console.log(`⏭️  Skipping chunk ${i + 1}, continuing with remaining chunks...`);

        if (progressCallback) {
          progressCallback({
            currentChunk: i + 1,
            totalChunks: chunks.length,
            flashcardsGenerated: allFlashcards.length,
            currentSection: chunk.title,
            error: `Failed: ${error.message}`
          });
        }
      }
    }
    
    console.log(`🎉 Total flashcards generated: ${allFlashcards.length} from ${chunks.length} chunks`);

    if (allFlashcards.length === 0 && apiKeyIssueDetected) {
      throw new Error('Gemini is no longer free to use. Please add your own Gemini API key to generate flashcards.');
    }

    return allFlashcards;
  }

  /**
   * Detect whether an AI provider error is caused by an invalid, leaked,
   * or rate/quota-limited API key rather than the input content itself.
   */
  isApiKeyIssue(errorMessage = '') {
    return /api key|leaked|forbidden|403|401|unauthorized|quota|rate.?limit|RESOURCE_EXHAUSTED|billing/i.test(errorMessage);
  }

  /**
   * Validate that generated flashcards are relevant to the input content
   */
  validateFlashcardsRelevance(flashcards, originalContent) {
    if (!flashcards || flashcards.length === 0) {
      return;
    }

    // Extract significant words from content
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who', 'where', 'when', 'why', 'how']);
    
    const contentWords = originalContent
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.has(word));
    
    const contentWordSet = new Set(contentWords);
    
    // Check flashcard relevance
    let relevantCards = 0;
    
    for (const card of flashcards) {
      const cardText = `${card.question} ${card.answer}`.toLowerCase();
      const cardWords = cardText
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3);
      
      const matchingWords = cardWords.filter(word => contentWordSet.has(word));
      
      if (matchingWords.length > 2) {
        relevantCards++;
      }
    }
    
    const relevanceRatio = relevantCards / flashcards.length;
    
    if (relevanceRatio < 0.5) {
      console.warn(`⚠️  Low relevance: Only ${Math.round(relevanceRatio * 100)}% of flashcards match the input content`);
    } else {
      console.log(`✅ Relevance check: ${Math.round(relevanceRatio * 100)}% relevant`);
    }
  }

  /**
   * Convert flashcards to CSV format
   */
  convertToCSV(flashcards) {
    const hasSections = flashcards.length > 0 && flashcards[0].section;
    
    const headers = hasSections ? 'Section,Question,Answer\n' : 'Question,Answer\n';
    const rows = flashcards.map(card => {
      const question = `"${card.question.replace(/"/g, '""')}"`;
      const answer = `"${card.answer.replace(/"/g, '""')}"`;
      
      if (hasSections) {
        const section = `"${(card.section || 'General').replace(/"/g, '""')}"`;
        return `${section},${question},${answer}`;
      }
      
      return `${question},${answer}`;
    }).join('\n');
    
    return headers + rows;
  }

  /**
   * Helper function to add delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get all available models from all providers
   */
  static getAllAvailableModels() {
    return [
      ...GeminiService.getAvailableModels(),
      ...OpenAIService.getAvailableModels(),
      ...AnthropicService.getAvailableModels()
    ];
  }
}

// Export singleton instance for backward compatibility
module.exports = new AIService();

