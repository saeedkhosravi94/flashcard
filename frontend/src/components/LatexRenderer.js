import React from 'react';
import 'katex/dist/katex.min.css';
import katex from 'katex';

/**
 * LatexRenderer - Renders text with LaTeX math expressions
 * Supports both inline ($...$) and block ($$...$$) LaTeX
 */
function LatexRenderer({ content }) {
  const renderLatex = (text) => {
    if (!text) return [];

    const elements = [];
    let key = 0;

    // First, handle block math ($$...$$)
    const blockMathRegex = /\$\$(.*?)\$\$/gs;
    let lastIndex = 0;

    // Split by block math first
    const parts = [];
    let match;
    
    while ((match = blockMathRegex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
      }
      // Add the block math
      parts.push({ type: 'block', content: match[1] });
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({ type: 'text', content: text.substring(lastIndex) });
    }

    // Now process each part for inline math
    parts.forEach((part, partIndex) => {
      if (part.type === 'block') {
        // Render block math
        try {
          const html = katex.renderToString(part.content, {
            displayMode: true,
            throwOnError: false,
            errorColor: '#cc0000',
            strict: false
          });
          elements.push(
            <div 
              key={`block-${partIndex}`}
              className="latex-block"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch (error) {
          console.error('LaTeX block render error:', error);
          elements.push(
            <div key={`block-error-${partIndex}`} className="latex-error">
              $$Error: {part.content}$$
            </div>
          );
        }
      } else {
        // Process inline math in text
        const inlineMathRegex = /\$(.*?)\$/g;
        let lastIdx = 0;
        let inlineMatch;
        const textContent = part.content;

        while ((inlineMatch = inlineMathRegex.exec(textContent)) !== null) {
          // Add text before the match
          if (inlineMatch.index > lastIdx) {
            const textBefore = textContent.substring(lastIdx, inlineMatch.index);
            if (textBefore) {
              elements.push(<span key={`text-${key++}`}>{textBefore}</span>);
            }
          }

          // Render inline math
          try {
            const html = katex.renderToString(inlineMatch[1], {
              displayMode: false,
              throwOnError: false,
              errorColor: '#cc0000',
              strict: false
            });
            elements.push(
              <span 
                key={`inline-${key++}`}
                className="latex-inline"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch (error) {
            console.error('LaTeX inline render error:', error);
            elements.push(
              <span key={`inline-error-${key++}`} className="latex-error">
                ${inlineMatch[1]}$
              </span>
            );
          }

          lastIdx = inlineMatch.index + inlineMatch[0].length;
        }

        // Add remaining text
        if (lastIdx < textContent.length) {
          const remainingText = textContent.substring(lastIdx);
          if (remainingText) {
            elements.push(<span key={`text-${key++}`}>{remainingText}</span>);
          }
        }
      }
    });

    return elements.length > 0 ? elements : [<span key="default">{text}</span>];
  };

  return (
    <div className="latex-content">
      {renderLatex(content)}
    </div>
  );
}

export default LatexRenderer;

