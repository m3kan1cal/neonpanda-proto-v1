import { breadcrumbPatterns } from "../utils/uiPatterns";

/**
 * Breadcrumb navigation trail.
 *
 * Props:
 *   items — array of { label, href?, onClick? }. Last item is rendered as "current".
 *   sep   — separator character (default "/")
 */
export function Breadcrumb({ items = [], sep = "/", className = "" }) {
  return (
    <nav className={`${breadcrumbPatterns.container} ${className}`.trim()}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} style={{ display: "contents" }}>
            {isLast ? (
              <span className={breadcrumbPatterns.current}>{item.label}</span>
            ) : (
              <>
                <a
                  className={breadcrumbPatterns.link}
                  href={item.href}
                  onClick={item.onClick}
                >
                  {item.label}
                </a>
                <span className={breadcrumbPatterns.sep}>{sep}</span>
              </>
            )}
          </span>
        );
      })}
    </nav>
  );
}

export default Breadcrumb;
