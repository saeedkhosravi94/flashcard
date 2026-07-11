import React, { useState } from 'react';
import './TextEditorToolbar.css';

function TextEditorToolbar({ textareaRef, value, onChange }) {
  const [showLatexMenu, setShowLatexMenu] = useState(false);

  const insertText = (before, after = '', moveBack = 0) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end);
    
    onChange({ target: { value: newText } });
    
    // Set cursor position after update
    setTimeout(() => {
      const newPosition = start + before.length + selectedText.length + after.length - moveBack;
      textarea.focus();
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const insertLatexInline = () => {
    insertText('$', '$', 1);
    setShowLatexMenu(false);
  };

  const insertLatexBlock = () => {
    insertText('$$\n', '\n$$', 3);
    setShowLatexMenu(false);
  };

  const insertSymbol = (symbol) => {
    insertText(symbol);
    setShowLatexMenu(false);
  };

  const latexSymbols = [
    { label: 'α', value: '\\alpha ' },
    { label: 'β', value: '\\beta ' },
    { label: 'γ', value: '\\gamma ' },
    { label: 'Δ', value: '\\Delta ' },
    { label: 'θ', value: '\\theta ' },
    { label: 'λ', value: '\\lambda ' },
    { label: 'μ', value: '\\mu ' },
    { label: 'π', value: '\\pi ' },
    { label: 'σ', value: '\\sigma ' },
    { label: 'Σ', value: '\\Sigma ' },
    { label: '∞', value: '\\infty ' },
    { label: '±', value: '\\pm ' },
    { label: '÷', value: '\\div ' },
    { label: '×', value: '\\times ' },
    { label: '≠', value: '\\neq ' },
    { label: '≤', value: '\\leq ' },
    { label: '≥', value: '\\geq ' },
    { label: '√', value: '\\sqrt{', after: '}' },
    { label: '∫', value: '\\int ', after: ' dx' },
    { label: '∑', value: '\\sum ', after: '' },
    { label: 'ⁿ', value: '^{', after: '}' },
    { label: 'ₙ', value: '_{', after: '}' },
    { label: '/', value: '\\frac{', after: '}{}' },
  ];

  const handleBold = () => {
    insertText('**', '**', 2);
  };

  const handleItalic = () => {
    insertText('*', '*', 1);
  };

  const handleUnderline = () => {
    insertText('__', '__', 2);
  };

  const handleList = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const newText = value.substring(0, lineStart) + '• ' + value.substring(lineStart);
    
    onChange({ target: { value: newText } });
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(lineStart + 2, lineStart + 2);
    }, 0);
  };

  const handleCode = () => {
    insertText('`', '`', 1);
  };

  return (
    <div className="text-editor-toolbar">
      <div className="toolbar-section">
        <button
          type="button"
          className="toolbar-btn"
          onClick={handleBold}
          title="Bold (Ctrl+B)"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={handleItalic}
          title="Italic (Ctrl+I)"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={handleUnderline}
          title="Underline (Ctrl+U)"
        >
          <u>U</u>
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={handleCode}
          title="Inline Code"
        >
          {'</>'}
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={handleList}
          title="Bullet List"
        >
          •
        </button>
      </div>

      <div className="toolbar-divider"></div>

      <div className="toolbar-section latex-section">
        <button
          type="button"
          className="toolbar-btn latex-btn"
          onClick={() => setShowLatexMenu(!showLatexMenu)}
          title="Insert LaTeX"
        >
          ƒₓ
        </button>

        {showLatexMenu && (
          <div className="latex-menu">
            <div className="latex-menu-header">
              <span>LaTeX Tools</span>
              <button
                type="button"
                className="close-latex-menu"
                onClick={() => setShowLatexMenu(false)}
              >
                ✕
              </button>
            </div>

            <div className="latex-quick-insert">
              <button
                type="button"
                className="latex-quick-btn"
                onClick={insertLatexInline}
              >
                $ $ Inline Math
              </button>
              <button
                type="button"
                className="latex-quick-btn"
                onClick={insertLatexBlock}
              >
                $$ $$ Block Math
              </button>
            </div>

            <div className="latex-symbols-header">Common Symbols</div>
            <div className="latex-symbols-grid">
              {latexSymbols.map((symbol, index) => (
                <button
                  key={index}
                  type="button"
                  className="latex-symbol-btn"
                  onClick={() => insertSymbol(symbol.value + (symbol.after || ''))}
                  title={symbol.value}
                >
                  {symbol.label}
                </button>
              ))}
            </div>

            <div className="latex-examples">
              <div className="latex-example-title">Examples:</div>
              <div className="latex-example">$x^2 + y^2 = z^2$</div>
              <div className="latex-example">$$\frac{'{a}{b}'}$$</div>
              <div className="latex-example">$$\int_0^\infty e^{'{-x}'} dx$$</div>
            </div>
          </div>
        )}
      </div>

      <div className="toolbar-info">
        <span className="toolbar-hint">Tip: Newlines are preserved in cards</span>
      </div>
    </div>
  );
}

export default TextEditorToolbar;

