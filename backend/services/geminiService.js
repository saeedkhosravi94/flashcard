/**
 * Google Gemini AI Service
 * Handles flashcard generation using Google's Gemini models
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { buildPrompt } = require('./prompts');

class GeminiService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.defaultModel = 'gemini-2.5-flash';
  }

  /**
   * Get a fresh model instance to prevent context bleeding
   * @param {string} modelName - The Gemini model to use
   * @param {string} apiKey - Optional API key (uses default if not provided)
   * @returns {Object} Gemini model instance
   */
  getFreshModel(modelName = 'gemini-2.5-flash', apiKey = null) {
    const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : this.genAI;
    
    return genAI.getGenerativeModel({ 
      model: modelName,
      generationConfig: {
        temperature: 0.3,  // Lower temperature for more focused, accurate responses
        topK: 40,
        topP: 0.95,
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
      ],
    });
  }

  /**
   * Generate flashcards using Gemini API
   * @param {string} content - The text content to convert to flashcards
   * @param {number} cardCount - Number of flashcards to generate
   * @param {string} customPrompt - Optional custom prompt
   * @param {string} modelName - Gemini model to use
   * @param {string} apiKey - Optional API key
   * @returns {Promise<Array>} Array of flashcard objects
   */
  async generateFlashcards(content, cardCount = 25, customPrompt = null, modelName = 'gemini-2.5-flash', apiKey = null) {
    try {
      // Validate content is a string BEFORE using it in prompt
      if (typeof content !== 'string') {
        console.error('❌ GEMINI ERROR: content parameter is not a string!');
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
      
      // 🔍 DEBUG LOG 6: In geminiService before creating prompt
      console.log('🔍 DEBUG LOG 6 - In geminiService.generateFlashcards (after validation, before prompt creation):');
      console.log('  - content type:', typeof content);
      console.log('  - content is string?:', typeof content === 'string');
      console.log('  - content length:', content.length);
      console.log('  - content first 200 chars:', content.substring(0, 200));
      console.log('  - cardCount:', cardCount);
      console.log('  - modelName:', modelName);
      console.log('  - customPrompt provided?:', !!customPrompt);
      
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
      
      // 🔍 DEBUG LOG 7: Check the actual prompt being sent
      console.log('🔍 DEBUG LOG 7 - Prompt created, showing content section:');
      const contentSectionMatch = prompt.match(/=== BEGIN CONTENT ===([\s\S]*?)=== END CONTENT ===/);
      if (contentSectionMatch) {
        const extractedContent = contentSectionMatch[1].trim();
        console.log('  - Extracted content from prompt (first 300 chars):', extractedContent.substring(0, 300));
        console.log('  - Extracted content type:', typeof extractedContent);
        console.log('  - Extracted content length:', extractedContent.length);
        console.log('  - Does it contain "[object Object]"?:', extractedContent.includes('[object Object]'));
      }
      
      console.log(`🔵 Gemini: Generating ${cardCount} flashcards with model ${modelName}`);
      
      // Get fresh model and generate content
      const model = this.getFreshModel(modelName, apiKey);
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      // Extract JSON from the response (handle markdown code blocks)
      let jsonText = text.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```\n?/g, '').replace(/```\n?$/g, '');
      }
      
      let flashcards = JSON.parse(jsonText);
      
      if (!Array.isArray(flashcards)) {
        throw new Error('Invalid response format from Gemini - expected array');
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
      
      console.log(`✅ Gemini: Successfully generated ${flashcards.length} flashcards`);
      return flashcards;
      
    } catch (error) {
      console.error('❌ Gemini Error:', error.message);
      throw new Error(`Gemini API Error: ${error.message}`);
    }
  }

  /**
   * Check if this service can handle the given model
   * @param {string} modelName - The model identifier
   * @returns {boolean} True if this is a Gemini model
   */
  static canHandle(modelName) {
    return modelName && modelName.startsWith('gemini-');
  }

  /**
   * Get available Gemini models
   * @returns {Array} List of available models
   */
  static getAvailableModels() {
    return [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', free: true },
      { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash Experimental', free: true },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', free: true },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', free: true }
    ];
  }
}

module.exports = GeminiService;
