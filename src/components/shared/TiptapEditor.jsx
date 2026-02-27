import React, { useEffect, useImperativeHandle, forwardRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

/**
 * Shared Tiptap Editor Component
 * Replaces textarea with a rich text (or plain text) editor.
 *
 * Modes:
 * - "rich": Bold + italic formatting (for chat input)
 * - "plain": No formatting toolbar (for workout logs)
 *
 * Exposes a ref with: { focus(), getHTML(), getText(), clear(), editor }
 */
const TiptapEditor = forwardRef(
  (
    {
      content = "",
      onUpdate,
      onKeyDown,
      placeholder = "",
      disabled = false,
      mode = "rich", // "rich" or "plain"
      className = "",
      minHeight = "60px",
      maxHeight = "200px",
      onPaste,
      showToolbar = false,
      // Padding to apply to the editor content area only (not the toolbar).
      // Use this instead of padding classes in `className` when showToolbar is true.
      contentClassName = "",
      // When true, overflow-y and max-height are applied to the outer wrapper div
      // instead of the inner .tiptap-content element. This makes the scrollbar
      // appear flush with the outer border (ideal for chat inputs with custom scrollbar classes).
      scrollOnWrapper = false,
    },
    ref,
  ) => {
    const extensions = [
      StarterKit.configure({
        // In plain mode, disable all formatting
        ...(mode === "plain"
          ? {
              bold: false,
              italic: false,
              strike: false,
              code: false,
              codeBlock: false,
              blockquote: false,
              bulletList: false,
              orderedList: false,
              heading: false,
              horizontalRule: false,
            }
          : {
              // In rich mode, keep bold, italic, strike, bullet/ordered lists
              code: false,
              codeBlock: false,
              blockquote: false,
              heading: false,
              horizontalRule: false,
            }),
      }),
      Placeholder.configure({
        placeholder,
      }),
    ];

    const editor = useEditor({
      extensions,
      content,
      editable: !disabled,
      editorProps: {
        attributes: {
          class: "tiptap-content outline-none",
          style: scrollOnWrapper
            ? `min-height: ${minHeight};`
            : `min-height: ${minHeight}; max-height: ${maxHeight}; overflow-y: auto;`,
        },
        handleKeyDown: (view, event) => {
          // Let parent handle keys first (slash commands, Enter to send, etc.)
          if (onKeyDown) {
            const handled = onKeyDown(event);
            if (handled) return true;
          }
          return false;
        },
        handlePaste: onPaste
          ? (view, event) => {
              // Check for image pastes - delegate to parent handler
              const items = event.clipboardData?.items;
              if (items) {
                for (let i = 0; i < items.length; i++) {
                  if (items[i].type.startsWith("image/")) {
                    onPaste(event);
                    return true;
                  }
                }
              }
              return false;
            }
          : undefined,
      },
      onUpdate: ({ editor }) => {
        if (onUpdate) {
          onUpdate(editor.getHTML(), editor.getText({ blockSeparator: "\n" }));
        }
      },
    });

    // Sync disabled state
    useEffect(() => {
      if (editor) {
        editor.setEditable(!disabled);
      }
    }, [disabled, editor]);

    // Sync content from parent (e.g., quick prompt selection, emoji insertion)
    useEffect(() => {
      if (editor && content !== undefined) {
        const currentHTML = editor.getHTML();
        // Only update if content actually changed from outside
        // Avoid resetting during user typing
        if (content === "" && currentHTML !== "<p></p>") {
          editor.commands.clearContent();
        } else if (
          content !== "" &&
          content !== currentHTML &&
          content !== editor.getText()
        ) {
          // Check if content is HTML or plain text
          if (content.startsWith("<")) {
            editor.commands.setContent(content);
          } else {
            // Convert plain text newlines to separate paragraphs so line
            // breaks are preserved when content is set programmatically.
            // Collapse consecutive blank lines into a single empty paragraph
            // to avoid double-spacing (TipTap <p> tags already have spacing).
            const htmlContent = content
              .replace(/\n{3,}/g, "\n\n")
              .split("\n")
              .map((line) =>
                line.trim() === "" ? "<p></p>" : `<p>${line}</p>`,
              )
              .join("");
            editor.commands.setContent(htmlContent);
          }
        }
      }
    }, [content, editor]);

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        focus: () => editor?.commands.focus(),
        getHTML: () => editor?.getHTML() || "",
        getText: () => editor?.getText({ blockSeparator: "\n" }) || "",
        clear: () => editor?.commands.clearContent(),
        editor,
        // Compatibility: setSelectionRange is a no-op for Tiptap
        setSelectionRange: () => {},
      }),
      [editor],
    );

    return (
      <div
        className={`tiptap-editor-wrapper ${showToolbar ? "overflow-hidden" : ""} ${className}`}
        style={
          scrollOnWrapper
            ? { maxHeight: `calc(${maxHeight} + 24px)`, overflowY: "auto" }
            : undefined
        }
      >
        {showToolbar && mode === "rich" && editor && (
          <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-synthwave-neon-cyan/10">
            {/* Text formatting */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().toggleBold().run();
              }}
              className={`cursor-pointer px-2.5 py-1 rounded text-sm font-bold font-rajdhani transition-colors ${
                editor.isActive("bold")
                  ? "text-synthwave-neon-cyan bg-synthwave-neon-cyan/10"
                  : "text-synthwave-text-muted hover:text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/10"
              }`}
              title="Bold"
            >
              B
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().toggleItalic().run();
              }}
              className={`cursor-pointer px-2.5 py-1 rounded text-sm italic font-rajdhani transition-colors ${
                editor.isActive("italic")
                  ? "text-synthwave-neon-cyan bg-synthwave-neon-cyan/10"
                  : "text-synthwave-text-muted hover:text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/10"
              }`}
              title="Italic"
            >
              I
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().toggleStrike().run();
              }}
              className={`cursor-pointer px-2.5 py-1 rounded text-sm line-through font-rajdhani transition-colors ${
                editor.isActive("strike")
                  ? "text-synthwave-neon-cyan bg-synthwave-neon-cyan/10"
                  : "text-synthwave-text-muted hover:text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/10"
              }`}
              title="Strikethrough"
            >
              S
            </button>

            {/* Divider */}
            <div className="w-px h-4 bg-synthwave-neon-cyan/20 mx-1 shrink-0" />

            {/* List formatting */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().toggleBulletList().run();
              }}
              className={`cursor-pointer p-1 rounded transition-colors ${
                editor.isActive("bulletList")
                  ? "text-synthwave-neon-cyan bg-synthwave-neon-cyan/10"
                  : "text-synthwave-text-muted hover:text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/10"
              }`}
              title="Bullet list"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="9" y1="6" x2="20" y2="6" />
                <line x1="9" y1="12" x2="20" y2="12" />
                <line x1="9" y1="18" x2="20" y2="18" />
                <circle
                  cx="4"
                  cy="6"
                  r="1.5"
                  fill="currentColor"
                  stroke="none"
                />
                <circle
                  cx="4"
                  cy="12"
                  r="1.5"
                  fill="currentColor"
                  stroke="none"
                />
                <circle
                  cx="4"
                  cy="18"
                  r="1.5"
                  fill="currentColor"
                  stroke="none"
                />
              </svg>
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().toggleOrderedList().run();
              }}
              className={`cursor-pointer p-1 rounded transition-colors ${
                editor.isActive("orderedList")
                  ? "text-synthwave-neon-cyan bg-synthwave-neon-cyan/10"
                  : "text-synthwave-text-muted hover:text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/10"
              }`}
              title="Numbered list"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="10" y1="6" x2="21" y2="6" />
                <line x1="10" y1="12" x2="21" y2="12" />
                <line x1="10" y1="18" x2="21" y2="18" />
                <text
                  x="2"
                  y="8"
                  fontSize="6"
                  fill="currentColor"
                  stroke="none"
                  fontFamily="monospace"
                >
                  1.
                </text>
                <text
                  x="2"
                  y="14"
                  fontSize="6"
                  fill="currentColor"
                  stroke="none"
                  fontFamily="monospace"
                >
                  2.
                </text>
                <text
                  x="2"
                  y="20"
                  fontSize="6"
                  fill="currentColor"
                  stroke="none"
                  fontFamily="monospace"
                >
                  3.
                </text>
              </svg>
            </button>
          </div>
        )}
        <div className={contentClassName}>
          <EditorContent editor={editor} />
        </div>
      </div>
    );
  },
);

TiptapEditor.displayName = "TiptapEditor";

export default TiptapEditor;
