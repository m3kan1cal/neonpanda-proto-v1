import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { logger } from "../../utils/logger";

/**
 * MarkdownRenderer - Reusable component for rendering markdown content with synthwave styling
 *
 * Uses react-markdown with remark-gfm for extended markdown support including:
 * - Tables
 * - Strikethrough
 * - Task lists
 * - Autolinks
 * - Code blocks
 *
 * Wrapped with React.memo to prevent unnecessary re-renders during streaming.
 *
 * @param {string} content - The markdown content to render
 * @param {string} className - Optional additional CSS classes
 */
const MarkdownRendererComponent = ({ content, className = "" }) => {
  // Guard against non-string content
  if (!content) return null;
  if (typeof content !== "string") {
    logger.warn(
      "MarkdownRenderer received non-string content:",
      content,
      typeof content,
    );
    return <span>{String(content || "")}</span>;
  }

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headers - cyan, uppercase, bold with size differentiation
          h1: ({ children }) => (
            <div className="mb-2 mt-4">
              <strong className="font-bold text-synthwave-neon-cyan uppercase text-xl">
                {children}
              </strong>
            </div>
          ),
          h2: ({ children }) => (
            <div className="mb-2 mt-3">
              <strong className="font-bold text-synthwave-neon-cyan uppercase text-lg">
                {children}
              </strong>
            </div>
          ),
          h3: ({ children }) => (
            <div className="mb-2 mt-2">
              <strong className="font-bold text-synthwave-neon-cyan uppercase">
                {children}
              </strong>
            </div>
          ),
          h4: ({ children }) => (
            <div className="mb-2 mt-2">
              <strong className="font-bold text-synthwave-neon-cyan uppercase text-sm">
                {children}
              </strong>
            </div>
          ),
          h5: ({ children }) => (
            <div className="mb-1 mt-2">
              <strong className="font-bold text-synthwave-neon-cyan uppercase text-sm">
                {children}
              </strong>
            </div>
          ),
          h6: ({ children }) => (
            <div className="mb-1 mt-2">
              <strong className="font-bold text-synthwave-neon-cyan uppercase text-xs">
                {children}
              </strong>
            </div>
          ),

          // Bold text - cyan
          strong: ({ children }) => (
            <strong className="font-bold text-synthwave-neon-cyan">
              {children}
            </strong>
          ),

          // Italic text - pink
          em: ({ children }) => (
            <em className="italic text-synthwave-neon-pink">{children}</em>
          ),

          // Unordered lists - custom bullet styling
          ul: ({ children }) => (
            <ul className="list-none space-y-1 my-2 pl-0">{children}</ul>
          ),

          // Ordered lists
          ol: ({ children }) => (
            <ol className="list-decimal space-y-1 my-2 pl-5 marker:text-synthwave-neon-cyan">
              {children}
            </ol>
          ),

          // List items - white bullet for unordered lists
          li: ({ children, ordered }) => {
            if (ordered) {
              return <li className="leading-normal pl-1">{children}</li>;
            }
            return (
              <li className="flex items-start space-x-3">
                <span className="text-white shrink-0 font-bold">•</span>
                <span className="flex-1 leading-normal">{children}</span>
              </li>
            );
          },

          // Paragraphs
          p: ({ children }) => (
            <p className="leading-normal mb-2">{children}</p>
          ),

          // Code blocks and inline code
          code: ({ node, className, children, ...props }) => {
            // Check if this is a code block (has language class) or inline code
            const isCodeBlock = className?.includes("language-");

            if (isCodeBlock) {
              return (
                <pre className="bg-synthwave-dark-purple/30 p-3 rounded-lg my-2 overflow-x-auto">
                  <code className="text-synthwave-neon-cyan text-sm">
                    {children}
                  </code>
                </pre>
              );
            }

            // Inline code
            return (
              <code className="bg-synthwave-dark-purple/50 text-synthwave-neon-pink px-1 py-0.5 rounded text-sm">
                {children}
              </code>
            );
          },

          // Pre blocks (code block wrapper)
          pre: ({ children }) => <>{children}</>,

          // Links - pink with cyan hover
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-synthwave-neon-pink hover:text-synthwave-neon-cyan underline transition-colors"
            >
              {children}
            </a>
          ),

          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-synthwave-neon-cyan/50 pl-4 my-2 italic text-synthwave-text-secondary">
              {children}
            </blockquote>
          ),

          // Horizontal rules
          hr: () => (
            <hr className="my-4 border-t border-synthwave-neon-cyan/30" />
          ),

          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto my-3">
              <table className="min-w-full border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-synthwave-dark-purple/30">{children}</thead>
          ),
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => (
            <tr className="border-b border-synthwave-neon-cyan/20">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-left text-synthwave-neon-cyan font-bold text-sm uppercase">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-sm">{children}</td>
          ),

          // Strikethrough (GFM)
          del: ({ children }) => (
            <del className="text-synthwave-text-secondary line-through">
              {children}
            </del>
          ),

          // Task list items (GFM)
          input: ({ checked, ...props }) => (
            <input
              type="checkbox"
              checked={checked}
              readOnly
              className="mr-2 accent-synthwave-neon-cyan"
              {...props}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

// Memoize to prevent unnecessary re-renders during streaming
export const MarkdownRenderer = React.memo(MarkdownRendererComponent);

export default MarkdownRenderer;
