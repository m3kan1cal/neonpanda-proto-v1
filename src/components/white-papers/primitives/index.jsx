import React from "react";

// Small, content-oriented primitives used by every white paper. They render
// the same semantic HTML the original static files used so the scoped paper
// stylesheet in WhitePaperLayout styles them without any extra work.

/**
 * Share-card "at-a-glance" summary. Children render inside a cyan-accented
 * panel with a "Shareable summary" kicker.
 */
export function ShareCard({ kicker = "Shareable summary", children }) {
  return (
    <section className="share-card">
      <div className="kicker">{kicker}</div>
      {children}
    </section>
  );
}

/**
 * Pink-accented callout panel. Children render below the kicker.
 */
export function Callout({ kicker, children }) {
  return (
    <section className="callout-card">
      {kicker ? <div className="kicker">{kicker}</div> : null}
      {children}
    </section>
  );
}

/**
 * "At a glance" neutral panel. Pass a <ul>{...}</ul> as children.
 */
export function AtAGlance({ children }) {
  return <div className="ataglance">{children}</div>;
}

/**
 * Method & limitations panel. Pass <li> items as children (the heading and
 * surrounding <ul> are provided).
 */
export function MethodLimitations({ children }) {
  return (
    <div className="method">
      <h3>Method &amp; limitations</h3>
      <ul>{children}</ul>
    </div>
  );
}

/**
 * Optional centered portrait shown between the subtitle and body copy. `src`
 * should be an absolute path like /images/white-papers/grant-avatar.png.
 */
export function SubjectPortrait({
  src,
  alt,
  caption,
  width = 440,
  height = 440,
}) {
  return (
    <div className="subject-portrait">
      <figure>
        <img src={src} alt={alt} width={width} height={height} loading="lazy" />
        {caption ? <figcaption>{caption}</figcaption> : null}
      </figure>
    </div>
  );
}

/**
 * Wraps the "Optional pull quotes" section. Children are <blockquote> elements.
 */
export function PullQuotes({ children }) {
  return <section className="pullquotes">{children}</section>;
}

/**
 * Numbered narrative beat ("1. The program re-scope."). Renders a paragraph
 * with the cyan-numbered Barlow title on its own line, followed by the beat
 * body supplied via `children`.
 */
export function Beat({ num, title, children }) {
  return (
    <p>
      <span className="beat-title">
        <span className="beat-num">{num}.</span>
        {title}
      </span>
      {children}
    </p>
  );
}
