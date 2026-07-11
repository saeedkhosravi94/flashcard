import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import katex from 'katex';

/**
 * LatexRenderer - Renders text with Markdown and LaTeX math expressions
 * Supports:
 * - Markdown: **bold**, `code`, etc.
 * - LaTeX: inline ($...$) and block ($$...$$) math
 */
function LatexRenderer({ content }) {
  // Preprocess content: Replace LaTeX with HTML that will be preserved by rehype-raw
  const processedContent = useMemo(() => {
    if (!content) return '';

    let processed = content;

    // Step 1: Protect code blocks from LaTeX processing
    const codeBlocks = [];
    let codeIndex = 0;

    // Protect fenced code blocks first (```...```)
    processed = processed.replace(/```[\s\S]*?```/g, (match) => {
      const placeholder = `___FENCED_CODE_${codeIndex}___`;
      codeBlocks.push(match);
      codeIndex++;
      return placeholder;
    });

    // Protect inline code (`...`) - but only if not part of a fenced block
    processed = processed.replace(/`[^`\n]+`/g, (match) => {
      if (!match.includes('___FENCED_CODE_')) {
        const placeholder = `___INLINE_CODE_${codeIndex}___`;
        codeBlocks.push(match);
        codeIndex++;
        return placeholder;
      }
      return match;
    });

    // Step 2: Process block math ($$...$$) and replace with HTML div
    processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (match, mathContent) => {
      try {
        const html = katex.renderToString(mathContent.trim(), {
          displayMode: true,
          throwOnError: false,
          errorColor: '#cc0000',
          strict: false
        });
        return `<div class="latex-block">${html}</div>`;
      } catch (error) {
        console.error('LaTeX block error:', error);
        return `<div class="latex-error">Error rendering: ${mathContent}</div>`;
      }
    });

    // Step 3: Process inline math ($...$)
    processed = processed.replace(/\$([^$\n]+?)\$/g, (match, mathContent) => {
      try {
        const html = katex.renderToString(mathContent.trim(), {
          displayMode: false,
          throwOnError: false,
          errorColor: '#cc0000',
          strict: false
        });
        return `<span class="latex-inline">${html}</span>`;
      } catch (error) {
        console.error('LaTeX inline error:', error);
        return `<span class="latex-error">${match}</span>`;
      }
    });

    // Step 4: Restore code blocks
    codeBlocks.forEach((code, index) => {
      processed = processed.replace(`___FENCED_CODE_${index}___`, code);
      processed = processed.replace(`___INLINE_CODE_${index}___`, code);
    });

    return processed;
  }, [content]);

  if (!content) return null;

  // Custom components for react-markdown (for code styling)
  const components = {
    code: ({ node, inline, className, children, ...props }) => {
      if (inline) {
        return (
          <code className="markdown-inline-code" {...props}>
            {children}
          </code>
        );
      }
      return (
        <code className="markdown-code-block" {...props}>
          {children}
        </code>
      );
    },
  };

  return (
    <div className="latex-content">
      <ReactMarkdown rehypePlugins={[rehypeRaw]} components={components}>
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}

export default LatexRenderer;
