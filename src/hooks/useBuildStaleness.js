import { useCallback, useEffect, useRef, useState } from "react";
import {
  BUILD_META_URL,
  DEFAULT_POLL_INTERVAL_MS,
  isSnoozed,
  isStale,
  parseBuildMeta,
  writeSnooze,
} from "../utils/buildStaleness.js";
import { logger } from "../utils/logger.js";

/** Vite `define` injects this at build time. See `vite.config.js`. */
const LOCAL_BUILD_ID = typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "";

/**
 * Detect when the deployed build is newer than this tab.
 *
 * Returns `{ isStale, remoteBuildId, reload, snooze }`. Fetch failures are
 * swallowed so a flaky network never trips the UI, and the hook is a no-op
 * in dev to avoid pointing at a production meta file during local work.
 */
export function useBuildStaleness({
  url = BUILD_META_URL,
  intervalMs = DEFAULT_POLL_INTERVAL_MS,
  enabled = !import.meta.env.DEV,
} = {}) {
  const [remoteBuildId, setRemoteBuildId] = useState(null);
  const [stale, setStale] = useState(false);

  const mountedRef = useRef(true);
  const inFlightRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const check = useCallback(async () => {
    if (!enabled || inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const response = await fetch(url, {
        cache: "no-store",
        credentials: "omit",
      });
      if (!response.ok) return;
      const json = await response.json();
      const meta = parseBuildMeta(json);
      if (!meta) return;
      if (!mountedRef.current) return;

      setRemoteBuildId(meta.buildId);

      const staleNow = isStale(meta.buildId, LOCAL_BUILD_ID);
      if (!staleNow) {
        setStale(false);
        return;
      }
      if (isSnoozed(meta.buildId)) {
        setStale(false);
        return;
      }
      setStale(true);
    } catch (error) {
      logger.debug("useBuildStaleness: check failed", error);
    } finally {
      inFlightRef.current = false;
    }
  }, [enabled, url]);

  useEffect(() => {
    if (!enabled) return undefined;

    check();

    const intervalId = window.setInterval(check, intervalMs);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") check();
    };
    const handleFocus = () => check();

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
    };
  }, [enabled, intervalMs, check]);

  const reload = useCallback(() => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }, []);

  const snooze = useCallback(() => {
    if (remoteBuildId) {
      writeSnooze(remoteBuildId);
    }
    setStale(false);
  }, [remoteBuildId]);

  return {
    isStale: stale,
    remoteBuildId,
    localBuildId: LOCAL_BUILD_ID,
    reload,
    snooze,
  };
}

export default useBuildStaleness;
