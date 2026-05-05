import React, {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  forwardRef,
} from "react";
import { createPortal } from "react-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { buttonPatterns } from "../../utils/ui/uiPatterns";

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
      // When true, shows an expand/fullscreen button in the toolbar.
      // Only effective when showToolbar is true and mode is "rich".
      allowFullscreen = false,
      // When true, automatically opens the editor in fullscreen on mobile
      // viewports (max-width: 767px) on mount. Desktop behavior is unchanged.
      // Requires allowFullscreen so the user can exit back to inline.
      autoFullscreenOnMobile = false,
      // Accent color for toolbar borders and active button states.
      // "cyan" (default) suits chat inputs; "pink" suits form inputs.
      variant = "cyan",
      // When provided, a camera icon button is rendered in the toolbar.
      // Only effective when showToolbar is true and mode is "rich".
      onAttachPhoto = null,
      attachPhotoDisabled = false,
      attachPhotoCount = 0,
    },
    ref,
  ) => {
    // Tracks the last content emitted by the editor's own onUpdate so the
    // sync effect can skip re-setting the editor when the parent simply
    // bounces that content back as a prop (avoiding the scroll/space bug).
    const lastUserContent = useRef(null);
    // Lazy initializer so mobile auto-fullscreen takes effect on the first
    // render — using a useEffect would let the inline layout paint first and
    // flash before flipping to the fullscreen portal.
    const [isFullscreen, setIsFullscreen] = useState(() => {
      if (!autoFullscreenOnMobile || !allowFullscreen) return false;
      if (typeof window === "undefined" || !window.matchMedia) return false;
      return window.matchMedia("(max-width: 767px)").matches;
    });

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
          const html = editor.getHTML();
          const text = editor.getText({ blockSeparator: "\n" });
          // Record what the editor just emitted so the sync effect can
          // detect when content is simply bouncing back from the parent.
          lastUserContent.current = { html, text };
          onUpdate(html, text);
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
        // If the parent is just echoing back what the editor itself emitted
        // via onUpdate (the common controlled-component pattern), skip the
        // setContent call entirely. This prevents the editor from scrolling
        // to the cursor after every keystroke and from swallowing spaces due
        // to ProseMirror's trailing-whitespace normalisation during HTML
        // round-trips.
        const last = lastUserContent.current;
        if (last && (content === last.html || content === last.text)) {
          return;
        }

        const currentHTML = editor.getHTML();
        // Only update if content actually changed from outside
        // Avoid resetting during user typing
        if (content === "" && currentHTML !== "<p></p>") {
          editor.commands.clearContent();
        } else if (
          content !== "" &&
          content !== currentHTML &&
          content !== editor.getText({ blockSeparator: "\n" })
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
              .map((line) => {
                // trimEnd only — preserve leading indentation like "  - bullet"
                const trimmed = line.trimEnd();
                return trimmed === "" ? "<p></p>" : `<p>${trimmed}</p>`;
              })
              .join("");
            editor.commands.setContent(htmlContent);
          }
        }
      }
    }, [content, editor]);

    // Close fullscreen on Escape key
    useEffect(() => {
      if (!isFullscreen) return;

      const handleEscapeKey = (e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          setIsFullscreen(false);
        }
      };

      document.addEventListener("keydown", handleEscapeKey);
      return () => document.removeEventListener("keydown", handleEscapeKey);
    }, [isFullscreen]);

    // Lock body scroll when fullscreen
    useEffect(() => {
      if (!isFullscreen) return;

      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }, [isFullscreen]);

    // Auto-focus editor when entering fullscreen
    useEffect(() => {
      if (isFullscreen && editor) {
        requestAnimationFrame(() => {
          editor.commands.focus();
        });
      }
    }, [isFullscreen, editor]);

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

    const showFullscreenButton =
      allowFullscreen && showToolbar && mode === "rich";

    const isPink = variant === "pink";
    const accentBorderB = isPink
      ? "border-b border-synthwave-neon-pink/10"
      : "border-b border-synthwave-neon-cyan/10";
    const accentActive = isPink
      ? "text-synthwave-neon-pink bg-synthwave-neon-pink/10"
      : "text-synthwave-neon-cyan bg-synthwave-neon-cyan/10";
    const accentInactive = isPink
      ? "text-synthwave-text-muted hover:text-synthwave-neon-pink hover:bg-synthwave-neon-pink/10"
      : "text-synthwave-text-muted hover:text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/10";
    const accentDivider = isPink
      ? "bg-synthwave-neon-pink/20"
      : "bg-synthwave-neon-cyan/20";

    // Toolbar shared between inline and fullscreen modes
    const toolbar = showToolbar && mode === "rich" && editor && (
      <div className={`flex items-center gap-0.5 px-2 py-1.5 ${accentBorderB}`}>
        {/* Text formatting */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            editor.chain().focus().toggleBold().run();
          }}
          className={`cursor-pointer px-2.5 py-1 rounded-xl text-sm font-bold font-body transition-colors ${
            editor.isActive("bold") ? accentActive : accentInactive
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
          className={`cursor-pointer px-2.5 py-1 rounded-xl text-sm italic font-body transition-colors ${
            editor.isActive("italic") ? accentActive : accentInactive
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
          className={`cursor-pointer px-2.5 py-1 rounded-xl text-sm line-through font-body transition-colors ${
            editor.isActive("strike") ? accentActive : accentInactive
          }`}
          title="Strikethrough"
        >
          S
        </button>

        {/* Divider */}
        <div className={`w-px h-4 ${accentDivider} mx-1 shrink-0`} />

        {/* List formatting */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            editor.chain().focus().toggleBulletList().run();
          }}
          className={`cursor-pointer p-1 rounded-xl transition-colors ${
            editor.isActive("bulletList") ? accentActive : accentInactive
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
            <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none" />
          </svg>
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            editor.chain().focus().toggleOrderedList().run();
          }}
          className={`cursor-pointer p-1 rounded-xl transition-colors ${
            editor.isActive("orderedList") ? accentActive : accentInactive
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

        {/* Attach photo */}
        {onAttachPhoto && (
          <>
            <div className={`w-px h-4 ${accentDivider} mx-1 shrink-0`} />
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                if (!attachPhotoDisabled) onAttachPhoto();
              }}
              disabled={attachPhotoDisabled}
              className={`cursor-pointer p-1 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${accentInactive}`}
              title={
                attachPhotoDisabled
                  ? "Maximum 5 photos"
                  : "Attach photos (up to 5)"
              }
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </button>
            {attachPhotoCount > 0 && (
              <span className="text-xs font-body text-synthwave-text-muted px-0.5">
                {attachPhotoCount}/5
              </span>
            )}
          </>
        )}

        {/* Fullscreen toggle */}
        {showFullscreenButton && (
          <>
            <div className={`w-px h-4 ${accentDivider} mx-1 shrink-0`} />
            <div className="flex-1" />
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setIsFullscreen((prev) => !prev);
              }}
              className={`cursor-pointer p-1 rounded-xl transition-colors ${accentInactive}`}
              title={isFullscreen ? "Exit fullscreen" : "Expand editor"}
            >
              {isFullscreen ? (
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="4 14 10 14 10 20" />
                  <polyline points="20 10 14 10 14 4" />
                  <line x1="14" y1="10" x2="21" y2="3" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 3 21 3 21 9" />
                  <polyline points="9 21 3 21 3 15" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              )}
            </button>
          </>
        )}
      </div>
    );

    // Fullscreen overlay rendered via portal
    if (isFullscreen) {
      return (
        <>
          {/* Placeholder to keep layout stable while editor is in portal */}
          <div
            className={`tiptap-editor-wrapper ${showToolbar ? "overflow-hidden" : ""} ${className}`}
            style={
              scrollOnWrapper
                ? {
                    minHeight: showToolbar
                      ? `calc(${minHeight} + 24px)`
                      : minHeight,
                    maxHeight: `calc(${maxHeight} + 24px)`,
                    overflowY: "auto",
                  }
                : {
                    minHeight: showToolbar
                      ? `calc(${minHeight} + 24px)`
                      : minHeight,
                  }
            }
          />

          {createPortal(
            <>
              {/* Backdrop — tap to dismiss */}
              <div
                className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm animate-fade-in"
                onClick={() => setIsFullscreen(false)}
              />

              {/* Fullscreen editor container — outer layer has pointer-events:
                  none so taps in any padding gap pass through to the backdrop.
                  The inner card re-enables pointer events. This avoids touch
                  events on the outer container dismissing fullscreen
                  mid-interaction. */}
              <div className="fixed inset-0 z-[61] p-3 sm:p-4 md:p-6 flex flex-col animate-fade-in pointer-events-none">
                <div
                  className={`tiptap-fullscreen tiptap-editor-wrapper${isPink ? " tiptap-editor-pink" : ""} flex-1 flex flex-col w-full max-w-4xl mx-auto rounded-xl bg-synthwave-bg-card/95 backdrop-blur-xl border ${isPink ? "border-synthwave-neon-pink/20" : "border-synthwave-neon-cyan/20"} shadow-lg overflow-hidden text-synthwave-text-secondary pointer-events-auto`}
                >
                  {toolbar}
                  <div className="tiptap-fullscreen-content px-4 py-4 flex-1 overflow-y-auto">
                    <EditorContent editor={editor} />
                  </div>

                  {/* Done button footer */}
                  <div
                    className={`flex justify-end px-4 py-3 border-t ${isPink ? "border-synthwave-neon-pink/10" : "border-synthwave-neon-cyan/10"}`}
                  >
                    <button
                      type="button"
                      onClick={() => setIsFullscreen(false)}
                      className={buttonPatterns.primaryMedium}
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            </>,
            document.body,
          )}
        </>
      );
    }

    // Default inline rendering
    return (
      <div
        className={`tiptap-editor-wrapper ${showToolbar ? "overflow-hidden" : ""} ${className}`}
        style={
          scrollOnWrapper
            ? { maxHeight: `calc(${maxHeight} + 24px)`, overflowY: "auto" }
            : undefined
        }
      >
        {toolbar}
        <div className={contentClassName}>
          <EditorContent editor={editor} />
        </div>
      </div>
    );
  },
);

TiptapEditor.displayName = "TiptapEditor";

export default TiptapEditor;
