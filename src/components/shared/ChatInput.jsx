import React, { useState, useRef, useEffect } from 'react';
import { Tooltip } from 'react-tooltip';
import { inputPatterns, iconButtonPatterns, containerPatterns } from '../../utils/uiPatterns';
import {
  SendIcon,
  PlusIcon,
  CameraIcon,
  PaperclipIcon,
  SmileIcon,
  MicIcon,
  XIcon,
  TrashIcon
} from '../themes/SynthwaveComponents';

// Question mark icon for tips (standardized size)
const QuestionIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01" />
  </svg>
);

// Plus icon for quick actions button (standardized size)
const PlusIconLarge = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

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

  // Coach info
  coachName = "Coach",
  isOnline = true,

  // Action buttons configuration
  showDeleteButton = false,
  onDeleteClick = null,

  // Quick suggestions
  quickSuggestions = [],

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

  // Progress indicator (inline with quick suggestions)
  progressData = null
}) {
  // Internal state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showSlashCommandTooltip, setShowSlashCommandTooltip] = useState(false);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [showTipsModal, setShowTipsModal] = useState(false);
  const [showQuickActionsPopup, setShowQuickActionsPopup] = useState(false);
  const internalTextareaRef = useRef(null);
  const isSendingMessage = useRef(false);

  // Use provided ref or internal ref
  const activeTextareaRef = textareaRef || internalTextareaRef;

  // Auto-resize textarea logic
  const autoResizeTextarea = (textarea) => {
    if (!textarea) return;

    const minHeight = 48; // 3rem = 48px
    const maxHeight = 120; // Max 120px as per requirements

    // Get current height to avoid unnecessary changes
    const currentHeight = parseInt(textarea.style.height) || minHeight;

    // If textarea is disabled and input is empty, force reset to minimum
    if (textarea.disabled && !inputMessage.trim()) {
      textarea.style.height = minHeight + "px";
      textarea.style.overflowY = "hidden";
      return;
    }

    // Temporarily enable textarea to get accurate scrollHeight if needed
    const wasDisabled = textarea.disabled;
    if (wasDisabled) {
      textarea.disabled = false;
    }

    // Reset height to auto to get accurate scrollHeight measurement
    textarea.style.height = "auto";
    const scrollHeight = textarea.scrollHeight;

    // Restore disabled state
    if (wasDisabled) {
      textarea.disabled = true;
    }

    // Determine target height
    let targetHeight;
    let targetOverflow;

    if (scrollHeight <= minHeight) {
      targetHeight = minHeight;
      targetOverflow = "hidden";
    } else if (scrollHeight <= maxHeight) {
      targetHeight = scrollHeight;
      targetOverflow = "hidden";
    } else {
      targetHeight = maxHeight;
      targetOverflow = "auto";
    }

    // Always update height to ensure proper resizing (especially when shrinking)
    textarea.style.height = targetHeight + "px";
    textarea.style.overflowY = targetOverflow;
  };

  // Recording functions
  const handleStartRecording = () => {
    setIsRecording(true);
    setRecordingTime(0);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setRecordingTime(0);
  };

  // Format recording time
  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

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

  // Auto-resize when input message changes
  useEffect(() => {
    if (activeTextareaRef.current) {
      autoResizeTextarea(activeTextareaRef.current);
    }
  }, [inputMessage]);

  // Additional effect to ensure textarea resizes properly when typing stops
  useEffect(() => {
    if (activeTextareaRef.current && !isTyping) {
      // Small delay to ensure the textarea is re-enabled before resizing and refocusing
      setTimeout(() => {
        if (activeTextareaRef.current) {
          autoResizeTextarea(activeTextareaRef.current);
          // Refocus the textarea so user can immediately start typing
          activeTextareaRef.current.focus();
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

  // Handle Escape key and outside clicks for quick actions popup
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === "Escape" && showQuickActionsPopup) {
        setShowQuickActionsPopup(false);
      }
    };

    const handleClickOutside = (event) => {
      if (showQuickActionsPopup) {
        // Check if the click is outside the quick actions container
        const quickActionsContainer = document.querySelector("[data-quick-actions-container]");
        if (quickActionsContainer && !quickActionsContainer.contains(event.target)) {
          setShowQuickActionsPopup(false);
        }
      }
    };

    if (showQuickActionsPopup) {
      document.addEventListener("keydown", handleEscapeKey);
      document.addEventListener("click", handleClickOutside, true); // Use capture phase
    }

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
      document.removeEventListener("click", handleClickOutside, true);
    };
  }, [showQuickActionsPopup]);

  // Debug log for progress changes
  useEffect(() => {
    if (progressData) {
      console.info('ChatInput - Progress data updated:', progressData);
    }
  }, [progressData?.percentage, progressData?.questionsCompleted]);

  const handleSendMessage = async (e) => {
    e.preventDefault();

    // Prevent double execution from React StrictMode
    if (isSendingMessage.current || !inputMessage.trim()) return;

    isSendingMessage.current = true;
    const messageToSend = inputMessage.trim();
    setInputMessage("");

    // Refocus input and reset size after clearing it
    setTimeout(() => {
      if (activeTextareaRef.current) {
        // Force reset to minimum height after clearing content
        activeTextareaRef.current.style.height = "48px";
        activeTextareaRef.current.style.overflowY = "hidden";
        activeTextareaRef.current.focus();
        // Call autoResize to ensure proper state
        autoResizeTextarea(activeTextareaRef.current);
      }
    }, 50);

    try {
      await onSubmit(messageToSend);
    } catch (error) {
      console.error("Error sending message:", error);
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

  const handleKeyPress = (e) => {
    // Handle slash command navigation when tooltip is visible
    if (showSlashCommandTooltip && enableSlashCommands) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedCommandIndex((prev) =>
          prev < availableSlashCommands.length - 1 ? prev + 1 : 0
        );
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedCommandIndex((prev) =>
          prev > 0 ? prev - 1 : availableSlashCommands.length - 1
        );
        return;
      }

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const selectedCommand = availableSlashCommands[selectedCommandIndex];
        setInputMessage(selectedCommand.command + " ");
        setShowSlashCommandTooltip(false);
        if (onSlashCommandSelect) {
          onSlashCommandSelect(selectedCommand);
        }
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        setShowSlashCommandTooltip(false);
        return;
      }
    }

    // Default behavior for sending messages
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  // Update CSS custom property for chat input height
  React.useEffect(() => {
    const updateChatInputHeight = () => {
      const chatInputElement = document.querySelector('[data-chat-input-container]');
      if (chatInputElement) {
        const height = chatInputElement.offsetHeight;
        document.documentElement.style.setProperty('--chat-input-height', `${height}px`);
      }
    };

    // Update height on mount and when content changes
    updateChatInputHeight();

    // Use ResizeObserver to track height changes
    const chatInputElement = document.querySelector('[data-chat-input-container]');
    if (chatInputElement) {
      const resizeObserver = new ResizeObserver(updateChatInputHeight);
      resizeObserver.observe(chatInputElement);

      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [inputMessage, isRecording, showTipsModal, showQuickActionsPopup]);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-synthwave-bg-card/95 backdrop-blur-lg border-t-2 border-synthwave-neon-pink/30 shadow-lg shadow-synthwave-neon-pink/20 z-50"
      data-chat-input-container
    >
      <div className="max-w-7xl mx-auto px-8 py-6">
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
                className="ml-2 hover:bg-red-600 rounded-full p-1 transition-colors"
              >
                <XIcon />
              </button>
            </div>
          </div>
        )}

        {/* Input area */}
        <form onSubmit={handleSendMessage} className="flex items-end gap-3">
          {/* Action buttons */}
          <div className="flex items-center gap-2 relative self-start" style={{marginTop: '4px'}}>
            {/* Tips button */}
            {showTipsButton && tipsContent && (
              <button
                type="button"
                onClick={() => setShowTipsModal(true)}
                className={iconButtonPatterns.actionSmallCyan}
                data-tooltip-id="tips-tooltip"
                data-tooltip-content={tipsTitle}
                data-tooltip-place="top"
              >
                <QuestionIcon />
              </button>
            )}
            {/* Quick Actions button - only show if at least one attachment type is enabled */}
            {(enablePhotoAttachment || enableFileAttachment) && (
              <div className="relative" data-quick-actions-container>
                <button
                  type="button"
                  onClick={() => setShowQuickActionsPopup(!showQuickActionsPopup)}
                  className={`${iconButtonPatterns.actionSmallBlue} ${showQuickActionsPopup ? 'bg-blue-400/20 text-blue-400' : ''}`}
                  data-tooltip-id="quick-actions-tooltip"
                  data-tooltip-content="Quick actions"
                  data-tooltip-place="top"
                >
                  <PlusIconLarge />
                </button>

                {/* Quick Actions Popup */}
                {showQuickActionsPopup && (
                    <div className={`absolute bottom-full mb-2 left-0 w-56 z-50 ${containerPatterns.cardMediumOpaque}`}>
                      <div className="py-2">
                        {enablePhotoAttachment && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowQuickActionsPopup(false);
                              if (onPhotoAttachment) {
                                onPhotoAttachment();
                              }
                            }}
                            className="flex items-center space-x-3 px-4 py-2 font-rajdhani font-medium text-synthwave-text-primary hover:text-green-400 hover:bg-green-400/10 transition-all duration-300 w-full text-left"
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
                      </div>
                    </div>
                )}
              </div>
            )}
            {showDeleteButton && (
              <button
                type="button"
                onClick={onDeleteClick}
                disabled={isTyping}
                className={iconButtonPatterns.actionSmallPink}
                data-tooltip-id="delete-conversation-tooltip"
                data-tooltip-content="Delete conversation"
                data-tooltip-place="top"
              >
                <TrashIcon />
              </button>
            )}

            {/* React Tooltips */}
            {showTipsButton && tipsContent && (
              <Tooltip
                id="tips-tooltip"
                offset={8}
                delayShow={0}
                style={{
                  backgroundColor: '#000',
                  color: '#fff',
                  borderRadius: '8px',
                  fontFamily: 'Rajdhani',
                  fontSize: '14px',
                  padding: '8px 12px',
                  zIndex: 99999
                }}
              />
            )}
            {(enablePhotoAttachment || enableFileAttachment) && (
              <Tooltip
                id="quick-actions-tooltip"
                offset={8}
                delayShow={0}
                style={{
                  backgroundColor: '#000',
                  color: '#fff',
                  borderRadius: '8px',
                  fontFamily: 'Rajdhani',
                  fontSize: '14px',
                  padding: '8px 12px',
                  zIndex: 99999
                }}
              />
            )}
            {showDeleteButton && (
              <Tooltip
                id="delete-conversation-tooltip"
                offset={8}
                delayShow={0}
                style={{
                  backgroundColor: '#000',
                  color: '#fff',
                  borderRadius: '8px',
                  fontFamily: 'Rajdhani',
                  fontSize: '14px',
                  padding: '8px 12px',
                  zIndex: 99999
                }}
              />
            )}
          </div>

          {/* Text input */}
          <div className="flex-1 relative">
            <textarea
              ref={activeTextareaRef}
              value={inputMessage}
              onChange={(e) => {
                setInputMessage(e.target.value);
                autoResizeTextarea(e.target);
              }}
              onKeyDown={handleKeyPress}
              placeholder={placeholder}
              rows={1}
              className={`${inputPatterns.chatInput} custom-scrollbar`}
              style={{
                outline: "none !important",
                boxShadow: "none !important",
                WebkitTapHighlightColor: "transparent",
              }}
              disabled={isTyping}
            />
            <button
              type="button"
              className="absolute right-3 bottom-3 p-1.5 text-synthwave-text-secondary hover:text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/10 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-cyan/50"
              data-tooltip-id="emoji-tooltip"
              data-tooltip-content="Emojis"
              data-tooltip-place="top"
            >
              <SmileIcon />
            </button>
            <Tooltip
              id="emoji-tooltip"
              offset={8}
              delayShow={0}
              style={{
                backgroundColor: '#000',
                color: '#fff',
                borderRadius: '8px',
                fontFamily: 'Rajdhani',
                fontSize: '14px',
                padding: '8px 12px',
                zIndex: 99999
              }}
            />

            {/* Slash Command Tooltip */}
            {showSlashCommandTooltip && enableSlashCommands && (
              <div className="absolute bottom-full mb-2 left-0 bg-synthwave-bg-card/95 border-2 border-synthwave-neon-pink/30 rounded-lg p-4 shadow-lg backdrop-blur-sm z-10 min-w-[400px]">
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
                        if (activeTextareaRef.current) {
                          activeTextareaRef.current.focus();
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
          <div className="flex items-center gap-2">
            {inputMessage.trim() ? (
              <button
                type="submit"
                disabled={isTyping}
                className="p-4 bg-gradient-to-r from-synthwave-neon-purple to-synthwave-neon-pink text-white rounded-2xl shadow-lg shadow-synthwave-neon-purple/30 hover:shadow-xl hover:shadow-synthwave-neon-purple/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                data-tooltip-id="send-message-tooltip"
                data-tooltip-content={isTyping ? "Sending..." : "Send message (Enter)"}
                data-tooltip-place="top"
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
                className={`p-4 rounded-2xl transition-all transform hover:scale-105 active:scale-95 shadow-lg flex items-center justify-center ${
                  isRecording
                    ? "bg-red-500 text-white animate-pulse"
                    : "bg-synthwave-bg-primary/50 text-synthwave-text-secondary hover:bg-synthwave-neon-cyan/20 hover:text-synthwave-neon-cyan"
                }`}
                data-tooltip-id="voice-record-tooltip"
                data-tooltip-content={isRecording ? `Recording ${formatRecordingTime(recordingTime)}` : "Hold to record voice message"}
                data-tooltip-place="top"
              >
                <MicIcon />
              </button>
            ) : null}

            {/* React Tooltips for Voice/Send buttons */}
            <Tooltip
              id="send-message-tooltip"
              offset={8}
              delayShow={0}
              style={{
                backgroundColor: '#000',
                color: '#fff',
                borderRadius: '8px',
                fontFamily: 'Rajdhani',
                fontSize: '14px',
                padding: '8px 12px',
                zIndex: 99999
              }}
            />
            <Tooltip
              id="voice-record-tooltip"
              offset={8}
              delayShow={0}
              style={{
                backgroundColor: '#000',
                color: '#fff',
                borderRadius: '8px',
                fontFamily: 'Rajdhani',
                fontSize: '14px',
                padding: '8px 12px',
                zIndex: 99999
              }}
            />
          </div>
        </form>

        {/* Status/Tips */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-2 text-xs text-synthwave-text-muted font-rajdhani">
          <span className="text-center sm:text-left">
            {coachName} is{isOnline ? (
              <span className="text-green-400 ml-1">online and ready to help with your training</span>
            ) : (
              <span className="text-synthwave-text-secondary ml-1">away</span>
            )}
          </span>
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <span className="hidden sm:inline">
              Press Enter to send • Shift+Enter for new line
            </span>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500 animate-pulse" : "bg-gray-500"}`}></div>
              <span>{isOnline ? "Online" : "Away"}</span>
            </div>
          </div>
        </div>

        {/* Progress and Quick Topic Suggestions - Side by Side */}
        {(progressData || quickSuggestions.length > 0) && (
          <div className="mt-4 flex gap-4">
            {/* Left Half: Quick Suggestions */}
            <div className="flex-1">
              {quickSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {quickSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      className="bg-synthwave-bg-primary/30 border border-synthwave-neon-pink/30 text-synthwave-neon-pink px-3 py-1 rounded-full text-sm font-rajdhani hover:bg-synthwave-neon-pink/10 transition-colors duration-300"
                      onClick={() => setInputMessage(suggestion.message)}
                    >
                      {suggestion.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Half: Progress Indicator */}
            {progressData && (
              <div className="flex-1 max-w-xs">
                <div className="flex items-center justify-between">
                  <span className="font-rajdhani text-xs text-synthwave-text-muted">
                    Progress: {progressData.questionsCompleted}/{progressData.estimatedTotal}
                    {progressData.sophisticationLevel && progressData.sophisticationLevel !== 'UNKNOWN' && (
                      <span className="ml-1">({progressData.sophisticationLevel.toLowerCase()})</span>
                    )}
                  </span>
                  <span className="font-rajdhani text-xs text-synthwave-neon-cyan font-medium">
                    {progressData.percentage}%
                  </span>
                </div>

                {/* Small Cyan Progress Bar */}
                <div className="w-full bg-synthwave-bg-primary/50 rounded-full h-1.5 border border-synthwave-neon-cyan/20">
                  <div
                    className="bg-gradient-to-r from-synthwave-neon-cyan/60 to-synthwave-neon-cyan h-full rounded-full transition-all duration-500 shadow-synthwave-neon-cyan/10"
                    style={{ width: `${progressData.percentage}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        )}
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
            <div className="bg-synthwave-bg-card/95 border border-synthwave-neon-cyan/20 rounded-2xl shadow-xl shadow-synthwave-neon-cyan/20 flex flex-col w-96 h-[480px]">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-synthwave-neon-cyan/20 flex-shrink-0">
                <h3 className="font-russo font-bold text-white text-sm uppercase">
                  {tipsTitle}
                </h3>
                <button
                  onClick={() => setShowTipsModal(false)}
                  className="text-synthwave-text-secondary hover:text-synthwave-neon-pink transition-colors duration-300 p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto synthwave-scrollbar-cyan">
                <div className="p-4">
                  <div className="space-y-4">
                    {tipsContent.items?.map((tip, index) => (
                      <div key={index} className={`${containerPatterns.minimalCardStatic} px-3 py-1`}>
                        <div className="mb-2">
                          <h5 className="font-rajdhani text-base text-white font-medium">{tip.title}</h5>
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

      {/* Custom scrollbar styling for ChatInput textarea - used by all pages that import ChatInput */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(21, 23, 35, 0.5);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 20, 147, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 20, 147, 0.5);
        }
      `}</style>
    </div>
  );
}

export default ChatInput;
