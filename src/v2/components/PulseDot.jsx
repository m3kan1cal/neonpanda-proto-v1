import { loadingPatterns } from "../utils/uiPatterns";

/**
 * Pulsing cyan indicator dot — used for live/online states.
 *
 * Props:
 *   size — CSS size value (default "8px"); overrides width/height inline
 */
export function PulseDot({ size, className = "", style = {}, ...props }) {
  const sizeStyle = size ? { width: size, height: size } : {};

  return (
    <div
      className={`${loadingPatterns.pulseDot} ${className}`.trim()}
      style={{ ...sizeStyle, ...style }}
      {...props}
    />
  );
}

export default PulseDot;
