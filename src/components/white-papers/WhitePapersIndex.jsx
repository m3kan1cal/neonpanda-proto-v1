import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import Footer from "../shared/Footer";
import {
  getWhitePapersForHub,
  formatPublishedDate,
  statusLabel,
  statusPillClass,
} from "../../data/whitePapers";

// Scoped stylesheet for the hub. Mirrors the paper-style palette from
// WhitePaperLayout (Inter / Barlow / IBM Plex Mono on a white surface) so the
// hub and every individual paper feel like one body of work. Every rule is
// namespaced under .wp-hub-root so nothing leaks into the surrounding
// synthwave app chrome.
const HUB_CSS = `
.wp-hub-root {
  --ink: #0a0a0a;
  --ink-soft: #3a3a3a;
  --ink-quiet: #666;
  --line: #e6e6e6;
  --panel: #fafafa;
  --cyan: #00b8b8;
  --cyan-bright: #00ffff;
  --pink: #ff10f0;
  --pink-soft: #ffe6fb;
  --accent-bg: #f5fdfd;
  --radius: 14px;
  --maxw: 1040px;

  background: #fff;
  color: var(--ink);
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  line-height: 1.65;
  font-size: 17.5px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
.wp-hub-root *,
.wp-hub-root *::before,
.wp-hub-root *::after { box-sizing: border-box; }
.wp-hub-root .wp-hub-wrap {
  max-width: var(--maxw);
  margin: 0 auto;
  padding: 48px 28px 80px;
}
.wp-hub-root .site-header-logo {
  text-align: center;
  margin: 0 0 28px;
  padding: 14px 16px 12px;
  border-radius: 12px;
  background: linear-gradient(135deg, #0d0a1a 0%, #1a0d2e 42%, #2a1a4a 100%);
  border: 1px solid rgba(0, 255, 255, 0.18);
  box-shadow: 0 0 0 1px rgba(159, 0, 255, 0.1) inset,
    0 8px 28px rgba(13, 10, 26, 0.28);
}
.wp-hub-root .site-header-logo a { display: inline-block; line-height: 0; }
.wp-hub-root .site-header-logo img { width: min(168px, 68vw); height: auto; }
.wp-hub-root .hub-hero {
  margin: 0 auto 40px;
  text-align: left;
  max-width: 820px;
}
.wp-hub-root .hub-kicker {
  font-family: "Barlow", sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-weight: 700;
  font-size: 13px;
  color: var(--cyan);
  margin-bottom: 14px;
}
.wp-hub-root .hub-hero h1 {
  font-family: "Barlow", sans-serif;
  font-weight: 800;
  font-size: 44px;
  line-height: 1.12;
  letter-spacing: -0.01em;
  margin: 0 0 16px;
  color: var(--ink);
}
.wp-hub-root .hub-hero p.lede {
  font-size: 19px;
  color: var(--ink-soft);
  margin: 0;
  line-height: 1.5;
}
.wp-hub-root .hub-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  margin-top: 32px;
}
@media (min-width: 760px) {
  .wp-hub-root .hub-grid { grid-template-columns: 1fr 1fr; }
}
.wp-hub-root .hub-card {
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 24px 26px;
  text-decoration: none;
  color: inherit;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease;
  box-shadow: 0 1px 0 rgba(13, 10, 26, 0.02);
}
.wp-hub-root .hub-card:hover,
.wp-hub-root .hub-card:focus-visible {
  transform: translateY(-2px);
  border-color: rgba(0, 184, 184, 0.45);
  box-shadow: 0 12px 32px rgba(0, 184, 184, 0.09);
  outline: none;
}
.wp-hub-root .hub-card .card-kicker {
  font-family: "Barlow", sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-weight: 700;
  font-size: 12px;
  color: var(--cyan);
  margin-bottom: 10px;
}
.wp-hub-root .hub-card h2 {
  font-family: "Barlow", sans-serif;
  font-weight: 700;
  font-size: 22px;
  line-height: 1.25;
  letter-spacing: -0.005em;
  margin: 0 0 8px;
  color: var(--ink);
}
.wp-hub-root .hub-card .subtitle {
  font-size: 15.5px;
  color: var(--ink-soft);
  font-weight: 500;
  margin: 0 0 14px;
  line-height: 1.45;
}
.wp-hub-root .hub-card .description {
  font-size: 15.5px;
  color: var(--ink-soft);
  margin: 0 0 16px;
  line-height: 1.55;
}
.wp-hub-root .hub-card .meta {
  font-family: "IBM Plex Mono", "SFMono-Regular", Menlo, Consolas, monospace;
  font-size: 12.5px;
  color: var(--ink-quiet);
  margin: 0 0 14px;
  line-height: 1.5;
}
.wp-hub-root .hub-card .topics {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: auto;
}
.wp-hub-root .hub-card .topic-pill {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-family: "Barlow", sans-serif;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-size: 11px;
  background: var(--panel);
  color: var(--ink-soft);
  border: 1px solid var(--line);
}
.wp-hub-root .hub-card .read-more {
  margin-top: 16px;
  font-family: "Barlow", sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 700;
  font-size: 12.5px;
  color: var(--cyan);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.wp-hub-root .status-pill {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-family: "Barlow", sans-serif;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-size: 11px;
  margin-left: 8px;
}
.wp-hub-root .status-pill.published {
  background: #e8f8f0;
  color: #0d5c3d;
  border: 1px solid rgba(13, 92, 61, 0.18);
}
.wp-hub-root .status-pill.approved {
  background: #e3f2e4;
  color: #1b5e20;
}
.wp-hub-root .status-pill.draft {
  background: var(--pink-soft);
  color: #8a0072;
}
.wp-hub-root .status-pill.internal {
  background: #eceff1;
  color: #455a64;
  border: 1px solid #cfd8dc;
}
.wp-hub-root .hub-note {
  margin-top: 36px;
  padding: 18px 22px;
  border-radius: var(--radius);
  background: var(--panel);
  border: 1px solid var(--line);
  font-size: 14.5px;
  color: var(--ink-soft);
}
@media (max-width: 520px) {
  .wp-hub-root .wp-hub-wrap { padding: 32px 18px 60px; }
  .wp-hub-root .hub-hero h1 { font-size: 34px; }
  .wp-hub-root .hub-hero p.lede { font-size: 17px; }
}
`;

function useHubSEO() {
  useEffect(() => {
    const previousTitle = document.title;
    const pageTitle = "White Papers — NeonPanda";
    document.title = pageTitle;

    const description =
      "Real stories of athletes using NeonPanda — in-depth use-case white papers on meet prep, returning athletes, self-directed training, and constraint-heavy design.";
    const canonicalHref = "https://neonpanda.ai/white-papers";

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
        content: "website",
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
  }, []);
}

function WhitePapersIndex() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  useHubSEO();

  const papers = getWhitePapersForHub();

  return (
    <>
      <style>{HUB_CSS}</style>
      <div className="wp-hub-root">
        <main className="wp-hub-wrap">
          <header className="site-header-logo">
            <Link to="/" aria-label="NeonPanda home">
              <img src="/images/logo-dark-sm-head.webp" alt="NeonPanda" />
            </Link>
          </header>

          <section className="hub-hero">
            <div className="hub-kicker">Use-case white papers</div>
            <h1>Real athletes. Real logs. Real coaching relationships.</h1>
            <p className="lede">
              Longform case studies drawn directly from NeonPanda athlete data —
              powerlifting meet prep, returning-athlete comebacks, self-directed
              training, and constraint-heavy scheduling. Each paper walks
              through the numbers, the conversations, and the product mechanics
              underneath.
            </p>
          </section>

          <section className="hub-grid">
            {papers.map((paper) => (
              <Link
                key={paper.slug}
                to={`/white-papers/${paper.slug}`}
                className="hub-card"
              >
                <div className="card-kicker">
                  Use-case white paper
                  <span
                    className={`status-pill ${statusPillClass(paper.status)}`}
                  >
                    {statusLabel(paper.status)}
                  </span>
                </div>
                <h2>{paper.title}</h2>
                <p className="subtitle">{paper.subtitle}</p>
                <p className="description">{paper.description}</p>
                <p className="meta">
                  {paper.subject} · {formatPublishedDate(paper.publishedAt)}
                  {paper.readTime ? ` · ${paper.readTime}` : ""}
                </p>
                {paper.topics && paper.topics.length > 0 ? (
                  <div className="topics">
                    {paper.topics.map((topic) => (
                      <span key={topic} className="topic-pill">
                        {topic}
                      </span>
                    ))}
                  </div>
                ) : null}
                <span className="read-more" aria-hidden="true">
                  Read paper →
                </span>
              </Link>
            ))}
          </section>

          <div className="hub-note">
            Some papers above are still in subject review and aren't yet cleared
            for external sharing — the pill on each card shows its current
            consent status. Everything published here draws from a clean
            DynamoDB export and is verified against raw workout, memory, and
            conversation data.
          </div>
        </main>
      </div>
      <Footer />
    </>
  );
}

export default WhitePapersIndex;
