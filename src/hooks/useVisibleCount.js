import { useState, useLayoutEffect, useRef, useCallback } from "react";

/**
 * Measures how many children of a flex container fit on a single line.
 *
 * Algorithm: checks each child's right edge against the container's right edge.
 * The first child whose right edge exceeds the container marks the overflow boundary.
 *
 * IMPORTANT: The container must always render ALL items (not a pre-sliced subset)
 * so that measurement is accurate on both initial load and resize-to-wider events.
 * Use a hidden absolute-positioned measurement div in the parent component.
 *
 * @param {React.RefObject} containerRef - ref attached to the measurement container
 * @param {number} totalCount - total number of items (triggers re-measurement on change)
 * @returns {{ visibleCount: number }} - how many items fit on one line
 */
export function useVisibleCount(containerRef, totalCount) {
  const [visibleCount, setVisibleCount] = useState(totalCount);
  const observerRef = useRef(null);

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const children = Array.from(container.children);
    if (children.length === 0) {
      setVisibleCount(0);
      return;
    }

    const containerRight = container.getBoundingClientRect().right;
    let count = children.length;

    for (let i = 0; i < children.length; i++) {
      const childRight = children[i].getBoundingClientRect().right;
      // 2px tolerance for sub-pixel rounding
      if (childRight > containerRight + 2) {
        count = i;
        break;
      }
    }

    setVisibleCount(count);
  }, [containerRef]);

  useLayoutEffect(() => {
    measure();

    const container = containerRef.current;
    if (!container) return;

    observerRef.current = new ResizeObserver(() => {
      measure();
    });

    observerRef.current.observe(container);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [containerRef, measure, totalCount]);

  return { visibleCount };
}
