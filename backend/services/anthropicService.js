/**
 * Anthropic Claude Service
 * Handles flashcard generation using Anthropic's Claude models
 * Following official Anthropic SDK best practices
 */

const Anthropic = require('@anthropic-ai/sdk');
const { buildPrompt } = require('./prompts');

class AnthropicService {
  constructor() {
    this.defaultModel = 'claude-3-haiku-20240307';
  }

  /**
   * Generate flashcards using Anthropic Claude API
   * @param {string} content - The text content to convert to flashcards
   * @param {number} cardCount - Number of flashcards to generate
   * @param {string} customPrompt - Optional custom prompt
   * @param {string} modelName - Claude model to use
   * @param {string} apiKey - Optional API key (required for Anthropic)
   * @returns {Promise<Array>} Array of flashcard objects
   */
  async generateFlashcards(content, cardCount = 25, customPrompt = null, modelName = 'claude-3-haiku-20240307', apiKey = null) {
    try {
      // Validate content is a string BEFORE using it in prompt
      if (typeof content !== 'string') {
        console.error('❌ ANTHROPIC ERROR: content parameter is not a string!');
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
      
      // Initialize Anthropic client with API key
      const anthropic = new Anthropic({
        apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
        timeout: 60000 // 60 seconds timeout
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
                  `\n\n${content}\n\nGenerate the new flashcard based on the context and instructions above. Return a JSON array with one flashcard object.`;
        } else {
          // Content extraction mode
          prompt = basePrompt + 
                  `\n\n=== BEGIN CONTENT ===\n${content}\n=== END CONTENT ===\n\nGenerate ${cardCount} flashcards ONLY from the content above. Return a JSON array.`;
        }
      } else {
        // Generation from instructions mode
        prompt = basePrompt + 
                `\n\nGenerate ${cardCount} flashcards based on the instructions provided above. Create original, educational content following the specified format. Return a JSON array.`;
      }
      
      console.log(`🟣 Anthropic: Generating ${cardCount} flashcards with model ${modelName}`);

      // Use messages API with system message
      const message = await anthropic.messages.create({
        model: modelName,
        max_tokens: 4096,
        temperature: 0.3,
        system: "You are a professional educational content designer. Generate flashcards from provided content in JSON format. Return a JSON array of objects, each with 'question' and 'answer' fields.",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      });

      // Extract text from response
      const text = message.content[0].text;
      
      // Extract JSON from the response (handle markdown code blocks)
      let jsonText = text.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```\n?/g, '').replace(/```\n?$/g, '');
      }
      
      let flashcards = JSON.parse(jsonText);
      
      if (!Array.isArray(flashcards)) {
        throw new Error('Invalid response format from Claude - expected array');
      }
      
      // Normalize field names to ensure 'question' and 'answer' exist
      flashcards = flashcards.map(card => {
        // Handle different possible field names
        const question = card.question || card.Question || card.q || card.Q || card.front || card.Front || '';
        const answer = card.answer || card.Answer || card.a || card.A || card.back || card.Back || '';
        
        return {
          question: question.trim(),
          answer: answer.trim()
        };
      });
      
      // Filter out any cards that still don't have both fields
      flashcards = flashcards.filter(card => card.question && card.answer);
      
      if (flashcards.length === 0) {
        throw new Error('No valid flashcards generated - all cards were missing question or answer fields');
      }
      
      console.log(`✅ Anthropic: Successfully generated ${flashcards.length} flashcards`);
      return flashcards;
      
    } catch (error) {
      // Enhanced error handling
      if (error.status) {
        // API error
        console.error('❌ Anthropic API Error:', error.status, error.message);
        throw new Error(`Anthropic API Error: ${error.message}`);
      } else {
        // Other errors
        console.error('❌ Anthropic Error:', error.message);
        throw error;
      }
    }
  }

  /**
   * Check if this service can handle the given model
   * @param {string} modelName - The model identifier
   * @returns {boolean} True if this is a Claude model
   */
  static canHandle(modelName) {
    return modelName && modelName.startsWith('claude-');
  }

  /**
   * Get available Anthropic models
   * @returns {Array} List of available models
   */
  static getAvailableModels() {
    return [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', free: false },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', free: false },
      { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', free: false },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', free: false }
    ];
  }
}

module.exports = AnthropicService;

