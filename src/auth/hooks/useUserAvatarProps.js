import { useAuth } from "../contexts/AuthContext";
import { getUserDisplayName } from "../utils/authHelpers";

/**
 * Single source of truth for deriving the user's display props
 * (initial, email, full display name) used by avatar/Gravatar
 * components. Mirrors the fallback chain previously copy-pasted
 * across the contextual chat drawer callers and CoachConversations.
 */
export function useUserAvatarProps() {
  const { user, userProfile } = useAuth();
  const attributes = user?.attributes;

  const userInitial =
    attributes?.preferred_username?.charAt(0).toUpperCase() ||
    user?.username?.charAt(0).toUpperCase() ||
    "U";

  const userEmail = attributes?.email;

  const userDisplayName =
    userProfile?.displayName ||
    (attributes ? getUserDisplayName({ attributes }) : "User");

  return { userInitial, userEmail, userDisplayName };
}
