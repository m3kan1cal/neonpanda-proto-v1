import { miscPatterns } from "../utils/uiPatterns";

/**
 * Keyboard key label.
 * Usage: <Kbd>ESC</Kbd>  <Kbd>⌘ K</Kbd>  <Kbd>ENTER</Kbd>
 */
export function Kbd({ children, className = "", ...props }) {
  return (
    <kbd className={`${miscPatterns.kbd} ${className}`.trim()} {...props}>
      {children}
    </kbd>
  );
}

export default Kbd;
