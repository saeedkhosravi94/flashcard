/**
 * OpenAI Service
 * Handles flashcard generation using OpenAI's GPT models
 * Following official OpenAI Node.js SDK best practices
 */

const OpenAI = require('openai');
const { buildPrompt } = require('./prompts');

class OpenAIService {
  constructor() {
    this.defaultModel = 'gpt-4o-mini';
  }

  /**
   * Generate flashcards using OpenAI API
   * @param {string} content - The text content to convert to flashcards
   * @param {number} cardCount - Number of flashcards to generate
   * @param {string} customPrompt - Optional custom prompt
   * @param {string} modelName - OpenAI model to use
   * @param {string} apiKey - Optional API key (required for OpenAI)
   * @returns {Promise<Array>} Array of flashcard objects
   */
  async generateFlashcards(content, cardCount = 25, customPrompt = null, modelName = 'gpt-4o-mini', apiKey = null) {
    try {
      // Validate content is a string BEFORE using it in prompt
      if (typeof content !== 'string') {
        console.error('❌ OPENAI ERROR: content parameter is not a string!');
        console.error('  Type:', typeof content);
        console.error('  Value:', content);
        console.error('  Constructor:', content?.constructor?.name);
        if (typeof content === 'object' && content !== null) {
          console.error('  Object keys:', Object.keys(content));
          console.error('  Has .text property?:', !!content.text);
          // Try to extract text property if available
          if (content.text && typeof content.text === 'string') {
            console.log('  ✅ Found .text property, using that instead');
            content = content.text;
          } else {
            throw new Error(`Content must be a string, got ${typeof content}. Object keys: ${Object.keys(content).join(', ')}`);
          }
        } else {
          throw new Error(`Content must be a string, got ${typeof content}`);
        }
      }
      
      if (!content || content.trim().length === 0) {
        throw new Error('Content is empty');
      }
      
      console.log(`📄 Content preview (first 100 chars): "${content.substring(0, 100)}..."`);
      
      // Initialize OpenAI client with API key
      const openai = new OpenAI({
        apiKey: apiKey || process.env.OPENAI_API_KEY,
        timeout: 60000,     // 60 seconds timeout
        maxRetries: 2       // Automatic retries on failure
      });

      // Determine if we have actual content or just generating from instructions
      const hasContent = content && content.trim().length > 20 && 
                        !content.includes('Generate flashcards based on the user instructions');
      
      // Build prompt: user instruction + fixed format + fixed morality
      const basePrompt = buildPrompt(customPrompt, cardCount, hasContent);
      
      let prompt;
      if (hasContent) {
        // Check if this is context-based generation (has existing cards) or content extraction
        const isContextGeneration = content.includes('EXISTING CARD QUESTIONS') || 
                                   content.includes('EXISTING CARDS IN THIS DECK') || 
                                   content.includes('Existing Card') ||
                                   (content.includes('TASK: Generate') && content.includes('existing cards'));
        
        if (isContextGeneration) {
          // Context-based generation mode (using existing cards as reference)
          prompt = basePrompt + 
                  `\n\n${content}\n\nGenerate the new flashcard based on the context and instructions above. Return a JSON object with a "flashcards" array containing one flashcard object.`;
        } else {
          // Content extraction mode
          prompt = basePrompt + 
                  `\n\n=== BEGIN CONTENT ===\n${content}\n=== END CONTENT ===\n\nGenerate ${cardCount} flashcards ONLY from the content above. Return a JSON object with a "flashcards" array.`;
        }
      } else {
        // Generation from instructions mode
        prompt = basePrompt + 
                `\n\nGenerate ${cardCount} flashcards based on the instructions provided above. Create original, educational content following the specified format. Return a JSON object with a "flashcards" array.`;
      }
      
      console.log(`🟢 OpenAI: Generating ${cardCount} flashcards with model ${modelName}`);

      // Use chat completions API with structured output
      const completion = await openai.chat.completions.create({
        model: modelName,
        messages: [
          {
            role: "system",
            content: "You are a professional educational content designer. Your task is to generate flashcards from provided content. Always respond with a JSON object containing a 'flashcards' array, where each flashcard has 'question' and 'answer' fields."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4096,
        response_format: { type: "json_object" }, // Enforce JSON mode
        seed: 42 // For reproducibility
      });

      // Extract and parse the response
      const responseText = completion.choices[0].message.content;
      const parsed = JSON.parse(responseText);
      
      // Handle different response formats
      let flashcards;
      if (Array.isArray(parsed)) {
        flashcards = parsed;
      } else if (parsed.flashcards && Array.isArray(parsed.flashcards)) {
        flashcards = parsed.flashcards;
      } else if (parsed.cards && Array.isArray(parsed.cards)) {
        flashcards = parsed.cards;
      } else {
        console.warn('⚠️  Unexpected OpenAI response format:', Object.keys(parsed));
        throw new Error('Invalid response format from OpenAI');
      }
      
      if (!Array.isArray(flashcards)) {
        throw new Error('Invalid response format from OpenAI - expected array');
      }
      
      // Normalize field names to ensure 'question' and 'answer' exist
      flashcards = flashcards.map((card, index) => {
        // Handle different possible field names
        let question = card.question || card.Question || card.q || card.Q || card.front || card.Front || '';
        let answer = card.answer || card.Answer || card.a || card.A || card.back || card.Back || '';
        
        // Validate that question and answer are strings, not objects
        if (typeof question !== 'string') {
          console.error(`❌ Card ${index + 1} has non-string question:`, {
            type: typeof question,
            value: question
          });
          // Try to extract text if it's an object with a text property
          if (question && typeof question === 'object' && question.text) {
            question = question.text;
          } else {
            question = JSON.stringify(question);
          }
        }
        
        if (typeof answer !== 'string') {
          console.error(`❌ Card ${index + 1} has non-string answer:`, {
            type: typeof answer,
            value: answer
          });
          // Try to extract text if it's an object with a text property
          if (answer && typeof answer === 'object' && answer.text) {
            answer = answer.text;
          } else {
            answer = JSON.stringify(answer);
          }
        }
        
        return {
          question: String(question).trim(),
          answer: String(answer).trim()
        };
      });
      
      // Filter out any cards that still don't have both fields
      flashcards = flashcards.filter(card => card.question && card.answer);
      
      if (flashcards.length === 0) {
        throw new Error('No valid flashcards generated - all cards were missing question or answer fields');
      }
      
      console.log(`✅ OpenAI: Successfully generated ${flashcards.length} flashcards`);
      return flashcards;
      
    } catch (error) {
      // Enhanced error handling
      if (error.message && error.message.includes('API key')) {
        console.error('❌ OpenAI API Key Error:', error.message);
        throw new Error('Invalid or missing OpenAI API key. Please provide a valid API key.');
      } else if (error.message && error.message.includes('Connection')) {
        console.error('❌ OpenAI Connection Error:', error.message);
        throw new Error('Failed to connect to OpenAI API. Please check your API key or try again later.');
      } else if (error.response) {
        // API error
        console.error('❌ OpenAI API Error:', error.response.status, error.response.data);
        throw new Error(`OpenAI API Error: ${error.response.data.error?.message || error.message}`);
      } else if (error.request) {
        // Network error
        console.error('❌ OpenAI Network Error:', error.message);
        throw new Error('Failed to connect to OpenAI API. Please check your internet connection or API key.');
      } else {
        // Other errors
        console.error('❌ OpenAI Error:', error.message);
        throw new Error(`OpenAI Error: ${error.message}. Make sure you provided a valid API key.`);
      }
    }
  }

  /**
   * Check if this service can handle the given model
   * @param {string} modelName - The model identifier
   * @returns {boolean} True if this is an OpenAI model
   */
  static canHandle(modelName) {
    return modelName && modelName.startsWith('gpt-');
  }

  /**
   * Get available OpenAI models
   * @returns {Array} List of available models
   */
  static getAvailableModels() {
    return [
      { id: 'gpt-4o', name: 'GPT-4o', free: false },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', free: false },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', free: false },
      { id: 'gpt-4', name: 'GPT-4', free: false },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', free: false },
      { id: 'gpt-3.5-turbo-16k', name: 'GPT-3.5 Turbo 16K', free: false }
    ];
  }
}

module.exports = OpenAIService;

