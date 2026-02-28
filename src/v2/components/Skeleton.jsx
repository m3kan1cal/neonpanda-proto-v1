import { loadingPatterns } from "../utils/uiPatterns";

/**
 * Shimmer skeleton loader lines.
 *
 * Props:
 *   lines — array of "short" | "mid" | "full" (default ["short","full","full","mid"])
 */
export function Skeleton({
  lines = ["short", "full", "full", "mid"],
  className = "",
}) {
  return (
    <div className={className}>
      {lines.map((size, i) => {
        const cls =
          size === "short"
            ? loadingPatterns.skeletonShort
            : size === "mid"
              ? loadingPatterns.skeletonMid
              : loadingPatterns.skeletonFull;
        return <div key={i} className={cls} />;
      })}
    </div>
  );
}

export default Skeleton;
