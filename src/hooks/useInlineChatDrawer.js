import { useState, useEffect, useCallback } from "react";
import { useNavigationContext } from "../contexts/NavigationContext";
import { useUserAvatarProps } from "../auth/hooks/useUserAvatarProps";

/**
 * Shared state machine for the contextual chat drawer used by the inline
 * `trainingGroundsInlineChat` variant. Centralizes the open/closed state, the
 * NavigationContext sync (so the mobile chrome hides while the drawer is
 * open), and the user avatar props every caller passes through to
 * ContextualChatDrawer. Per-surface bits (tag, session key, streamClientContext)
 * stay in the calling component because they vary in shape and dependencies.
 */
export function useInlineChatDrawer() {
  const { setIsInlineCoachDrawerOpen } = useNavigationContext();
  const { userInitial, userEmail, userDisplayName } = useUserAvatarProps();

  const [isOpen, setIsOpen] = useState(false);
  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    setIsInlineCoachDrawerOpen(isOpen);
    return () => setIsInlineCoachDrawerOpen(false);
  }, [isOpen, setIsInlineCoachDrawerOpen]);

  return {
    isOpen,
    setIsOpen,
    close,
    userInitial,
    userEmail,
    userDisplayName,
  };
}
