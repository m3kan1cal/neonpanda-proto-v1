// Mobile sheet drag handle — swipe down to close.
// Uses Pointer Events with setPointerCapture so the gesture survives even if
// the finger drifts off the handle. We mutate the sheet's transform directly
// so the panel tracks the finger; on release we snap back or dismiss at a
// 64px threshold.

import React, { useRef, useState } from "react";

function MobileSheetDragHandle({
  sheetRef,
  requestClose,
  ariaLabel = "Drag down to close",
  // Optional callbacks letting the drawer fade its backdrop and reveal the
  // page underneath while the user is peeling the sheet down. All deltas are
  // pixels of downward drag (always >= 0); the parent decides how to map
  // those onto its own visual state.
  onDragStart,
  onDragMove,
  onDragEnd,
}) {
  const startY = useRef(null);
  const activeRef = useRef(false);
  const [dragging, setDragging] = useState(false);

  const finishDrag = (delta) => {
    const el = sheetRef?.current;
    activeRef.current = false;
    startY.current = null;
    setDragging(false);
    onDragEnd?.();

    if (delta > 64) {
      if (el) {
        el.style.transform = "";
        el.style.transition = "";
      }
      requestClose();
      return;
    }

    if (el) {
      el.style.transition = "transform 200ms ease-out";
      el.style.transform = "";
      const clear = () => {
        el.style.transition = "";
        el.removeEventListener("transitionend", clear);
      };
      el.addEventListener("transitionend", clear);
    }
  };

  const onPointerDown = (e) => {
    // Accept touch, pen, and mouse. Mouse coverage matters for desktop-browser
    // mobile preview (DevTools device mode / narrow viewport) so the handle
    // isn't dead to the cursor when reviewing the mobile layout.
    if (
      e.pointerType !== "touch" &&
      e.pointerType !== "pen" &&
      e.pointerType !== "mouse"
    )
      return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Capture can fail in rare browser states; the handler still works without it.
    }
    startY.current = e.clientY;
    activeRef.current = true;
    setDragging(true);
    onDragStart?.();
    const el = sheetRef?.current;
    if (el) {
      el.style.transition = "none";
      // Cancel any in-flight CSS keyframe animations (e.g. MoreMenu's
      // animate-slide-up). Keyframes sit above inline styles in the cascade
      // and would otherwise mask our transform updates during drag. Using
      // the Web Animations API avoids leaving an inline `animation: none`
      // style on the element, which would also affect consumers (like
      // ContextualChatDrawer) that have no keyframe to begin with.
      if (typeof el.getAnimations === "function") {
        el.getAnimations().forEach((anim) => anim.cancel());
      }
    }
  };

  const onPointerMove = (e) => {
    if (!activeRef.current || startY.current == null) return;
    const delta = e.clientY - startY.current;
    const el = sheetRef?.current;
    if (!el) return;
    el.style.transform = delta > 0 ? `translateY(${delta}px)` : "";
    onDragMove?.(Math.max(0, delta));
  };

  const onPointerUp = (e) => {
    if (!activeRef.current || startY.current == null) return;
    finishDrag(e.clientY - startY.current);
  };

  const onPointerCancel = () => {
    if (!activeRef.current) return;
    finishDrag(0);
  };

  return (
    <div
      role="button"
      aria-label={ariaLabel}
      tabIndex={0}
      className="relative flex justify-center pt-2.5 pb-2 shrink-0 touch-none select-none cursor-grab active:cursor-grabbing before:absolute before:inset-x-0 before:-top-4 before:h-6 before:content-[''] after:absolute after:inset-x-0 after:-bottom-3 after:h-3 after:content-['']"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <div
        className={`h-1.5 rounded-full transition-all duration-150 ${
          dragging
            ? "w-16 bg-synthwave-neon-cyan/80 shadow-[0_0_8px_rgba(34,211,238,0.55)]"
            : "w-12 bg-synthwave-text-muted/70"
        }`}
        aria-hidden
      />
    </div>
  );
}

export default MobileSheetDragHandle;
