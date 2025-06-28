import React from 'react';

// Enhanced markdown parser for basic formatting with synthwave styling
export const parseMarkdown = (text) => {
  if (!text) return text;

  // Split by lines to preserve line breaks
  const lines = text.split('\n');
  const elements = [];
  let elementKey = 0;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Check if this is a list item (starts with - followed by space)
    const isListItem = /^-\s/.test(trimmedLine);

    if (isListItem) {
      // Collect consecutive list items
      const listItems = [];
      while (i < lines.length) {
        const currentLine = lines[i].trim();
        if (/^-\s/.test(currentLine)) {
          const listItemText = currentLine.replace(/^-\s+/, '');
          listItems.push(listItemText);
          i++;
        } else {
          break;
        }
      }

      // Create a list element
      elements.push(
        <ul key={elementKey++} className="list-none space-y-2 my-3 pl-0">
          {listItems.map((item, itemIndex) => (
            <li key={itemIndex} className="flex items-start space-x-3">
              <span className="text-white mt-1 flex-shrink-0 font-bold">•</span>
              <span className="flex-1">{parseInlineFormatting(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue; // Don't increment i here since we already did it in the loop
    }

    // Handle empty lines
    if (!trimmedLine) {
      elements.push(<br key={elementKey++} />);
    } else {
      // Handle regular lines with inline formatting
      elements.push(
        <span key={elementKey++}>
          {parseInlineFormatting(line)}
          <br />
        </span>
      );
    }

    i++;
  }

  return elements;
};

// Helper function to parse inline formatting (bold, italic)
const parseInlineFormatting = (line) => {
  if (!line) return line;

  const parts = [];
  let partKey = 0;

  // Handle **bold** and *italic* formatting
  let currentIndex = 0;
  let match;

  // Combined regex to find both bold and italic
  const formattingRegex = /(\*\*(.*?)\*\*)|(\*(.*?)\*)/g;

  while ((match = formattingRegex.exec(line)) !== null) {
    // Add text before formatting
    if (match.index > currentIndex) {
      const beforeText = line.slice(currentIndex, match.index);
      if (beforeText) {
        parts.push(<span key={partKey++}>{beforeText}</span>);
      }
    }

    // Check if it's bold (**text**) or italic (*text*)
    if (match[1]) {
      // Bold formatting
      parts.push(
        <strong key={partKey++} className="font-bold text-synthwave-neon-cyan">
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      // Italic formatting
      parts.push(
        <em key={partKey++} className="italic text-synthwave-neon-pink">
          {match[4]}
        </em>
      );
    }

    currentIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (currentIndex < line.length) {
    const remainingText = line.slice(currentIndex);
    parts.push(<span key={partKey++}>{remainingText}</span>);
  }

  // If no formatting found, return the line as is
  if (parts.length === 0) {
    return line;
  }

  return parts;
};