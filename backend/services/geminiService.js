const { GoogleGenerativeAI } = require('@google/generative-ai');

// Professional prompt for high-quality flashcard generation
const DEFAULT_PROMPT = `You are a professional educational content designer specializing in creating effective learning flashcards using evidence-based pedagogical principles.

TASK: Analyze the provided content and generate a comprehensive set of high-quality flashcards that facilitate active recall and spaced repetition learning.

FLASHCARD CREATION GUIDELINES:

1. QUESTION DESIGN:
   - Create clear, specific, and unambiguous questions
   - Use active voice and direct language
   - Focus on one concept per flashcard
   - Vary question types: definitions, explanations, applications, comparisons, and examples
   - Include "What", "How", "Why", "When", and "Explain" questions for depth

2. ANSWER QUALITY:
   - Provide accurate, complete, and well-structured answers
   - Include relevant context when necessary
   - Keep answers concise but comprehensive (2-4 sentences ideal)
   - Use clear explanations that reinforce understanding
   - Add examples or mnemonics where helpful

3. CONTENT COVERAGE:
   - Extract all key concepts, principles, and definitions
   - Include important facts, dates, names, and terminology
   - Cover cause-and-effect relationships
   - Identify critical distinctions and comparisons
   - Capture practical applications and examples

4. COGNITIVE LEVELS:
   - Include questions at multiple levels: recall, understanding, and application
   - Balance simple memorization with deeper comprehension
   - Create questions that test connections between concepts

5. LATEX FORMATTING (IMPORTANT):
   - For mathematical expressions, formulas, and equations, ALWAYS use LaTeX notation
   - Use $...$ for inline math: $E = mc^2$
   - Use $$...$$ for display math (block equations): $$\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$
   - For chemical formulas, use LaTeX: $H_2O$, $CO_2$
   - For scientific notation: $6.022 \\times 10^{23}$
   - Escape backslashes properly in JSON: use \\\\ instead of \\
   - Common LaTeX commands: \\frac{}{}, \\sqrt{}, \\sum, \\int, \\alpha, \\beta, etc.

OUTPUT FORMAT:
Return ONLY a valid JSON array with NO additional text, explanations, or markdown.
Structure each flashcard exactly as shown:

[
  {
    "question": "What is the quadratic formula?",
    "answer": "The quadratic formula is $$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$ where $a$, $b$, and $c$ are coefficients of the quadratic equation $ax^2 + bx + c = 0$."
  },
  {
    "question": "What is Einstein's mass-energy equivalence?",
    "answer": "$E = mc^2$ states that energy ($E$) equals mass ($m$) times the speed of light squared ($c^2$). This shows mass and energy are interchangeable."
  }
]

REQUIREMENTS:
- Generate {CARD_COUNT} flashcards from this content
- Ensure valid JSON syntax (proper quotes, commas, brackets)
- Maintain consistent quality across all flashcards
- Prioritize the most important and testable information
- Cover all major topics in this section
- Use LaTeX for ALL mathematical, scientific, and chemical notation

Remember: These flashcards will be used for serious study and learning. Make them professional, accurate, and pedagogically sound. Mathematical content MUST be in LaTeX format for proper rendering.`;

class GeminiService {
  constructor() {
    // Using Gemini 2.5 Flash - Latest and most advanced Flash model
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash'
    });
  }

  /**
   * Generate flashcards from a single piece of content
   */
  async generateFlashcards(content, cardCount = 25) {
    try {
      const prompt = DEFAULT_PROMPT.replace('{CARD_COUNT}', cardCount) + 
                    `\n\nContent to analyze:\n${content}`;
      
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      // Extract JSON from the response (handle markdown code blocks)
      let jsonText = text.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```\n?/g, '').replace(/```\n?$/g, '');
      }
      
      const flashcards = JSON.parse(jsonText);
      
      if (!Array.isArray(flashcards)) {
        throw new Error('Invalid response format from Gemini');
      }
      
      return flashcards;
    } catch (error) {
      console.error('Error generating flashcards:', error);
      throw new Error('Failed to generate flashcards: ' + error.message);
    }
  }

  /**
   * Process multiple chunks and generate flashcards for each
   * @param {Array} chunks - Array of chunk objects from ContentChunker
   * @param {Function} progressCallback - Optional callback for progress updates
   * @returns {Array} Combined flashcards with section metadata
   */
  async processChunks(chunks, progressCallback = null) {
    const allFlashcards = [];
    const contentChunker = require('./contentChunker');
    
    console.log(`Processing ${chunks.length} chunks...`);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      try {
        // Calculate optimal flashcard count for this chunk
        const cardCount = contentChunker.calculateFlashcardsPerChunk(chunk.text);
        
        console.log(`Processing chunk ${i + 1}/${chunks.length}: "${chunk.title}" (${chunk.text.length} chars, targeting ${cardCount} cards)`);
        
        // Generate flashcards for this chunk
        const flashcards = await this.generateFlashcards(chunk.text, cardCount);
        
        // Add metadata to each flashcard
        const enrichedFlashcards = flashcards.map(card => ({
          ...card,
          section: chunk.title,
          chunkIndex: chunk.chunkIndex,
          sourcePages: chunk.estimatedPages
        }));
        
        allFlashcards.push(...enrichedFlashcards);
        
        console.log(`Generated ${flashcards.length} flashcards for "${chunk.title}"`);
        
        // Call progress callback if provided
        if (progressCallback) {
          progressCallback({
            currentChunk: i + 1,
            totalChunks: chunks.length,
            flashcardsGenerated: allFlashcards.length,
            currentSection: chunk.title
          });
        }
        
        // Add a small delay to avoid rate limiting (Gemini API best practice)
        if (i < chunks.length - 1) {
          await this.delay(1000); // 1 second delay between chunks
        }
        
        // Force garbage collection if available (helps with memory management)
        if (global.gc) {
          global.gc();
        }
        
      } catch (error) {
        console.error(`Error processing chunk ${i + 1} ("${chunk.title}"):`, error);
        
        // Continue with next chunk instead of failing completely
        console.log(`Skipping chunk ${i + 1} due to error, continuing with remaining chunks...`);
        
        if (progressCallback) {
          progressCallback({
            currentChunk: i + 1,
            totalChunks: chunks.length,
            flashcardsGenerated: allFlashcards.length,
            currentSection: chunk.title,
            error: `Failed to process: ${error.message}`
          });
        }
      }
    }
    
    console.log(`Total flashcards generated: ${allFlashcards.length} from ${chunks.length} chunks`);
    
    return allFlashcards;
  }

  /**
   * Helper function to add delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  convertToCSV(flashcards) {
    // Check if flashcards have section metadata
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
}

module.exports = new GeminiService();

