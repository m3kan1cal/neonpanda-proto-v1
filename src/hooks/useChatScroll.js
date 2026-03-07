import { useRef, useEffect, useCallback, useState } from "react";

/**
 * Custom hook to manage chat scroll behavior across multiple components.
 * Handles initial load scrolling, auto-scroll during streaming, and scroll button visibility.
 *
 * @param {Object} agentState - The agent state containing messages, streaming status, etc.
 * @param {Array} dependencyProps - Properties that should trigger scroll (e.g., messages, contextualUpdate, etc.)
 * @returns {Object} - { scrollToBottom, showScrollButton, messagesEndRef }
 */
export function useChatScroll(agentState, dependencyProps = []) {
  const messagesEndRef = useRef(null);
  const hasScrolledOnLoad = useRef(false);
  const lastScrollTimeRef = useRef(0);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Disable browser scroll restoration to prevent stale scroll positions on refresh.
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    return () => {
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "auto";
      }
    };
  }, []);

  const scrollToBottom = useCallback(
    (instant = false) => {
      // During streaming, always use instant scroll to prevent animation interruption
      const isStreaming = agentState.isStreaming || agentState.streamingMessage;
      const shouldUseInstant = instant || isStreaming;

      messagesEndRef.current?.scrollIntoView({
        behavior: shouldUseInstant ? "auto" : "smooth",
      });
    },
    [agentState.isStreaming, agentState.streamingMessage],
  );

  // Handle scroll events to show/hide scroll button.
  // The page uses min-h-screen so the window scrolls, not the messages container.
  const handleScroll = useCallback(() => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = window.innerHeight;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isNearBottom = distanceFromBottom < 100;
    const hasScrollableContent = scrollHeight > clientHeight;

    setShowScrollButton(hasScrollableContent && !isNearBottom);
  }, []);

  // Auto-scroll to bottom when new messages arrive.
  // On initial load (!hasScrolledOnLoad.current) we bypass the showScrollButton guard
  // because the loading skeleton can make the page scrollable before messages arrive,
  // causing checkScroll to set showScrollButton=true and block the first scroll entirely.
  useEffect(() => {
    const isInitialLoad = !hasScrolledOnLoad.current;
    if (isInitialLoad || !showScrollButton) {
      const isStreaming = agentState.isStreaming || agentState.streamingMessage;

      // Mark initial load as complete once we have messages, so user scroll respects showScrollButton
      if (agentState.messages?.length > 0 && isInitialLoad) {
        hasScrolledOnLoad.current = true;
      }

      // Throttle scroll during streaming to ~100ms intervals
      if (isStreaming) {
        const now = Date.now();
        const timeSinceLastScroll = now - lastScrollTimeRef.current;

        if (timeSinceLastScroll >= 100) {
          lastScrollTimeRef.current = now;
          scrollToBottom();
        }
      } else {
        // Use instant scroll on initial page load so the page snaps to the bottom
        // consistently. After that, use smooth scroll for new messages arriving
        // during the session so it feels natural.
        const instant = !hasScrolledOnLoad.current;
        scrollToBottom(instant);
      }
    }
  }, [
    showScrollButton,
    scrollToBottom,
    agentState.isStreaming,
    agentState.streamingMessage,
    ...dependencyProps,
  ]);

  // Set up scroll event listener on window (page scrolls, not container)
  useEffect(() => {
    const checkScroll = () => {
      handleScroll();
    };

    window.addEventListener("scroll", checkScroll);
    // Check initial scroll position
    const timeout1 = setTimeout(checkScroll, 100);
    const timeout2 = setTimeout(checkScroll, 500);
    const timeout3 = setTimeout(checkScroll, 1000);

    return () => {
      window.removeEventListener("scroll", checkScroll);
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
    };
  }, [handleScroll, agentState.messages?.length]);

  return {
    scrollToBottom,
    showScrollButton,
    messagesEndRef,
  };
}
