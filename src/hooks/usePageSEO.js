import { useEffect } from "react";

/**
 * Shared hook for managing page SEO metadata (title, meta description, OG tags,
 * canonical link). Sets all tags on mount and cleans them up on unmount by
 * restoring previous values or removing created tags.
 *
 * @param {Object} config
 * @param {string} config.pageTitle - Full page title (e.g., "Page Title — NeonPanda")
 * @param {string} config.description - Meta description content
 * @param {string} config.canonicalHref - Canonical URL
 * @param {string} config.ogType - Open Graph type (e.g., "article", "website")
 * @returns {void}
 */
export function usePageSEO({
  pageTitle,
  description,
  canonicalHref,
  ogType = "website",
}) {
  useEffect(() => {
    if (!pageTitle || !description || !canonicalHref) return undefined;

    const previousTitle = document.title;
    document.title = pageTitle;

    const upsertMeta = (selector, attrs) => {
      let tag = document.head.querySelector(selector);
      const created = !tag;
      const previousContent = tag ? tag.getAttribute("content") : null;
      if (!tag) {
        tag = document.createElement("meta");
        Object.entries(attrs).forEach(([key, value]) => {
          if (key !== "content") tag.setAttribute(key, value);
        });
        document.head.appendChild(tag);
      }
      if (attrs.content != null) tag.setAttribute("content", attrs.content);
      return { tag, created, previousContent };
    };

    const metas = [
      upsertMeta('meta[name="description"]', {
        name: "description",
        content: description,
      }),
      upsertMeta('meta[property="og:title"]', {
        property: "og:title",
        content: pageTitle,
      }),
      upsertMeta('meta[property="og:description"]', {
        property: "og:description",
        content: description,
      }),
      upsertMeta('meta[property="og:type"]', {
        property: "og:type",
        content: ogType,
      }),
      upsertMeta('meta[property="og:url"]', {
        property: "og:url",
        content: canonicalHref,
      }),
    ];

    let canonical = document.head.querySelector('link[rel="canonical"]');
    const canonicalCreated = !canonical;
    const previousCanonicalHref = canonical
      ? canonical.getAttribute("href")
      : null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", canonicalHref);

    return () => {
      document.title = previousTitle;
      metas.forEach(({ tag, created, previousContent }) => {
        if (created && tag.parentNode) {
          tag.parentNode.removeChild(tag);
        } else if (!created && previousContent != null) {
          tag.setAttribute("content", previousContent);
        }
      });
      if (canonicalCreated && canonical.parentNode) {
        canonical.parentNode.removeChild(canonical);
      } else if (canonical && previousCanonicalHref != null) {
        canonical.setAttribute("href", previousCanonicalHref);
      }
    };
  }, [pageTitle, description, canonicalHref, ogType]);
}
