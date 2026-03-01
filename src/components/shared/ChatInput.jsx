import React, { useState, useRef, useEffect, useCallback } from "react";
import { Tooltip } from "react-tooltip";
import EmojiPicker from "emoji-picker-react";
import {
  inputPatterns,
  iconButtonPatterns,
  containerPatterns,
  scrollbarPatterns,
  imagePreviewPatterns,
  injectScrollbarStyles,
  tooltipPatterns,
  navigationPatterns,
} from "../../utils/ui/uiPatterns";
import {
  SendIcon,
  PlusIcon,
  CameraIcon,
  PaperclipIcon,
  SmileIcon,
  MicIcon,
  XIcon,
  TrashIcon,
} from "../themes/SynthwaveComponents";
import { useImageUpload } from "../../hooks/useImageUpload";
import { logger } from "../../utils/logger";
import TiptapEditor from "./TiptapEditor";

// Progress ring for inline indicators (inside textarea)
const ProgressRing = ({
  percentage,
  size = 28,
  strokeWidth = 3,
  isWarning = false,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90 shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-synthwave-neon-cyan/20"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className={`transition-all duration-500 ${
          isWarning ? "text-synthwave-neon-pink" : "text-synthwave-neon-cyan"
        }`}
      />
    </svg>
  );
};

// Question mark icon for tips (standardized size)
const QuestionIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01"
    />
  </svg>
);

// Plus icon for quick actions button (standardized size)
const PlusIconLarge = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
    />
  </svg>
);

// Context-aware quick prompt categories and prompts
const QUICK_PROMPTS = {
  // Prompts for working with an existing coach
  coaching: [
    {
      category: "Getting Started",
      prompts: [
        "Explain your coaching philosophy and approach. What makes you unique as a training coach?",
        "Walk me through how you analyze training data and provide personalized guidance.",
        "Help me understand what information you need to provide the most effective coaching advice.",
      ],
    },
    {
      category: "Workout Planning",
      prompts: [
        "Guide me through creating a comprehensive weekly training plan by asking targeted questions about my goals, schedule, and preferences.",
        "Help design a periodized workout program. Ask me about my training history, current fitness level, and specific objectives.",
        "Walk me through planning the optimal training program for my goals. Ask about my available training days, time per session, and equipment access.",
      ],
    },
    {
      category: "Workout Logging",
      prompts: [
        "Help me log a recent workout with detailed analysis. Ask specific questions about exercises, sets, reps, weights, and how each movement felt.",
        "Guide me through documenting today's training session. Ask about performance, technique notes, and how my body responded.",
        "Walk me through proper workout logging. Ask about the exercises performed, training load, and any noteworthy observations.",
      ],
    },
    {
      category: "Training Analysis",
      prompts: [
        "Analyze my recent training patterns and provide insights. Ask me what specific aspects of my performance or progress you should focus on.",
        "Help me understand my training data trends. Guide me through identifying strengths, weaknesses, and areas for optimization.",
        "Provide a comprehensive review of my training consistency and progression. Ask what metrics or timeframes are most relevant to analyze.",
      ],
    },
    {
      category: "Goals & Programming",
      prompts: [
        "Guide me through setting specific, measurable fitness goals. Ask targeted questions to help define clear objectives and timelines.",
        "Help me adjust my training program for optimal progress. Ask about current challenges, plateaus, or changing priorities.",
        "Walk me through prioritizing training focuses. Ask about my short-term and long-term objectives to recommend the best approach.",
      ],
    },
  ],

  // Prompts for creating/configuring a new coach
  creation: [
    {
      category: "Getting Started",
      prompts: [
        "Guide me through the coach creation process step-by-step. Ask about my training experience and what type of coaching guidance would be most valuable.",
        "Help me design the ideal coach configuration. Ask targeted questions about my training style, goals, and preferred communication approach.",
        "Walk me through choosing the right coach settings. Ask about my fitness background and what coaching features matter most to me.",
      ],
    },
    {
      category: "Training Specialization",
      prompts: [
        "Help me configure a coach specialized in strength training and powerlifting. Ask about my experience level, competition goals, and preferred training methodologies.",
        "Guide me through setting up an endurance and cardio-focused coach. Ask about my sport focus, training volume preferences, and performance goals.",
        "Walk me through creating a functional fitness and mobility coach. Ask about my movement limitations, daily activities, and wellness priorities.",
      ],
    },
    {
      category: "Experience & Approach",
      prompts: [
        "Help me configure a coach for someone new to structured fitness training. Ask about learning preferences, available time, and initial concerns.",
        "Guide me through setting up a coach for intermediate lifters. Ask about current training methods, plateau areas, and advancement goals.",
        "Walk me through configuring a coach for advanced athletes. Ask about competition history, specialized needs, and performance optimization focuses.",
      ],
    },
    {
      category: "Goals & Outcomes",
      prompts: [
        "Help me design a coach focused on body composition changes. Ask about my current situation, target outcomes, and lifestyle factors.",
        "Guide me through configuring a performance-focused coach. Ask about my sport, competition schedule, and specific performance metrics that matter.",
        "Walk me through setting up a wellness and longevity coach. Ask about my health priorities, injury history, and long-term movement goals.",
      ],
    },
    {
      category: "Coaching Style",
      prompts: [
        "Help me configure a supportive and encouraging coaching style. Ask about my motivation preferences and how I respond best to feedback.",
        "Guide me through setting up direct, technical coaching. Ask about my experience with detailed form analysis and data-driven programming.",
        "Walk me through configuring analytical, science-based coaching. Ask about my interest in training theory, research, and detailed progress tracking.",
      ],
    },
  ],

  // Default fallback prompts (coaching context)
  default: [
    {
      category: "Getting Started",
      prompts: [
        "Help me understand what you can assist with. Ask about my current situation and what kind of guidance would be most valuable.",
        "Guide me through getting started effectively. Ask targeted questions to understand my needs and provide personalized recommendations.",
        "Walk me through the best way to work together. Ask about my preferences and goals to establish the most productive approach.",
      ],
    },
  ],
};

/**
 * Shared Chat Input Component
 * Used by CoachConversations and CoachCreator for consistent chat UX
 */
function ChatInput({
  // Core functionality
  inputMessage,
  setInputMessage,
  onSubmit,
  isTyping = false,
  placeholder = "How can I help with your training?",

  // User ID for image uploads
  userId,

  // Coach info
  coachName = "Coach",
  isOnline = true,

  // Context for prompt selection
  context = "coaching", // 'coaching', 'creation', or 'default'

  // Skeleton loading state
  showSkeleton = false,

  // Action buttons configuration
  showDeleteButton = false,
  onDeleteClick = null,

  // Recording functionality
  enableRecording = true,

  // Slash commands functionality
  enableSlashCommands = false,
  availableSlashCommands = [],
  onSlashCommandSelect = null,

  // Tips functionality
  showTipsButton = true,
  tipsContent = null,
  tipsTitle = "Tips & Help",

  // Quick actions functionality
  enablePhotoAttachment = true,
  enableFileAttachment = true,
  onPhotoAttachment = null,
  onFileAttachment = null,

  // Refs for parent component access
  textareaRef = null,

  // Progress indicator for coach creation (inline with quick suggestions)
  progressData = null,

  // Conversation size indicator (inline with status)
  conversationSize = null,
}) {
  // Early return for skeleton loading state
  if (showSkeleton) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-synthwave-bg-card/95 backdrop-blur-lg border-t-2 border-synthwave-neon-pink/30 shadow-lg shadow-synthwave-neon-pink/20 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 sm:py-6">
          {/* Input area skeleton */}
          <div className="flex items-end gap-2 sm:gap-3">
            {/* Text input skeleton — matches TipTap minHeight 60px + rounded-2xl */}
            <div className="flex-1 relative">
              <div className="w-full h-[80px] bg-synthwave-text-muted/20 animate-pulse"></div>
              {/* Emoji button placeholder (absolute right-3 bottom-3, desktop only) */}
              <div className="absolute right-3 bottom-3 w-6 h-6 bg-synthwave-text-muted/10 rounded-none animate-pulse hidden md:block"></div>
            </div>

            {/* Send/Voice button skeleton */}
            <div className="self-end mb-[6px] w-12 h-12 bg-synthwave-text-muted/20 animate-pulse"></div>
          </div>

          {/* AI disclaimer and keyboard shortcuts skeleton */}
          <div className="flex items-center justify-between gap-2 mt-3 pr-12 md:pr-[74px]">
            <div className="h-3 bg-synthwave-text-muted/20 animate-pulse w-48"></div>
            <div className="hidden md:block h-3 bg-synthwave-text-muted/20 animate-pulse w-64"></div>
          </div>
        </div>
      </div>
    );
  }

  // Get context-appropriate prompts
  const currentPrompts = QUICK_PROMPTS[context] || QUICK_PROMPTS.default;

  // Internal state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showSlashCommandTooltip, setShowSlashCommandTooltip] = useState(false);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [showTipsModal, setShowTipsModal] = useState(false);
  const [showQuickActionsPopup, setShowQuickActionsPopup] = useState(false);
  const [showQuickPromptsSubmenu, setShowQuickPromptsSubmenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const isSendingMessage = useRef(false);
  const photoInputRef = useRef(null);

  // Image upload hook
  const {
    selectedImages,
    isUploading,
    uploadProgress,
    uploadingImageIds,
    error: imageError,
    selectImages,
    uploadImages,
    removeImage,
    clearImages,
    setError: setImageError,
  } = useImageUpload();

  // Tiptap editor ref
  const editorRef = useRef(null);

  // Sync parent textareaRef with editorRef for backwards compatibility
  // Parent components call textareaRef.current.focus() - redirect to editor
  useEffect(() => {
    if (textareaRef && editorRef.current) {
      textareaRef.current = {
        focus: () => editorRef.current?.focus(),
        // Provide disabled property for parent checks
        get disabled() {
          return !editorRef.current?.editor?.isEditable;
        },
        set disabled(val) {
          // no-op, controlled by props
        },
      };
    }
  }, [textareaRef, editorRef.current?.editor]);

  // Recording functions
  const handleStartRecording = () => {
    setIsRecording(true);
    setRecordingTime(0);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setRecordingTime(0);
  };

  // Handle quick prompt selection
  const handleQuickPromptSelect = (prompt) => {
    setInputMessage(prompt);
    setShowQuickActionsPopup(false);
    setShowQuickPromptsSubmenu(false);

    // Focus the editor after a brief delay
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.focus();
      }
    }, 50);
  };

  // Handle emoji selection
  const handleEmojiClick = (emojiData) => {
    // Insert emoji into editor directly
    if (editorRef.current?.editor) {
      editorRef.current.editor.commands.insertContent(emojiData.emoji);
      // Sync state from editor content
      setInputMessage(editorRef.current.getText());
    } else {
      setInputMessage((prevMessage) => prevMessage + emojiData.emoji);
    }
    setShowEmojiPicker(false);

    // Focus the editor after emoji selection
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.focus();
      }
    }, 50);
  };

  // Handle photo selection from file input
  const handlePhotoSelect = async (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      try {
        await selectImages(files);
      } catch (err) {
        logger.error("Error selecting images:", err);
      }
    }
    // Reset file input
    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
  };

  // Handle paste event for images
  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }

    if (imageFiles.length > 0) {
      try {
        await selectImages(imageFiles);
      } catch (err) {
        logger.error("Error processing pasted images:", err);
      }
    }
  };

  // Format recording time
  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Inject scrollbar styles
  useEffect(() => {
    injectScrollbarStyles();
  }, []);

  // Recording timer effect
  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Refocus the editor when AI stops typing
  useEffect(() => {
    if (!isTyping) {
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.focus();
        }
      }, 10);
    }
  }, [isTyping]);

  // Show/hide slash command tooltip based on input
  useEffect(() => {
    if (shouldShowSlashCommandTooltip()) {
      setShowSlashCommandTooltip(true);
      setSelectedCommandIndex(0);
    } else {
      setShowSlashCommandTooltip(false);
    }
  }, [inputMessage, enableSlashCommands, availableSlashCommands.length]);

  // Handle Escape key and outside clicks for quick actions popup and emoji picker
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === "Escape") {
        if (showQuickPromptsSubmenu) {
          setShowQuickPromptsSubmenu(false);
        } else if (showQuickActionsPopup) {
          setShowQuickActionsPopup(false);
        } else if (showEmojiPicker) {
          setShowEmojiPicker(false);
        }
      }
    };

    const handleClickOutside = (event) => {
      if (showQuickActionsPopup || showQuickPromptsSubmenu) {
        // Check if the click is outside the quick actions container
        const quickActionsContainer = document.querySelector(
          "[data-quick-actions-container]",
        );
        const quickPromptsSubmenu = document.querySelector(
          "[data-quick-prompts-submenu]",
        );

        if (
          quickActionsContainer &&
          !quickActionsContainer.contains(event.target) &&
          (!quickPromptsSubmenu || !quickPromptsSubmenu.contains(event.target))
        ) {
          setShowQuickActionsPopup(false);
          setShowQuickPromptsSubmenu(false);
        }
      }

      if (showEmojiPicker) {
        // Check if the click is outside the emoji picker container
        const emojiPickerContainer = document.querySelector(
          "[data-emoji-picker-container]",
        );

        if (
          emojiPickerContainer &&
          !emojiPickerContainer.contains(event.target)
        ) {
          setShowEmojiPicker(false);
        }
      }
    };

    if (showQuickActionsPopup || showQuickPromptsSubmenu || showEmojiPicker) {
      document.addEventListener("keydown", handleEscapeKey);
      document.addEventListener("click", handleClickOutside, true); // Use capture phase
    }

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
      document.removeEventListener("click", handleClickOutside, true);
    };
  }, [showQuickActionsPopup, showQuickPromptsSubmenu, showEmojiPicker]);

  // Debug log for progress changes

  // Paste handling is now done through TiptapEditor's onPaste prop

  const handleSendMessage = async (e) => {
    e.preventDefault();

    // Allow sending if there's text OR images
    if (
      isSendingMessage.current ||
      (!inputMessage.trim() && selectedImages.length === 0)
    )
      return;

    isSendingMessage.current = true;
    const messageToSend = inputMessage.trim();

    try {
      // Upload images if any
      let imageS3Keys = [];
      if (selectedImages.length > 0 && userId) {
        imageS3Keys = await uploadImages(userId);
      }

      // Clear input and images BEFORE sending
      setInputMessage("");
      clearImages();

      // Clear editor and refocus
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.clear();
          editorRef.current.focus();
        }
      }, 50);

      // Send message with images
      await onSubmit(messageToSend, imageS3Keys);
    } catch (error) {
      logger.error("Error sending message:", error);
      // Don't clear images on error so user can retry
    } finally {
      // Reset flag after message is sent (success or failure)
      isSendingMessage.current = false;
    }
  };

  // Helper function to check if we should show slash command tooltip
  const shouldShowSlashCommandTooltip = () => {
    return (
      enableSlashCommands &&
      inputMessage.startsWith("/") &&
      inputMessage.length > 0 &&
      !inputMessage.includes(" ") &&
      availableSlashCommands.length > 0
    );
  };

  // Key handler passed to TiptapEditor - returns true if the key was handled
  const handleKeyDown = useCallback(
    (e) => {
      // Handle slash command navigation when tooltip is visible
      if (showSlashCommandTooltip && enableSlashCommands) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedCommandIndex((prev) =>
            prev < availableSlashCommands.length - 1 ? prev + 1 : 0,
          );
          return true;
        }

        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedCommandIndex((prev) =>
            prev > 0 ? prev - 1 : availableSlashCommands.length - 1,
          );
          return true;
        }

        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          const selectedCommand = availableSlashCommands[selectedCommandIndex];
          setInputMessage(selectedCommand.command + " ");
          setShowSlashCommandTooltip(false);
          if (onSlashCommandSelect) {
            onSlashCommandSelect(selectedCommand);
          }
          return true;
        }

        if (e.key === "Escape") {
          e.preventDefault();
          setShowSlashCommandTooltip(false);
          return true;
        }
      }

      // Enter to send, Shift+Enter for newline
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage(e);
        return true;
      }

      return false;
    },
    [
      showSlashCommandTooltip,
      enableSlashCommands,
      availableSlashCommands,
      selectedCommandIndex,
      onSlashCommandSelect,
    ],
  );

  // Update CSS custom property for chat input height
  React.useEffect(() => {
    const updateChatInputHeight = () => {
      const chatInputElement = document.querySelector(
        "[data-chat-input-container]",
      );
      if (chatInputElement) {
        const height = chatInputElement.offsetHeight;
        document.documentElement.style.setProperty(
          "--chat-input-height",
          `${height}px`,
        );
      }
    };

    // Update height on mount and when content changes
    updateChatInputHeight();

    // Use ResizeObserver to track height changes
    const chatInputElement = document.querySelector(
      "[data-chat-input-container]",
    );
    if (chatInputElement) {
      const resizeObserver = new ResizeObserver(updateChatInputHeight);
      resizeObserver.observe(chatInputElement);

      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [
    inputMessage,
    isRecording,
    showTipsModal,
    showQuickActionsPopup,
    showQuickPromptsSubmenu,
    progressData,
    conversationSize,
  ]);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-synthwave-bg-card/95 backdrop-blur-lg border-t-2 border-synthwave-neon-pink/30 shadow-lg shadow-synthwave-neon-pink/20 z-50"
      data-chat-input-container
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 sm:py-6">
        {/* Image Preview Grid */}
        {selectedImages.length > 0 && (
          <div className="mb-2">
            <div className={imagePreviewPatterns.grid}>
              {selectedImages.map((image) => (
                <div key={image.id} className={imagePreviewPatterns.container}>
                  <img
                    src={image.previewUrl}
                    alt={image.name}
                    className={imagePreviewPatterns.image}
                  />

                  {/* Loading spinner overlay */}
                  {uploadingImageIds.has(image.id) && (
                    <div className="absolute inset-0 bg-black/50 rounded-md flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-synthwave-neon-cyan border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => removeImage(image.id)}
                    className={imagePreviewPatterns.removeButton}
                    disabled={uploadingImageIds.has(image.id)}
                  >
                    <XIcon className="w-3 h-3" />
                  </button>
                  <div className={imagePreviewPatterns.sizeLabel}>
                    {(image.size / 1024).toFixed(0)}KB
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Display */}
        {imageError && (
          <div className="mb-3">
            <div className="bg-red-500/10 border border-red-500/30 p-3 flex items-start justify-between">
              <span className="text-sm font-rajdhani text-red-400">
                {imageError}
              </span>
              <button
                type="button"
                onClick={() => setImageError(null)}
                className="text-red-400 hover:text-red-300 cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
        {/* Recording indicator */}
        {isRecording && (
          <div className="mb-3 flex items-center justify-center">
            <div className="bg-red-500 text-white px-4 py-2 rounded-full flex items-center gap-2 animate-pulse">
              <div className="w-3 h-3 bg-white rounded-full"></div>
              <span className="text-sm font-medium font-rajdhani">
                Recording {formatRecordingTime(recordingTime)}
              </span>
              <button
                onClick={handleStopRecording}
                className="ml-2 hover:bg-red-600 rounded-full p-1 transition-colors cursor-pointer"
              >
                <XIcon />
              </button>
            </div>
          </div>
        )}

        {/* Input area */}
        <form
          onSubmit={handleSendMessage}
          className="flex items-end gap-2 sm:gap-3"
        >
          {/* Hidden file input */}
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*,.heic,.heif"
            multiple
            style={{ display: "none" }}
            onChange={handlePhotoSelect}
          />
          {/* Text input */}
          <div className="flex-1 relative">
            <TiptapEditor
              ref={editorRef}
              content={inputMessage}
              onUpdate={(html, text) => {
                setInputMessage(text);
              }}
              onKeyDown={handleKeyDown}
              placeholder={
                window.innerWidth < 768 ? "Talk to me..." : placeholder
              }
              disabled={isTyping}
              mode="rich"
              className={`${inputPatterns.chatInput} ${scrollbarPatterns.pink} !text-synthwave-text-secondary`}
              minHeight="60px"
              maxHeight="150px"
              scrollOnWrapper={true}
              onPaste={handlePaste}
            />
            {/* Actions menu button - inside textarea, left side */}
            <div
              className="absolute left-[8px] bottom-[7px]"
              data-quick-actions-container
            >
              <button
                type="button"
                onClick={() => setShowQuickActionsPopup(!showQuickActionsPopup)}
                className={`p-1 text-synthwave-text-secondary hover:text-blue-400 hover:bg-blue-400/20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400/50 cursor-pointer ${
                  showQuickActionsPopup ? "text-blue-400 bg-blue-400/20" : ""
                }`}
                data-tooltip-id="quick-actions-tooltip"
                data-tooltip-content="Actions"
                data-tooltip-place="top"
              >
                <PlusIconLarge />
              </button>

              {/* Quick Actions Popup */}
              {showQuickActionsPopup && (
                <div
                  className={`absolute bottom-full mb-2 left-0 w-56 z-50 ${containerPatterns.cardMediumOpaque}`}
                >
                  <div className="py-2">
                    {/* Quick Prompts Menu Item - always show */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setShowQuickPromptsSubmenu(!showQuickPromptsSubmenu)
                        }
                        onMouseEnter={() =>
                          window.innerWidth >= 768 &&
                          setShowQuickPromptsSubmenu(true)
                        }
                        onMouseLeave={() =>
                          window.innerWidth >= 768 &&
                          setShowQuickPromptsSubmenu(false)
                        }
                        className="flex items-center justify-between space-x-3 px-4 py-2 font-rajdhani font-medium text-synthwave-text-primary hover:text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/10 transition-all duration-300 w-full text-left"
                      >
                        <div className="flex items-center space-x-3">
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
                              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                            />
                          </svg>
                          <span>Quick Prompts</span>
                        </div>
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
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </button>

                      {/* Quick Prompts Submenu */}
                      {showQuickPromptsSubmenu && (
                        <div
                          className={`${navigationPatterns.quickPrompts.container} ${containerPatterns.cardMediumOpaque} synthwave-scrollbar-cyan`}
                          data-quick-prompts-submenu
                          onMouseEnter={() =>
                            window.innerWidth >= 768 &&
                            setShowQuickPromptsSubmenu(true)
                          }
                          onMouseLeave={() =>
                            window.innerWidth >= 768 &&
                            setShowQuickPromptsSubmenu(false)
                          }
                        >
                          <div className="py-2">
                            {currentPrompts.map((category, categoryIndex) => (
                              <div
                                key={categoryIndex}
                                className="mb-3 last:mb-0"
                              >
                                {/* Category Header */}
                                <div
                                  className={
                                    navigationPatterns.quickPrompts
                                      .categoryHeader
                                  }
                                >
                                  <span>{category.category}</span>
                                </div>

                                {/* Category Prompts */}
                                <div className="space-y-0">
                                  {category.prompts.map(
                                    (prompt, promptIndex) => (
                                      <button
                                        key={promptIndex}
                                        type="button"
                                        onClick={() =>
                                          handleQuickPromptSelect(prompt)
                                        }
                                        className={
                                          navigationPatterns.quickPrompts
                                            .promptButton
                                        }
                                      >
                                        {prompt}
                                      </button>
                                    ),
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Divider - only show if there are attachment options */}
                    {(enablePhotoAttachment || enableFileAttachment) && (
                      <div className="my-2 border-t border-synthwave-neon-pink/20"></div>
                    )}

                    {enablePhotoAttachment && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowQuickActionsPopup(false);
                          if (onPhotoAttachment) {
                            onPhotoAttachment();
                          } else {
                            photoInputRef.current?.click();
                          }
                        }}
                        className="flex items-center space-x-3 px-4 py-2 font-rajdhani font-medium text-synthwave-text-primary hover:text-synthwave-neon-pink hover:bg-synthwave-neon-pink/10 transition-all duration-300 w-full text-left"
                      >
                        <CameraIcon />
                        <span>Attach Photos</span>
                      </button>
                    )}

                    {enableFileAttachment && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowQuickActionsPopup(false);
                          if (onFileAttachment) {
                            onFileAttachment();
                          }
                        }}
                        className="flex items-center space-x-3 px-4 py-2 font-rajdhani font-medium text-synthwave-text-primary hover:text-purple-400 hover:bg-purple-400/10 transition-all duration-300 w-full text-left"
                      >
                        <PaperclipIcon />
                        <span>Attach Files</span>
                      </button>
                    )}

                    {/* Divider before utility actions */}
                    {(showTipsButton || showDeleteButton) && (
                      <div className="my-2 border-t border-synthwave-neon-pink/20"></div>
                    )}

                    {showTipsButton && tipsContent && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowQuickActionsPopup(false);
                          setShowTipsModal(true);
                        }}
                        className="flex items-center space-x-3 px-4 py-2 font-rajdhani font-medium text-synthwave-text-primary hover:text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/10 transition-all duration-300 w-full text-left"
                      >
                        <QuestionIcon />
                        <span>Tips & Help</span>
                      </button>
                    )}

                    {showDeleteButton && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowQuickActionsPopup(false);
                          onDeleteClick && onDeleteClick();
                        }}
                        className="flex items-center space-x-3 px-4 py-2 font-rajdhani font-medium text-synthwave-text-primary hover:text-synthwave-neon-pink hover:bg-synthwave-neon-pink/10 transition-all duration-300 w-full text-left"
                      >
                        <TrashIcon />
                        <span>
                          {context === "creation" ||
                          context === "program-design"
                            ? "Delete Session"
                            : "Delete Conversation"}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
            {/* Progress ring (CoachCreator / ProgramDesigner) */}
            {progressData &&
              (() => {
                const ringCompleted =
                  progressData.questionsCompleted ??
                  progressData.itemsCompleted ??
                  0;
                const ringTotal =
                  progressData.estimatedTotal ?? progressData.totalItems ?? 0;
                const ringPct = progressData.percentage ?? 0;
                return (
                  <div
                    className="absolute right-[38px] bottom-[10px]"
                    data-tooltip-id="progress-ring-tooltip"
                    data-tooltip-content={`Progress: ${ringCompleted}/${ringTotal} (${ringPct}%)`}
                  >
                    <ProgressRing
                      percentage={ringPct}
                      size={20}
                      strokeWidth={2}
                    />
                  </div>
                );
              })()}

            {/* Conversation size ring (CoachConversations) */}
            {!progressData && conversationSize && (
              <div
                className="absolute right-[38px] bottom-[10px]"
                data-tooltip-id="progress-ring-tooltip"
                data-tooltip-content={`Conversation: ${conversationSize.sizeKB?.toFixed(1)}KB / ${conversationSize.maxSizeKB}KB (${conversationSize.percentage}%)`}
              >
                <ProgressRing
                  percentage={conversationSize.percentage}
                  size={20}
                  strokeWidth={2}
                  isWarning={conversationSize.isApproachingLimit}
                />
              </div>
            )}

            <div className="relative" data-emoji-picker-container>
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`absolute right-[8px] bottom-[7px] p-1 text-synthwave-text-secondary hover:text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/10 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-cyan/50 cursor-pointer ${
                  showEmojiPicker
                    ? "text-synthwave-neon-cyan bg-synthwave-neon-cyan/10"
                    : ""
                }`}
                data-tooltip-id="emoji-tooltip"
                data-tooltip-content="Emojis"
                data-tooltip-place="top"
              >
                <SmileIcon />
              </button>

              {/* Emoji Picker Popup */}
              {showEmojiPicker && (
                <div className="absolute bottom-14 right-0 z-50">
                  <div
                    className={`${containerPatterns.cardMediumOpaque} overflow-hidden emoji-picker-synthwave`}
                  >
                    <style>{`
                      .emoji-picker-synthwave .epr-emoji-category-label {
                        font-family: 'Rajdhani', sans-serif !important;
                        font-size: 0.75rem !important;
                        font-weight: 500 !important;
                        color: #b4b4b4 !important;
                        text-transform: uppercase !important;
                        letter-spacing: 0.05em !important;
                        background-color: transparent !important;
                        padding: 8px 12px 4px 12px !important;
                        margin: 0 !important;
                      }

                      .emoji-picker-synthwave .epr-search-container input {
                        font-family: 'Rajdhani', sans-serif !important;
                        font-size: 1rem !important;
                        background-color: rgba(10, 10, 10, 0.5) !important;
                        border: 2px solid rgba(255, 0, 128, 0.3) !important;
                        border-radius: 16px !important;
                        color: #ffffff !important;
                        outline: none !important;
                        box-shadow: none !important;
                        transition: border-color 300ms !important;
                        padding: 12px 16px 12px 36px !important;
                        height: 48px !important;
                      }

                      .emoji-picker-synthwave .epr-search-container input:hover {
                        border-color: rgba(255, 0, 128, 0.5) !important;
                      }

                      .emoji-picker-synthwave .epr-search-container input:focus {
                        border-color: rgb(255, 0, 128) !important;
                        background-color: rgba(10, 10, 10, 0.5) !important;
                        outline: none !important;
                        box-shadow: none !important;
                      }

                      .emoji-picker-synthwave .epr-search-container input::placeholder {
                        color: #666666 !important;
                      }

                      /* Cyan scrollbar styling */
                      .emoji-picker-synthwave ::-webkit-scrollbar {
                        width: 6px !important;
                      }

                      .emoji-picker-synthwave ::-webkit-scrollbar-track {
                        background: rgba(21, 23, 35, 0.5) !important;
                      }

                      .emoji-picker-synthwave ::-webkit-scrollbar-thumb {
                        background: rgba(0, 255, 255, 0.3) !important;
                        border-radius: 3px !important;
                      }

                      .emoji-picker-synthwave ::-webkit-scrollbar-thumb:hover {
                        background: rgba(0, 255, 255, 0.5) !important;
                      }
                    `}</style>
                    <EmojiPicker
                      onEmojiClick={handleEmojiClick}
                      theme="dark"
                      searchPlaceHolder="Search emojis..."
                      width={350}
                      height={450}
                      emojiStyle="native"
                      previewConfig={{
                        showPreview: false,
                      }}
                      skinTonesDisabled
                      searchDisabled={false}
                      categories={[
                        {
                          category: "suggested",
                          name: "Recently Used",
                        },
                        {
                          category: "activities",
                          name: "Fitness & Activities",
                        },
                        {
                          category: "smileys_people",
                          name: "Smileys & People",
                        },
                        {
                          category: "food_drink",
                          name: "Food & Drink",
                        },
                        {
                          category: "objects",
                          name: "Objects",
                        },
                        {
                          category: "animals_nature",
                          name: "Animals & Nature",
                        },
                        {
                          category: "travel_places",
                          name: "Travel & Places",
                        },
                        {
                          category: "symbols",
                          name: "Symbols",
                        },
                        {
                          category: "flags",
                          name: "Flags",
                        },
                      ]}
                      style={{
                        "--epr-bg-color": "transparent",
                        "--epr-category-label-bg-color": "transparent",
                        "--epr-picker-border-color": "transparent",
                        "--epr-search-input-bg-color": "rgba(10, 10, 10, 0.5)",
                        "--epr-search-input-bg-color-active":
                          "rgba(10, 10, 10, 0.7)",
                        "--epr-search-input-border-color":
                          "rgba(0, 255, 255, 0.2)",
                        "--epr-search-input-border-color-active":
                          "rgba(0, 255, 255, 0.5)",
                        "--epr-hover-bg-color": "rgba(0, 255, 255, 0.15)",
                        "--epr-focus-bg-color": "rgba(0, 255, 255, 0.2)",
                        "--epr-text-color": "#b4b4b4",
                        "--epr-search-input-text-color": "#f1f5f9",
                        "--epr-search-input-placeholder-color": "#666666",
                        "--epr-category-icon-active-color": "#00ffff",
                        "--epr-skin-tone-picker-menu-color":
                          "rgba(30, 30, 46, 0.95)",
                        "--epr-emoji-size": "24px",
                        "--epr-emoji-padding": "4px",
                        "--epr-category-padding": "8px",
                        "--epr-header-padding": "12px",
                        "--epr-search-input-height": "40px",
                        "--epr-search-input-padding": "12px",
                        "--epr-category-label-height": "auto",
                        fontSize: "0.75rem",
                        fontFamily: "Rajdhani, sans-serif",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
            <Tooltip id="emoji-tooltip" {...tooltipPatterns.standard} />
            <Tooltip id="quick-actions-tooltip" {...tooltipPatterns.standard} />
            {(progressData || conversationSize) && (
              <Tooltip
                id="progress-ring-tooltip"
                {...tooltipPatterns.standard}
              />
            )}

            {/* Slash Command Tooltip */}
            {showSlashCommandTooltip && enableSlashCommands && (
              <div className="absolute bottom-full mb-2 left-0 bg-synthwave-bg-card/95 border-2 border-synthwave-neon-pink/30 p-4 shadow-lg backdrop-blur-sm z-10 min-w-[400px]">
                <div className="font-rajdhani text-xs text-synthwave-text-secondary uppercase tracking-wider mb-2">
                  Available Slash Commands
                </div>
                <div className="space-y-2">
                  {availableSlashCommands.map((cmd, index) => (
                    <div
                      key={index}
                      className={`flex items-start space-x-3 py-1 px-2 rounded cursor-pointer transition-colors duration-200 border ${
                        index === selectedCommandIndex
                          ? "bg-synthwave-bg-primary/30 border-synthwave-neon-pink/20"
                          : "hover:bg-synthwave-bg-primary/30 border-transparent"
                      }`}
                      onClick={() => {
                        setInputMessage(cmd.command + " ");
                        setShowSlashCommandTooltip(false);
                        if (editorRef.current) {
                          editorRef.current.focus();
                        }
                        if (onSlashCommandSelect) {
                          onSlashCommandSelect(cmd);
                        }
                      }}
                    >
                      <div
                        className={`font-rajdhani text-sm ${
                          index === selectedCommandIndex
                            ? "text-synthwave-neon-pink"
                            : "text-synthwave-neon-pink"
                        }`}
                      >
                        {cmd.command}
                      </div>
                      <div className="flex-1">
                        <div
                          className={`font-rajdhani text-sm ${
                            index === selectedCommandIndex
                              ? "text-white"
                              : "text-white"
                          }`}
                        >
                          {cmd.description}
                        </div>
                        <div
                          className={`font-rajdhani text-xs mt-1 ${
                            index === selectedCommandIndex
                              ? "text-synthwave-text-secondary"
                              : "text-synthwave-text-muted"
                          }`}
                        >
                          {cmd.example}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="font-rajdhani text-xs text-synthwave-text-muted mt-3 pt-2 border-t border-synthwave-neon-pink/20">
                  Use ↑↓ to navigate, Enter to select, Esc to close
                </div>
              </div>
            )}
          </div>

          {/* Voice/Send buttons */}
          <div className="flex items-center gap-2 self-end mb-[6px]">
            {inputMessage.trim() || selectedImages.length > 0 ? (
              <button
                type="submit"
                disabled={isTyping}
                className="w-12 h-12 bg-gradient-to-r from-synthwave-neon-purple to-synthwave-neon-pink text-white shadow-lg shadow-synthwave-neon-purple/30 hover:shadow-xl hover:shadow-synthwave-neon-purple/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shrink-0"
              >
                {isTyping ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <SendIcon />
                )}
              </button>
            ) : enableRecording ? (
              <button
                type="button"
                onMouseDown={handleStartRecording}
                onMouseUp={handleStopRecording}
                onMouseLeave={handleStopRecording}
                onTouchStart={handleStartRecording}
                onTouchEnd={handleStopRecording}
                disabled={isTyping}
                className={`w-12 h-12 transition-all transform hover:scale-105 active:scale-95 shadow-lg flex items-center justify-center shrink-0 ${
                  isRecording
                    ? "bg-red-500 text-white animate-pulse"
                    : "bg-synthwave-bg-primary/50 text-synthwave-text-secondary hover:bg-synthwave-neon-cyan/20 hover:text-synthwave-neon-cyan"
                } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
              >
                <MicIcon />
              </button>
            ) : (
              <button
                type="submit"
                disabled
                className="w-12 h-12 bg-synthwave-bg-primary/30 text-synthwave-text-muted shadow-lg flex items-center justify-center shrink-0 opacity-50 cursor-not-allowed"
              >
                <SendIcon />
              </button>
            )}
          </div>
        </form>

        {/* AI disclaimer and keyboard shortcuts */}
        <div className="flex items-center justify-between gap-2 mt-3 text-xs text-synthwave-text-muted font-rajdhani pr-12 md:pr-[74px]">
          {/* Left: AI disclaimer - aligned with text input left edge */}
          <div className="flex items-center">
            <span className="text-synthwave-text-muted/80">
              AI can make mistakes • Always verify important information
            </span>
          </div>
          {/* Right: Keyboard shortcuts - always visible */}
          <div className="flex items-center">
            {/* Desktop: Show keyboard shortcuts */}
            <span className="hidden md:inline">
              Press Enter to send • Shift+Enter for new line
            </span>
          </div>
        </div>
      </div>

      {/* Tips Popover - positioned above chat input */}
      {showTipsModal && tipsContent && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowTipsModal(false)}
          />

          {/* Tips Popover */}
          <div className="absolute bottom-full mb-4 left-1/2 transform -translate-x-1/2 z-50">
            <div className="bg-synthwave-bg-card/95 border border-synthwave-neon-cyan/20 shadow-xl shadow-synthwave-neon-cyan/20 flex flex-col w-96 h-[480px]">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-synthwave-neon-cyan/20 shrink-0">
                <h3 className="font-russo font-bold text-white text-sm uppercase">
                  {tipsTitle}
                </h3>
                <button
                  onClick={() => setShowTipsModal(false)}
                  className="text-synthwave-text-secondary hover:text-synthwave-neon-pink transition-colors duration-300 p-1 cursor-pointer"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    ></path>
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto synthwave-scrollbar-cyan">
                <div className="p-4">
                  <div className="space-y-4">
                    {tipsContent.items?.map((tip, index) => (
                      <div
                        key={index}
                        className={`${containerPatterns.minimalCardStatic} px-3 py-1`}
                      >
                        <div className="mb-2">
                          <h5 className="font-rajdhani text-base text-white font-medium">
                            {tip.title}
                          </h5>
                        </div>
                        <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                          {tip.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ChatInput;
