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
              // In rich mode, keep only bold and italic
              strike: false,
              code: false,
              codeBlock: false,
              blockquote: false,
              bulletList: false,
              orderedList: false,
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
          style: `min-height: ${minHeight}; max-height: ${maxHeight}; overflow-y: auto;`,
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
          onUpdate(editor.getHTML(), editor.getText());
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
            editor.commands.setContent(`<p>${content}</p>`);
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
        getText: () => editor?.getText() || "",
        clear: () => editor?.commands.clearContent(),
        editor,
        // Compatibility: setSelectionRange is a no-op for Tiptap
        setSelectionRange: () => {},
      }),
      [editor],
    );

    return (
      <div className={`tiptap-editor-wrapper ${className}`}>
        <EditorContent editor={editor} />
      </div>
    );
  },
);

TiptapEditor.displayName = "TiptapEditor";

export default TiptapEditor;
