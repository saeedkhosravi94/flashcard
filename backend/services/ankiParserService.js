const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const execAsync = promisify(exec);

/**
 * Service to parse Anki .apkg files using the Python script
 * and convert the output to the flashcard format expected by the backend
 */
class AnkiParserService {
  /**
   * Parse an .apkg file using the Python script
   * @param {string} apkgFilePath - Path to the uploaded .apkg file
   * @returns {Promise<Object>} - Parsed data with flashcards array
   */
  async parseApkg(apkgFilePath) {
    try {
      const scriptPath = path.join(__dirname, 'parse_anki.py');
      
      // Check if Python script exists
      try {
        await fs.access(scriptPath);
      } catch (error) {
        throw new Error(`Anki parser script not found at ${scriptPath}. Please ensure parse_anki.py exists in backend/services/`);
      }

      // Check if Python 3 is available
      try {
        await execAsync('python3 --version');
      } catch (error) {
        throw new Error('Python 3 is not installed or not available in PATH. Please install Python 3 to parse Anki files.');
      }

      console.log(`🐍 Running Python script to parse Anki file: ${apkgFilePath}`);
      console.log(`📝 Script path: ${scriptPath}`);
      
      // Run the Python script with absolute paths
      const absoluteScriptPath = path.resolve(scriptPath);
      const absoluteApkgPath = path.resolve(apkgFilePath);
      
      const { stdout, stderr } = await execAsync(`python3 "${absoluteScriptPath}" "${absoluteApkgPath}"`);
      
      if (stderr && !stderr.includes('Done!') && !stderr.includes('Generated')) {
        console.warn('⚠️  Python script warnings:', stderr);
      }
      
      if (stdout) {
        console.log('✅ Python script output:', stdout);
      }

      // Get the output directory (same name as .apkg file without extension)
      const apkgDir = path.dirname(apkgFilePath);
      const apkgBasename = path.basename(apkgFilePath, path.extname(apkgFilePath));
      const outputDir = path.join(apkgDir, apkgBasename);
      const cardsJsonPath = path.join(outputDir, 'cards.json');

      // Check if cards.json was created
      try {
        await fs.access(cardsJsonPath);
      } catch (error) {
        throw new Error(`Failed to generate cards.json. Output directory: ${outputDir}`);
      }

      // Read the cards.json file
      const cardsJsonContent = await fs.readFile(cardsJsonPath, 'utf-8');
      const cardsData = JSON.parse(cardsJsonContent);

      // Count total cards (each entry may have multiple card_ids from the same note)
      const totalCardIds = Object.values(cardsData).reduce((sum, card) => {
        return sum + (card.card_ids?.length || 1);
      }, 0);
      
      console.log(`📚 Parsed ${Object.keys(cardsData).length} notes (${totalCardIds} total cards) from Anki file`);

      // Convert to flashcard format and copy media files
      const flashcards = await this.convertToFlashcardFormat(cardsData, outputDir, apkgBasename);

      // Clean up the output directory (optional - you might want to keep it for debugging)
      // await this.cleanupOutputDir(outputDir);

      return {
        flashcards: flashcards,
        isAnki: true,
        outputDir: outputDir // Keep reference for media file handling
      };
    } catch (error) {
      console.error('❌ Error parsing Anki file:', error);
      throw new Error(`Failed to parse Anki file: ${error.message}`);
    }
  }

  /**
   * Convert Anki cards format to flashcard format expected by the backend
   * @param {Object} cardsData - Cards data from cards.json
   * @param {string} outputDir - Directory where parsed files are located
   * @param {string} deckName - Name of the deck (for organizing media files)
   * @returns {Promise<Array>} - Array of flashcard objects
   */
  async convertToFlashcardFormat(cardsData, outputDir, deckName) {
    const flashcards = [];
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const mediaDir = path.join(uploadsDir, 'anki-media', deckName);

    // Create media directory if it doesn't exist
    await fs.mkdir(mediaDir, { recursive: true });

    for (const [cardId, cardData] of Object.entries(cardsData)) {
      try {
        const front = cardData.front || {};
        const back = cardData.back || {};
        
        // Note: cardData.card_ids contains all card IDs from the same note
        // We create one flashcard per note entry (not per card ID)

        // Handle content - can be a string or an array of strings
        // If it's an array, join the elements with newlines
        let frontContent = front.content || '';
        if (Array.isArray(frontContent)) {
          frontContent = frontContent.join('\n');
        }
        
        let backContent = back.content || '';
        if (Array.isArray(backContent)) {
          backContent = backContent.join('\n');
        }

        // Extract content (clean HTML)
        const question = this.cleanHtmlContent(frontContent);
        const answer = this.cleanHtmlContent(backContent);

        if (!question || !answer) {
          console.warn(`⚠️  Skipping card ${cardId}: missing question or answer`);
          continue;
        }

        // Handle media files
        const questionImage = await this.copyMediaFile(
          front.media?.images?.[0],
          outputDir,
          mediaDir,
          'images'
        );
        const answerImage = await this.copyMediaFile(
          back.media?.images?.[0],
          outputDir,
          mediaDir,
          'images'
        );
        const questionAudio = await this.copyMediaFile(
          front.media?.audio?.[0],
          outputDir,
          mediaDir,
          'audio'
        );
        const answerAudio = await this.copyMediaFile(
          back.media?.audio?.[0],
          outputDir,
          mediaDir,
          'audio'
        );

        flashcards.push({
          question: question,
          answer: answer,
          questionImage: questionImage,
          answerImage: answerImage,
          questionAudio: questionAudio,
          answerAudio: answerAudio,
          section: 'Anki Import',
          difficulty: 'medium'
        });
      } catch (error) {
        console.error(`❌ Error processing card ${cardId}:`, error);
        // Continue with other cards
      }
    }

    console.log(`✅ Converted ${flashcards.length} cards to flashcard format`);
    return flashcards;
  }

  /**
   * Copy a media file from the parsed output directory to the uploads directory
   * @param {string} mediaPath - Relative path to media file (e.g., "media/images/file.png")
   * @param {string} outputDir - Directory where parsed files are located
   * @param {string} targetMediaDir - Target directory in uploads
   * @param {string} mediaType - Type of media ('images' or 'audio')
   * @returns {Promise<string|null>} - URL path to the media file or null
   */
  async copyMediaFile(mediaPath, outputDir, targetMediaDir, mediaType) {
    if (!mediaPath) {
      return null;
    }

    try {
      // Resolve the full path to the media file
      const sourcePath = path.join(outputDir, mediaPath);
      
      // Check if file exists
      try {
        await fs.access(sourcePath);
      } catch (error) {
        console.warn(`⚠️  Media file not found: ${sourcePath}`);
        return null;
      }

      // Get filename
      const filename = path.basename(mediaPath);
      const targetPath = path.join(targetMediaDir, mediaType, filename);

      // Create target directory if needed
      await fs.mkdir(path.dirname(targetPath), { recursive: true });

      // Copy file
      await fs.copyFile(sourcePath, targetPath);

      // Return path in format /uploads/... for frontend to access
      // The path should be relative to the uploads directory but prefixed with /uploads/
      const uploadsDir = path.join(__dirname, '..', 'uploads');
      const relativePath = path.relative(uploadsDir, targetPath).replace(/\\/g, '/');
      
      // Ensure path starts with /uploads/ for frontend access
      const frontendPath = relativePath.startsWith('uploads/') 
        ? `/${relativePath}` 
        : `/uploads/${relativePath}`;

      return frontendPath;
    } catch (error) {
      console.error(`❌ Error copying media file ${mediaPath}:`, error);
      return null;
    }
  }

  /**
   * Clean HTML content from Anki cards and convert LaTeX to markdown format
   * @param {string} content - HTML content
   * @returns {string} - Cleaned text content with LaTeX in markdown format
   */
  cleanHtmlContent(content) {
    if (!content) {
      return '';
    }

    // First, remove audio references [sound:filename.mp3] since audio is already extracted
    content = content.replace(/\[sound:[^\]]+\]/gi, '');

    // Remove image tags <img src="..."> since images are already extracted
    content = content.replace(/<img[^>]*>/gi, '');

    // Convert Anki LaTeX format to markdown format
    // Anki format: [latex]\[...\]\n[/latex] or [latex]\(...\)[/latex]
    // Markdown format: $$...$$ (block) or $...$ (inline)
    
    // Handle block LaTeX: [latex]\[...\]\n[/latex] -> $$...$$
    // Pattern matches: [latex]\[content\]\n[/latex] or [latex]\[content\][/latex]
    content = content.replace(
      /\[latex\]\\?\[(.*?)\\]\\?(\s*)\[\/latex\]/gis,
      (match, latexContent, whitespace) => {
        // Remove any leading/trailing whitespace from LaTeX content
        const cleanedLatex = latexContent.trim();
        return `$$${cleanedLatex}$$`;
      }
    );
    
    // Handle inline LaTeX: [latex]\(...\)[/latex] -> $...$
    // Pattern matches: [latex]\(content\)[/latex]
    content = content.replace(
      /\[latex\]\\?\((.*?)\)\\?\[\/latex\]/gis,
      (match, latexContent) => {
        const cleanedLatex = latexContent.trim();
        return `$${cleanedLatex}$`;
      }
    );
    
    // Handle any remaining [latex]...[/latex] tags that weren't caught above
    // This catches cases where the format might be slightly different
    content = content.replace(
      /\[latex\](.*?)\[\/latex\]/gis,
      (match, latexContent) => {
        const cleanedLatex = latexContent.trim();
        // If it still contains \[ or \], extract the content between them
        if (cleanedLatex.includes('\\[') && cleanedLatex.includes('\\]')) {
          const blockMatch = cleanedLatex.match(/\\?\[(.*?)\\]/);
          if (blockMatch) {
            return `$$${blockMatch[1].trim()}$$`;
          }
        }
        // If it contains \( or \), extract the content between them
        if (cleanedLatex.includes('\\(') && cleanedLatex.includes('\\)')) {
          const inlineMatch = cleanedLatex.match(/\\?\((.*?)\)/);
          if (inlineMatch) {
            return `$${inlineMatch[1].trim()}$`;
          }
        }
        // Otherwise treat as block math (default)
        return `$$${cleanedLatex}$$`;
      }
    );

    // Remove HTML tags but preserve line breaks
    let cleaned = content
      .replace(/<br\s*\/?>/gi, '\n') // Convert <br> to newlines
      .replace(/<\/p>/gi, '\n') // Convert </p> to newlines
      .replace(/<\/div>/gi, '\n') // Convert </div> to newlines
      .replace(/<[^>]+>/g, '') // Remove all other HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
      .replace(/&amp;/g, '&') // Replace &amp; with &
      .replace(/&lt;/g, '<') // Replace &lt; with <
      .replace(/&gt;/g, '>') // Replace &gt; with >
      .replace(/&quot;/g, '"') // Replace &quot; with "
      .replace(/&#39;/g, "'") // Replace &#39; with '
      .replace(/&apos;/g, "'") // Replace &apos; with '
      .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
      .replace(/[ \t]+/g, ' ') // Replace multiple spaces/tabs with single space (preserve newlines)
      .replace(/\n /g, '\n') // Remove spaces after newlines
      .replace(/ \n/g, '\n') // Remove spaces before newlines
      .trim();

    return cleaned;
  }

  /**
   * Clean up the output directory after processing (optional)
   * @param {string} outputDir - Directory to clean up
   */
  async cleanupOutputDir(outputDir) {
    try {
      await fs.rm(outputDir, { recursive: true, force: true });
      console.log(`🧹 Cleaned up output directory: ${outputDir}`);
    } catch (error) {
      console.warn(`⚠️  Could not clean up output directory: ${outputDir}`, error);
    }
  }
}

module.exports = new AnkiParserService();

