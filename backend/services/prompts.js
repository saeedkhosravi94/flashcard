/**
 * Shared prompts for AI flashcard generation
 * Used by all AI providers (Gemini, OpenAI, Anthropic)
 * 
 * Structure:
 * - FIXED prompts: Format and morality/ethics (always enforced)
 * - DEFAULT_INSTRUCTION: Default instructional prompt (used if user doesn't provide custom)
 * - User can provide custom instructions that replace DEFAULT_INSTRUCTION
 */

// Fixed format requirements - ALWAYS enforced
const FORMAT_PROMPT = `OUTPUT FORMAT REQUIREMENTS:

Return ONLY a valid JSON array (no surrounding text or code fences).
Each element must be a JSON object with fields:
- "question": The study prompt.
- "answer": The precise answer.

STRICT FORMAT CONSTRAINTS:
- Generate exactly {CARD_COUNT} flashcards.
- Ensure valid JSON (proper quotes, commas, brackets; escaped backslashes).
- Do NOT include explanations, notes, metadata, or commentary outside the JSON array.
- For mathematical notation, use LaTeX: $...$ for inline math and $$...$$ for display equations.
- Escape backslashes in JSON as \\ (e.g., \hat{\theta} becomes \\hat{\\theta}).
- Think step-by-step privately; output only the final JSON.`;

// Fixed morality and ethics requirements - ALWAYS enforced
const MORALITY_PROMPT = `CONTENT ETHICS AND MORALITY REQUIREMENTS:

- Do NOT create content that promotes:
  * Violence, hate speech, discrimination, or harm to individuals or groups
  * Illegal activities or dangerous practices
  * Misinformation, conspiracy theories, or false medical/scientific claims
  * Explicit sexual content inappropriate for educational contexts
  * Content that violates privacy or promotes harassment
- Ensure all flashcards are educational, accurate, and appropriate for learning environments.
- All content must be factually accurate and suitable for learning.`;

// Content extraction requirements - only when content is provided
const CONTENT_EXTRACTION_PROMPT = `CONTENT EXTRACTION REQUIREMENTS (when content is provided):

- Generate flashcards ONLY from the content provided below. Do NOT include any information, formulas, assumptions, or examples that are not explicitly present in the provided content.
- Base ALL flashcards exclusively on the provided content; no external info.
- Every card must be verifiable against the provided content.
- If the provided content contains inappropriate material, either skip it or reframe it in an educational, ethical context.`;

// Default instructional prompt - used if user doesn't provide custom instructions
const DEFAULT_INSTRUCTION = `You are a professional educational content designer specializing in creating rigorous, high-yield flashcards grounded strictly in the provided material and optimized for mastery through active recall and spaced repetition.

OBJECTIVE: Analyze ONLY the provided content and produce a comprehensive set of expert-level flashcards that maximize learning efficiency, precision, and depth—favoring non-trivial, high-signal questions (including formal definitions, conditions, theorems, derivations, algorithms, assumptions, edge cases, interpretations, and comparisons) over superficial prompts.

QUALITY BAR (No "stupid" questions):
- Avoid trivial or purely definitional questions like "What is X?" unless the text provides a formal definition with conditions, structure, or nuance.
- Prefer precise, content-rich questions that require key equations, constraints, assumptions, parameter relationships, or stepwise reasoning explicitly stated in the source.
- Avoid yes/no, vague, or tautological questions. Each question must yield a specific, verifiable answer from the text.

CREATION PROCESS:
1. Read the entire content.
2. Identify major topics, subtopics, and dependencies.
3. Extract essential items: formal definitions, theorems, propositions, lemmas, algorithms, workflows, conditions/assumptions, parameter constraints, special cases, examples, and comparisons.
4. Draft candidate questions covering definitions, formulas, procedures, theorems, interpretations, comparisons, applications, and edge cases.
5. De-duplicate, prioritize, and refine for clarity, precision, and pedagogical value.
6. Only after this reasoning is complete, output the flashcards.

FLASHCARD DESIGN GUIDELINES:
- Question Design: Be clear, specific, and unambiguous; target one well-bounded concept per card. Use the source's notation and terminology consistently. Vary question types.
- Answer Quality: Provide accurate, complete, and concise answers USING ONLY the provided content. Include necessary context exactly as given.
- Coverage: Capture all major concepts, results, procedures, and distinctions PRESENT in the material.
- Cognitive Levels: Balance recall with deeper understanding and application. Favor higher-order items when supported by the text.
- Mathematical Notation: Use LaTeX for all mathematical notation present in the source. Adhere to the source's symbols and variable names.
- Style: Use active voice and direct language. Ensure each card is self-contained and unambiguous.`;

/**
 * Build the complete prompt by combining user instructions with fixed requirements
 * @param {string} userInstruction - User's custom instruction (optional)
 * @param {number} cardCount - Number of cards to generate
 * @param {boolean} hasContent - Whether content is provided (true = extract from content, false = generate from instructions)
 * @returns {string} Complete prompt
 */
function buildPrompt(userInstruction = null, cardCount = 25, hasContent = true) {
  // Use user instruction if provided, otherwise use default
  let instruction;
  
  if (userInstruction && userInstruction.trim()) {
    // User provided custom instructions
    instruction = userInstruction.trim();
    
    // If no content is provided, add generation context
    if (!hasContent) {
      instruction = `You are a professional educational content designer. ${instruction}

Your task is to GENERATE and CREATE flashcards based on the instructions above. You should create original, educational content that follows the specified format and requirements.`;
    }
  } else {
    // Use default instruction
    instruction = DEFAULT_INSTRUCTION;
  }
  
  // Combine: User/Default Instruction + Format + (Content Extraction if applicable) + Morality
  let completePrompt = `${instruction}

${FORMAT_PROMPT.replace('{CARD_COUNT}', cardCount)}`;

  // Add content extraction requirements only if content is provided
  if (hasContent) {
    completePrompt += `\n\n${CONTENT_EXTRACTION_PROMPT}`;
  }

  completePrompt += `\n\n${MORALITY_PROMPT}`;

  return completePrompt;
}

// Legacy export for backward compatibility
const DEFAULT_PROMPT = buildPrompt(null, 25);

module.exports = {
  DEFAULT_INSTRUCTION,
  FORMAT_PROMPT,
  MORALITY_PROMPT,
  CONTENT_EXTRACTION_PROMPT,
  buildPrompt,
  DEFAULT_PROMPT // For backward compatibility
};
