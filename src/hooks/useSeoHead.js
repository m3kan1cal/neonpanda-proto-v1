import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE_ORIGIN = "https://neonpanda.ai";

/**
 * Upsert a <link> or <meta> tag in <head>.
 *
 * We keep this lightweight on purpose (no react-helmet) and reuse any existing
 * tag rendered by index.html so we don't produce duplicates. Tags created here
 * are marked with data-seo-head="1" to signal they were injected dynamically;
 * we don't remove them on unmount because the next page will immediately set
 * its own values via the same useEffect.
 */
const upsertTag = (selector, createEl, updateEl) => {
  if (typeof document === "undefined") return;
  let el = document.head.querySelector(selector);
  if (!el) {
    el = createEl();
    el.setAttribute("data-seo-head", "1");
    document.head.appendChild(el);
  }
  updateEl(el);
};

const buildCanonicalUrl = (pathname) => {
  if (!pathname || pathname === "/") return `${SITE_ORIGIN}/`;
  const trimmed = pathname.replace(/\/+$/, "");
  return `${SITE_ORIGIN}${trimmed}`;
};

/**
 * useSeoHead — keep <link rel="canonical">, <meta name="robots">, and
 * <meta name="description"> in sync with the current route.
 *
 * @param {Object} options
 * @param {string} [options.canonical]   Absolute URL. Defaults to the current pathname on neonpanda.ai.
 * @param {string} [options.robots]      Defaults to "index, follow".
 * @param {string} [options.description] Optional page-specific meta description.
 */
export const useSeoHead = ({ canonical, robots, description } = {}) => {
  const location = useLocation();

  useEffect(() => {
    const canonicalUrl = canonical || buildCanonicalUrl(location.pathname);
    const robotsValue = robots || "index, follow";

    upsertTag(
      'link[rel="canonical"]',
      () => {
        const link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        return link;
      },
      (el) => el.setAttribute("href", canonicalUrl),
    );

    upsertTag(
      'meta[name="robots"]',
      () => {
        const meta = document.createElement("meta");
        meta.setAttribute("name", "robots");
        return meta;
      },
      (el) => el.setAttribute("content", robotsValue),
    );

    if (description) {
      upsertTag(
        'meta[name="description"]',
        () => {
          const meta = document.createElement("meta");
          meta.setAttribute("name", "description");
          return meta;
        },
        (el) => el.setAttribute("content", description),
      );
    }
  }, [canonical, robots, description, location.pathname]);
};
