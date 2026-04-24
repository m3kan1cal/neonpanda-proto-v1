import React, { useEffect } from "react";
import Footer from "../shared/Footer";
import { usePageSEO } from "../../hooks/usePageSEO";
import {
  statusLabel,
  formatPublishedDate,
  statusPillClass,
} from "../../data/whitePapers";

// Scoped paper stylesheet — injected once per page via the <style> tag below.
// Every rule is namespaced under .white-paper-root so the paper design does
// not leak into the surrounding synthwave app chrome. The typography tokens
// (Inter / Barlow / IBM Plex Mono) are already loaded globally via src/index.css;
// we apply them here explicitly so the paper renders correctly even if a
// future global change removes them.
const PAPER_CSS = `
.white-paper-root {
  --ink: #0a0a0a;
  --ink-soft: #3a3a3a;
  --ink-quiet: #666;
  --line: #e6e6e6;
  --panel: #fafafa;
  --cyan: #00b8b8;
  --cyan-bright: #00ffff;
  --pink: #ff10f0;
  --pink-soft: #ffe6fb;
  --lime: #39ff14;
  --accent-bg: #f5fdfd;
  --radius: 14px;
  --maxw: 780px;

  background: #fff;
  color: var(--ink);
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  line-height: 1.65;
  font-size: 17.5px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
.white-paper-root *,
.white-paper-root *::before,
.white-paper-root *::after { box-sizing: border-box; }
.white-paper-root .wp-wrap {
  max-width: var(--maxw);
  margin: 0 auto;
  padding: 48px 28px 80px;
}
.white-paper-root .site-header-logo {
  text-align: center;
  margin: 0 0 22px;
  padding: 14px 16px 12px;
  border-radius: 12px;
  background: linear-gradient(135deg, #0d0a1a 0%, #1a0d2e 42%, #2a1a4a 100%);
  border: 1px solid rgba(0, 255, 255, 0.18);
  box-shadow: 0 0 0 1px rgba(159, 0, 255, 0.1) inset, 0 8px 28px rgba(13, 10, 26, 0.28);
}
.white-paper-root .site-header-logo a { display: inline-block; line-height: 0; }
.white-paper-root .site-header-logo img { width: min(168px, 68vw); height: auto; }
.white-paper-root .footer-brand {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0;
  padding: 8px 10px 9px;
  border-radius: 10px;
  background: linear-gradient(135deg, #0d0a1a 0%, #1a0d2e 55%, #1e1e2e 100%);
  border: 1px solid rgba(0, 255, 255, 0.15);
  box-shadow: 0 6px 20px rgba(13, 10, 26, 0.18);
}
.white-paper-root .footer-brand a { display: inline-block; line-height: 0; }
.white-paper-root .footer-brand img { width: min(152px, 52vw); height: auto; }
.white-paper-root .kicker {
  font-family: "Barlow", sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-weight: 700;
  font-size: 13px;
  color: var(--cyan);
  margin-bottom: 14px;
}
.white-paper-root h1 {
  font-family: "Barlow", sans-serif;
  font-weight: 800;
  font-size: 39px;
  line-height: 1.15;
  letter-spacing: -0.01em;
  margin: 0 0 14px;
  color: var(--ink);
}
.white-paper-root .subtitle {
  font-size: 20px;
  color: var(--ink-soft);
  font-weight: 500;
  margin: 0 0 36px;
  line-height: 1.45;
}
.white-paper-root h2 {
  font-family: "Barlow", sans-serif;
  font-weight: 700;
  font-size: 27px;
  letter-spacing: -0.005em;
  margin: 48px 0 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid var(--line);
  color: var(--ink);
}
.white-paper-root h3 {
  font-family: "Barlow", sans-serif;
  font-weight: 700;
  font-size: 20px;
  margin: 32px 0 10px;
  color: var(--ink);
}
.white-paper-root .beat-title {
  font-family: "Barlow", sans-serif;
  font-weight: 700;
  font-size: 17.5px;
  letter-spacing: 0.01em;
  color: var(--ink);
  display: block;
  margin-bottom: 4px;
}
.white-paper-root .beat-num {
  color: var(--cyan);
  font-family: "Barlow", sans-serif;
  font-weight: 800;
  margin-right: 6px;
}
.white-paper-root p { margin: 0 0 16px; }
.white-paper-root ul,
.white-paper-root ol { padding-left: 22px; margin: 0 0 18px; }
.white-paper-root li { margin-bottom: 8px; }
.white-paper-root strong { color: var(--ink); font-weight: 600; }
.white-paper-root em { font-style: italic; }
.white-paper-root a { color: inherit; }
.white-paper-root code {
  font-family: "IBM Plex Mono", "SFMono-Regular", Menlo, Consolas, monospace;
  font-size: 14.5px;
  background: #f3f3f3;
  padding: 1px 5px;
  border-radius: 4px;
}
.white-paper-root .doc-meta {
  font-family: "IBM Plex Mono", "SFMono-Regular", Menlo, Consolas, monospace;
  font-size: 13.5px;
  color: var(--ink-quiet);
  margin: 0 0 22px;
  line-height: 1.5;
}
.white-paper-root .share-card {
  background: var(--accent-bg);
  border: 1px solid #c7f1f1;
  border-left: 4px solid var(--cyan);
  border-radius: var(--radius);
  padding: 28px 30px 22px;
  margin: 0 0 20px;
  position: relative;
}
.white-paper-root .share-card .kicker { color: var(--cyan); margin-bottom: 8px; }
.white-paper-root .share-card p.intro { font-size: 18px; line-height: 1.55; margin-bottom: 18px; }
.white-paper-root .share-card ul { padding-left: 22px; }
.white-paper-root .share-card li { margin-bottom: 10px; font-size: 16.5px; }
.white-paper-root .share-card li ul { margin-top: 8px; }
.white-paper-root .share-card .note {
  font-size: 14px;
  color: var(--ink-quiet);
  font-style: italic;
  margin-top: 14px;
  margin-bottom: 0;
}
.white-paper-root .callout-card {
  background: linear-gradient(135deg, #fff8fd 0%, var(--pink-soft) 45%, #fff5fb 100%);
  border: 1px solid rgba(255, 16, 240, 0.22);
  border-left: 4px solid var(--pink);
  border-radius: var(--radius);
  padding: 24px 28px 22px;
  margin: 28px 0;
  box-shadow: 0 10px 32px rgba(255, 16, 240, 0.07);
}
.white-paper-root .callout-card .kicker {
  font-family: "Barlow", sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-weight: 700;
  font-size: 13px;
  color: #c4006b;
  margin-bottom: 12px;
}
.white-paper-root .callout-card p.intro {
  font-size: 18px;
  line-height: 1.55;
  margin: 0 0 12px;
  color: var(--ink-soft);
}
.white-paper-root .callout-card p.intro:last-child { margin-bottom: 0; }
.white-paper-root .ataglance {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 20px 26px;
  margin-bottom: 24px;
}
.white-paper-root .ataglance ul { margin: 0; }
.white-paper-root .ataglance li { font-size: 16.5px; }
.white-paper-root blockquote {
  margin: 18px 0;
  padding: 14px 20px;
  border-left: 3px solid var(--pink);
  background: var(--pink-soft);
  border-radius: 0 10px 10px 0;
  color: var(--ink);
  font-size: 17px;
  font-style: italic;
}
.white-paper-root blockquote.quiet {
  border-left-color: var(--cyan);
  background: var(--accent-bg);
}
.white-paper-root blockquote .attrib {
  display: block;
  font-style: normal;
  color: var(--ink-quiet);
  font-size: 14.5px;
  margin-top: 8px;
}
.white-paper-root .method {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 18px 24px;
  font-size: 15.5px;
  color: var(--ink-soft);
}
.white-paper-root .method h3 { margin-top: 0; }
.white-paper-root .method ul li { margin-bottom: 6px; }
.white-paper-root hr {
  border: 0;
  border-top: 1px solid var(--line);
  margin: 44px 0;
}
.white-paper-root .pullquotes blockquote {
  font-size: 17.5px;
  font-style: italic;
  background: #fff;
  border-left: 3px solid var(--cyan);
  padding: 10px 18px;
}
.white-paper-root .wp-page-footer {
  margin-top: 60px;
  padding-top: 22px;
  border-top: 1px solid var(--line);
  font-size: 13.5px;
  color: var(--ink-quiet);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.white-paper-root .footer-tags {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.white-paper-root .footer-type-tag,
.white-paper-root .status-pill {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-family: "Barlow", sans-serif;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-size: 12px;
}
.white-paper-root .footer-type-tag { background: #d4f4f4; color: #045a5a; }
.white-paper-root .status-pill.published { background: #e8f8f0; color: #0d5c3d; border: 1px solid rgba(13, 92, 61, 0.18); }
.white-paper-root .status-pill.approved { background: #e3f2e4; color: #1b5e20; }
.white-paper-root .status-pill.draft { background: var(--pink-soft); color: #8a0072; }
.white-paper-root .status-pill.internal { background: #eceff1; color: #455a64; border: 1px solid #cfd8dc; }
.white-paper-root .subject-portrait {
  margin: 0 0 28px;
  text-align: center;
}
.white-paper-root .subject-portrait figure { margin: 0 auto; max-width: 300px; }
.white-paper-root .subject-portrait img {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 14px;
  border: 1px solid var(--line);
  box-shadow: 0 10px 28px rgba(13, 10, 26, 0.1);
}
.white-paper-root .subject-portrait figcaption {
  margin-top: 10px;
  font-size: 14px;
  line-height: 1.45;
  color: var(--ink-quiet);
  font-style: italic;
  text-align: center;
  max-width: 320px;
  margin-left: auto;
  margin-right: auto;
}
@media (max-width: 520px) {
  .white-paper-root .wp-wrap { padding: 32px 18px 60px; }
  .white-paper-root h1 { font-size: 31px; }
  .white-paper-root .subtitle { font-size: 18px; }
  .white-paper-root h2 { font-size: 23px; }
}
`;

/**
 * Shared layout for every white paper route. Provides:
 *   - the panda-head site header
 *   - kicker line ("Use-case white paper · {Status}")
 *   - h1 + subtitle + doc-meta row
 *   - the scoped paper stylesheet
 *   - a footer brand strip + type/status pills
 *   - the site-level <Footer /> after the white surface
 *
 * Per-paper components pass their body as `children`.
 */
function WhitePaperLayout({
  paper,
  docMeta,
  portrait,
  headline,
  deck,
  children,
}) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [paper?.slug]);

  usePageSEO({
    pageTitle: `${paper?.title} — NeonPanda`,
    description: paper?.description,
    canonicalHref: `https://neonpanda.ai/white-papers/${paper?.slug}`,
    ogType: "article",
  });

  if (!paper) {
    return null;
  }

  const kickerText = `Use-case white paper · ${statusLabel(paper.status)}`;

  const defaultDocMeta =
    paper.status === "published"
      ? `Published ${formatPublishedDate(paper.publishedAt)} · NeonPanda, LLC · ${paper.readTime}`
      : null;

  return (
    <>
      <style>{PAPER_CSS}</style>
      <div className="white-paper-root">
        <main className="wp-wrap">
          <header className="site-header-logo">
            <a href="https://neonpanda.ai" aria-label="NeonPanda home">
              <img src="/images/logo-dark-sm-head.webp" alt="NeonPanda" />
            </a>
          </header>

          <div className="kicker">{kickerText}</div>

          {docMeta ? (
            <p className="doc-meta">{docMeta}</p>
          ) : defaultDocMeta ? (
            <p className="doc-meta">{defaultDocMeta}</p>
          ) : null}

          <h1>{headline ?? paper.title}</h1>
          <p className="subtitle">{deck ?? paper.subtitle}</p>

          {portrait}

          {children}

          <div className="wp-page-footer">
            <div className="footer-brand">
              <a href="https://neonpanda.ai" aria-label="NeonPanda home">
                <img src="/images/logo-dark-sm.webp" alt="NeonPanda" />
              </a>
            </div>
            <div className="footer-tags">
              <span className="footer-type-tag">Use-case white paper</span>
              <span className={`status-pill ${statusPillClass(paper.status)}`}>
                {statusLabel(paper.status)}
              </span>
            </div>
          </div>
        </main>
      </div>
      <Footer />
    </>
  );
}

export default WhitePaperLayout;
