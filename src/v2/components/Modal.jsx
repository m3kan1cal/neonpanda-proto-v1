import { modalPatterns } from "../utils/uiPatterns";

/**
 * Modal dialog panel.
 * This component renders the modal box itself; wrap it in a fixed overlay
 * (e.g. `fixed inset-0 flex items-center justify-center bg-black/60 z-50`)
 * in your page layer.
 *
 * Props:
 *   title    — modal title text
 *   onClose  — handler for the ESC / CLOSE button
 *   footer   — React node for the footer (typically buttons)
 *   children — modal body content
 */
export function Modal({
  title,
  onClose,
  footer,
  children,
  className = "",
  ...props
}) {
  return (
    <div className={`${modalPatterns.overlay} ${className}`.trim()} {...props}>
      {(title || onClose) && (
        <div className={modalPatterns.header}>
          {title && <div className={modalPatterns.title}>{title}</div>}
          {onClose && (
            <button className={modalPatterns.close} onClick={onClose}>
              ESC / CLOSE
            </button>
          )}
        </div>
      )}
      <div className={modalPatterns.body}>{children}</div>
      {footer && <div className={modalPatterns.footer}>{footer}</div>}
    </div>
  );
}

export default Modal;
