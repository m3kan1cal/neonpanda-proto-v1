import React, { useState, useRef, useEffect } from "react";
import { themeClasses } from "../../utils/synthwaveThemeClasses";
import { inputPatterns, scrollbarPatterns, injectScrollbarStyles } from "../../utils/ui/uiPatterns";
import CommandPaletteAgent from "../../utils/agents/CommandPaletteAgent";

const CommandPalette = ({
  isOpen,
  onClose,
  prefilledCommand = "",
  workoutAgent,
  userId,
  coachId,
  onNavigation,
}) => {
  const [input, setInput] = useState(prefilledCommand);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const agentRef = useRef(null);

  // Agent state
  const [agentState, setAgentState] = useState({
    isExecuting: false,
    executionResult: null,
    error: null,
    lastExecutedCommand: null,
  });

  // Mock commands for visual demonstration
  const mockCommands = [
    {
      id: "log-workout",
      trigger: "/log-workout",
      description: "Log a completed workout",
      example: "/log-workout I did Fran in 8:57",
      category: "workout",
      icon: "🏋️",
    },
    {
      id: "save-memory",
      trigger: "/save-memory",
      description: "Save a memory or note",
      example: "/save-memory I prefer morning workouts",
      category: "memory",
      icon: "💭",
    },
    {
      id: "start-conversation",
      trigger: "/start-conversation",
      description: "Start a new conversation with a coach",
      example: "/start-conversation I want to plan out my training week",
      category: "conversation",
      icon: "💬",
    },
  ];

  // Determine what to show based on input state
  const getDisplayState = () => {
    const trimmedInput = input.trim();

    // If empty or just starting to type a command, show all commands
    if (
      !trimmedInput ||
      (trimmedInput.startsWith("/") && !trimmedInput.includes(" "))
    ) {
      return {
        type: "command-list",
        commands: mockCommands.filter((cmd) =>
          cmd.trigger.toLowerCase().includes(trimmedInput.toLowerCase())
        ),
      };
    }

    // Check for exact command match without content (like "/start-conversation")
    const exactCommandMatch = mockCommands.find(cmd => cmd.trigger === trimmedInput);
    if (exactCommandMatch) {
      return {
        type: "execution-preview",
        command: exactCommandMatch,
        content: "", // No content - execute with empty string
      };
    }

    // If typing a complete command with content, show execution preview
    // Match: /command + space + anything (including emojis, UTF-8, newlines, special chars)
    // Using .match() with a simple split approach for maximum compatibility
    const spaceIndex = trimmedInput.indexOf(' ');
    if (spaceIndex > 0) {
      const command = trimmedInput.substring(0, spaceIndex);
      const content = trimmedInput.substring(spaceIndex + 1); // Everything after first space

      const matchedCommand = mockCommands.find(
        (cmd) => cmd.trigger === command
      );
      if (matchedCommand && content) {
        return {
          type: "execution-preview",
          command: matchedCommand,
          content: content.trim(),
        };
      }
    }

    // Default: show filtered commands
    return {
      type: "command-list",
      commands: mockCommands.filter(
        (cmd) =>
          cmd.trigger.toLowerCase().includes(trimmedInput.toLowerCase()) ||
          cmd.description.toLowerCase().includes(trimmedInput.toLowerCase())
      ),
    };
  };

  const displayState = getDisplayState();

  // Inject scrollbar styles
  useEffect(() => {
    injectScrollbarStyles();
  }, []);

  // Initialize agent
  useEffect(() => {
    if (!agentRef.current) {
      agentRef.current = new CommandPaletteAgent(
        userId,
        workoutAgent,
        (newState) => {
          setAgentState(newState);
        },
        onNavigation
      );
    } else {
      // Update agent when dependencies change
      agentRef.current.setUserId(userId);
      agentRef.current.setWorkoutAgent(workoutAgent);
    }

    return () => {
      if (agentRef.current) {
        agentRef.current.destroy();
        agentRef.current = null;
      }
    };
  }, [userId, workoutAgent]);

  // Execute command function (now just delegates to agent)
  const executeCommand = async (command, content) => {
    if (!agentRef.current) return;

    try {
      await agentRef.current.executeCommand(command, content, { coachId });
    } catch (error) {
      // Error is already handled by the agent
      console.error("Command execution failed:", error);
    }
  };

  // Auto-close on successful execution
  useEffect(() => {
    if (agentState.executionResult?.success) {
      // If the command triggered navigation, close immediately
      if (agentState.executionResult?.navigated) {
        onClose();
        agentRef.current?.clearExecutionResult();
      } else {
        // Otherwise, wait 2.5 seconds before closing
        const timer = setTimeout(() => {
          onClose();
          agentRef.current?.clearExecutionResult();
        }, 2500);
        return () => clearTimeout(timer);
      }
    }
  }, [agentState.executionResult?.success, agentState.executionResult?.navigated, onClose]);

  // Update input when prefilledCommand changes
  useEffect(() => {
    setInput(prefilledCommand);
  }, [prefilledCommand]);

  // Focus input when opened and reset agent state when closed
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Multiple focus attempts to ensure it works reliably
      const focusInput = () => {
        if (inputRef.current) {
          inputRef.current.focus();
          // Move cursor to end of input if there's content
          const length = inputRef.current.value.length;
          if (length > 0) {
            inputRef.current.setSelectionRange(length, length);
          }
        }
      };

      // Immediate focus
      focusInput();

      // Backup focus attempt after animation frame
      requestAnimationFrame(() => {
        focusInput();
      });

      // Final backup after a short delay
      const timeoutId = setTimeout(() => {
        focusInput();
      }, 100);

      return () => clearTimeout(timeoutId);
    }

    // Clear state when modal closes
    if (!isOpen) {
      if (agentRef.current) {
        agentRef.current.clearExecutionResult();
      }
      // Clear input field to ensure clean state on next open
      setInput("");
    }
  }, [isOpen]);

  // Handle escape key globally when command palette is open
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleGlobalKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [isOpen, onClose]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (displayState.type === "command-list") {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < displayState.commands.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : displayState.commands.length - 1
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (displayState.commands[selectedIndex]) {
          const command = displayState.commands[selectedIndex];

          // All commands now support optional content - just add space and let user type
          setInput(command.trigger + " ");
          setSelectedIndex(0);
          // Move cursor to end after setting input
          setTimeout(() => {
            if (inputRef.current) {
              inputRef.current.focus();
              inputRef.current.setSelectionRange(
                inputRef.current.value.length,
                inputRef.current.value.length
              );
            }
          }, 0);
        }
      }
    } else if (displayState.type === "execution-preview") {
      if (e.key === "Enter") {
        e.preventDefault();
        executeCommand(displayState.command, displayState.content);
      }
    }
  };

  // Reset selected index when display state changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [displayState.type, displayState.commands?.length]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Command Palette Container */}
      <div
        className={`relative mt-20 w-full max-w-2xl mx-4 ${themeClasses.neonBorder} bg-synthwave-bg-card/95 backdrop-blur-md rounded-lg shadow-2xl transform transition-all duration-300 ease-out`}
        style={{
          animation: isOpen
            ? "slideDown 0.3s ease-out"
            : "slideUp 0.3s ease-in",
        }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-synthwave-neon-pink/30">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 rounded-full bg-synthwave-neon-pink/20 flex items-center justify-center">
              <span className="text-synthwave-neon-pink text-sm">⚡</span>
            </div>
            <h2 className="font-russo text-lg text-white uppercase">
              Command Palette
            </h2>
          </div>
        </div>

        {/* Input Section */}
        <div className="p-6">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className={inputPatterns.commandInput}
            autoFocus
            autoComplete="off"
            style={{
              outline: "none !important",
              boxShadow: "none !important",
              WebkitTapHighlightColor: "transparent",
            }}
          />
        </div>

        {/* Command List View */}
        {displayState.type === "command-list" &&
          displayState.commands.length > 0 && (
            <div className="px-6 pb-6">
              <div className="font-rajdhani text-xs text-synthwave-text-secondary uppercase tracking-wider mb-3">
                Available Commands
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                {displayState.commands.map((command, index) => (
                  <div
                    key={command.id}
                    className={`flex items-start space-x-3 py-2 px-3 rounded cursor-pointer transition-colors duration-200 border ${
                      index === selectedIndex
                        ? "bg-synthwave-bg-primary/30 border-synthwave-neon-pink/20"
                        : "hover:bg-synthwave-bg-primary/30 border-transparent"
                    }`}
                    onClick={() => {
                      setInput(command.trigger + " ");
                      // Move cursor to end after setting input
                      setTimeout(() => {
                        if (inputRef.current) {
                          inputRef.current.focus();
                          inputRef.current.setSelectionRange(
                            inputRef.current.value.length,
                            inputRef.current.value.length
                          );
                        }
                      }, 0);
                    }}
                  >
                    <div
                      className={`font-rajdhani text-base ${
                        index === selectedIndex
                          ? "text-synthwave-neon-pink"
                          : "text-synthwave-neon-pink"
                      }`}
                    >
                      {command.trigger}
                    </div>
                    <div className="flex-1">
                      <div
                        className={`font-rajdhani text-base ${
                          index === selectedIndex ? "text-white" : "text-white"
                        }`}
                      >
                        {command.description}
                      </div>
                      <div
                        className={`font-rajdhani text-sm mt-1 ${
                          index === selectedIndex
                            ? "text-synthwave-text-secondary"
                            : "text-synthwave-text-muted"
                        }`}
                      >
                        {command.example}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* Execution Preview */}
        {displayState.type === "execution-preview" && (
          <div className="px-6 pb-6">
            <div className="font-rajdhani text-xs text-synthwave-text-secondary uppercase tracking-wider mb-3">
              Ready to Execute
            </div>
            <div className="space-y-3">
              {/* Command Info */}
              <div className="flex items-start space-x-3 py-2 px-3 rounded bg-synthwave-bg-primary/30 border border-synthwave-neon-pink/20">
                <div className="font-rajdhani text-base text-synthwave-neon-pink">
                  {displayState.command.trigger}
                </div>
                <div className="flex-1">
                  <div className="font-rajdhani text-base text-white">
                    {displayState.command.description}
                  </div>
                </div>
              </div>

              {/* Content Preview */}
              <div className="bg-synthwave-bg-primary/50 border border-synthwave-neon-cyan/20 rounded-lg p-4">
                <div className="font-rajdhani text-xs text-synthwave-text-secondary uppercase tracking-wider mb-2">
                  Content
                </div>
                <div className={`font-rajdhani text-sm text-white whitespace-pre-wrap max-h-40 overflow-y-auto ${scrollbarPatterns.cyan}`}>
                  {displayState.content}
                </div>
              </div>

              {/* Execution Status */}
              {agentState.isExecuting && (
                <div className="flex items-center space-x-3 py-3 px-3 rounded bg-synthwave-bg-primary/20 border border-synthwave-neon-cyan/30">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-synthwave-neon-cyan"></div>
                  <span className="text-synthwave-text-secondary font-rajdhani text-sm">
                    Executing command...
                  </span>
                </div>
              )}

              {agentState.executionResult && (
                <div
                  className={`py-3 px-3 rounded border ${
                    agentState.executionResult.success
                      ? "bg-synthwave-neon-cyan/10 border-synthwave-neon-cyan/30 text-synthwave-neon-cyan"
                      : "bg-red-900/20 border-red-500/30 text-red-400"
                  }`}
                >
                  <div className="font-rajdhani text-sm">
                    {agentState.executionResult.message}
                  </div>
                </div>
              )}

              {!agentState.isExecuting && !agentState.executionResult && (
                <div className="text-synthwave-text-muted font-rajdhani text-sm px-3">
                  Press Enter to execute
                </div>
              )}
            </div>
          </div>
        )}

        {/* No Results */}
        {displayState.type === "command-list" &&
          displayState.commands.length === 0 &&
          input && (
            <div className="px-6 pb-6">
              <div className="text-center py-8">
                <div className="text-synthwave-text-muted font-rajdhani text-lg">
                  No commands found for "{input}"
                </div>
                <div className="text-synthwave-text-muted font-rajdhani text-sm mt-2">
                  Try typing /log-workout or /save-memory
                </div>
              </div>
            </div>
          )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-synthwave-neon-pink/30 bg-synthwave-bg-primary/30">
          <div className="flex items-center justify-between text-xs font-rajdhani text-synthwave-text-muted">
            <div className="flex items-center space-x-4">
              <span>↑↓ Navigate</span>
              <span>↵ Execute</span>
              <span>Esc Close</span>
            </div>
            <div>Cmd+K to open anywhere</div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes slideUp {
          from {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
        }
      `}</style>
    </div>
  );
};

export default CommandPalette;
