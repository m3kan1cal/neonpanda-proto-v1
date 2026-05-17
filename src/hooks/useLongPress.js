import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_LONG_PRESS_MS = 600;
const MOVE_CANCEL_THRESHOLD_PX = 10;
// After a touch ends, browsers synthesize a compatibility mouse sequence
// (mousedown → mouseup → click) on the target. Ignore mouse-side handlers
// inside this window so they can't (a) start a duplicate long-press timer
// or (b) clobber a suppression flag set by the touch long-press before the
// trailing synth click consumes it.
const GHOST_MOUSE_WINDOW_MS = 500;

/**
 * Cross-platform long-press hook. Returns a handler bag to spread on the
 * target element plus an `isPressing` flag for visual feedback and a
 * `consumeClick()` helper to suppress the click that follows a successful
 * long-press (so onClick navigation doesn't also fire).
 *
 * Cancels on touchmove beyond ~10px (preserves scrolling), touchcancel,
 * mouseleave, or release before the threshold.
 *
 * @param {Function} onLongPress - Called when the press exceeds delayMs.
 * @param {Object} [options]
 * @param {number} [options.delayMs=600] - Hold duration to trigger.
 * @param {boolean} [options.disabled=false] - When true, hook is a no-op.
 */
export function useLongPress(onLongPress, options = {}) {
  const { delayMs = DEFAULT_LONG_PRESS_MS, disabled = false } = options;

  const [isPressing, setIsPressing] = useState(false);
  const timerRef = useRef(null);
  const startPosRef = useRef(null);
  const suppressClickRef = useRef(false);
  const lastTouchEndAtRef = useRef(0);

  const isGhostMouse = () =>
    Date.now() - lastTouchEndAtRef.current < GHOST_MOUSE_WINDOW_MS;

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsPressing(false);
    startPosRef.current = null;
  }, []);

  // Cancel any pending long-press timer if the host element unmounts mid-press
  // (e.g., the calendar view toggles or the user navigates away). Without this
  // the timer would still fire and invoke onLongPress on a defunct component.
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const start = useCallback(
    (clientX, clientY) => {
      if (disabled) return;
      startPosRef.current = { x: clientX, y: clientY };
      setIsPressing(true);
      timerRef.current = setTimeout(() => {
        suppressClickRef.current = true;
        setIsPressing(false);
        timerRef.current = null;
        onLongPress();
      }, delayMs);
    },
    [delayMs, disabled, onLongPress],
  );

  const onMouseDown = useCallback(
    (event) => {
      if (event.button !== 0) return;
      if (isGhostMouse()) return;
      start(event.clientX, event.clientY);
    },
    [start],
  );

  const onMouseUp = useCallback(() => {
    if (isGhostMouse()) return;
    clear();
  }, [clear]);

  const onMouseLeave = useCallback(() => {
    if (isGhostMouse()) return;
    clear();
    // No `click` event will follow when the cursor leaves the element, so
    // consume any pending suppression here — otherwise the next real click
    // on this cell would be silently swallowed.
    suppressClickRef.current = false;
  }, [clear]);

  const onTouchStart = useCallback(
    (event) => {
      const touch = event.touches[0];
      if (!touch) return;
      start(touch.clientX, touch.clientY);
    },
    [start],
  );

  const onTouchMove = useCallback(
    (event) => {
      const touch = event.touches[0];
      if (!touch || !startPosRef.current) return;
      const dx = touch.clientX - startPosRef.current.x;
      const dy = touch.clientY - startPosRef.current.y;
      if (
        dx * dx + dy * dy >
        MOVE_CANCEL_THRESHOLD_PX * MOVE_CANCEL_THRESHOLD_PX
      ) {
        clear();
        // Treated as a scroll gesture — browser won't fire the trailing
        // click, so drop any pending suppression to avoid swallowing the
        // next real tap on this cell.
        suppressClickRef.current = false;
      }
    },
    [clear],
  );

  const onTouchEnd = useCallback(() => {
    lastTouchEndAtRef.current = Date.now();
    clear();
  }, [clear]);

  const onTouchCancel = useCallback(() => {
    lastTouchEndAtRef.current = Date.now();
    clear();
    // Cancelled touches don't produce a trailing click; clear suppression
    // so subsequent interactions aren't affected.
    suppressClickRef.current = false;
  }, [clear]);

  // Prevent the browser's native context menu (e.g., Android Chrome long-press
  // menu, desktop right-click) on elements wired for long-press. Calendar day
  // cells don't have a useful context menu of their own.
  const onContextMenu = useCallback(
    (event) => {
      if (!disabled) {
        event.preventDefault();
      }
    },
    [disabled],
  );

  /**
   * Call from the host element's onClick. Returns true if the click should be
   * ignored because a long-press just fired (and clears the suppress flag).
   */
  const consumeClick = useCallback(() => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return true;
    }
    return false;
  }, []);

  return {
    isPressing,
    consumeClick,
    handlers: {
      onMouseDown,
      onMouseUp,
      onMouseLeave,
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel,
      onContextMenu,
    },
  };
}

export default useLongPress;
