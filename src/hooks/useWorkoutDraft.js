import { useState, useCallback, useRef, useEffect } from "react";

const DRAFT_KEY_PREFIX = "npWorkoutDraft";
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const DEBOUNCE_MS = 1000;

/**
 * useWorkoutDraft - Persists workout log editor content to localStorage
 * so users can leave the page mid-workout and return to find their progress.
 *
 * Storage key: npWorkoutDraft_{userId}_{templateId}
 * Drafts expire after 7 days. Stale entries are pruned on mount.
 *
 * @param {string} userId - The current user's ID
 * @returns {{ getDraft, saveDraft, clearDraft, lastSavedAt }}
 */
export function useWorkoutDraft(userId) {
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const debounceTimerRef = useRef(null);

  // Prune stale drafts on mount so localStorage doesn't accumulate indefinitely
  useEffect(() => {
    const now = Date.now();
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(DRAFT_KEY_PREFIX)) {
        try {
          const draft = JSON.parse(localStorage.getItem(key));
          if (
            !draft?.savedAt ||
            now - new Date(draft.savedAt).getTime() > DRAFT_TTL_MS
          ) {
            keysToRemove.push(key);
          }
        } catch {
          keysToRemove.push(key);
        }
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const buildKey = useCallback(
    (templateId) => `${DRAFT_KEY_PREFIX}_${userId}_${templateId}`,
    [userId]
  );

  const getDraft = useCallback(
    (templateId) => {
      try {
        const raw = localStorage.getItem(buildKey(templateId));
        if (!raw) return null;
        const draft = JSON.parse(raw);
        if (
          !draft?.savedAt ||
          Date.now() - new Date(draft.savedAt).getTime() > DRAFT_TTL_MS
        ) {
          localStorage.removeItem(buildKey(templateId));
          return null;
        }
        return draft;
      } catch {
        return null;
      }
    },
    [buildKey]
  );

  const saveDraft = useCallback(
    (templateId, content) => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        try {
          const draft = { content, savedAt: new Date().toISOString() };
          localStorage.setItem(buildKey(templateId), JSON.stringify(draft));
          setLastSavedAt(new Date());
        } catch {
          // localStorage may be unavailable or full — fail silently
        }
        debounceTimerRef.current = null;
      }, DEBOUNCE_MS);
    },
    [buildKey]
  );

  const clearDraft = useCallback(
    (templateId) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      try {
        localStorage.removeItem(buildKey(templateId));
      } catch {
        // fail silently
      }
      setLastSavedAt(null);
    },
    [buildKey]
  );

  return { getDraft, saveDraft, clearDraft, lastSavedAt, setLastSavedAt };
}
