import { useState } from "react";

/* ============================================================
   NEONPANDA DESIGN SYSTEM — RetroTemplate.jsx
   Full component library reference page.
   Drop this file into your project and visit the route to
   browse every UI element, token, and pattern in the system.
   ============================================================ */

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=VT323&family=Courier+Prime:ital,wght@0,400;0,700;1,400&display=swap');

  /* ── TOKENS ── */
  :root {
    --cyan:         #00ffff;
    --cyan-mid:     rgba(0,255,255,0.22);
    --cyan-dim:     rgba(0,255,255,0.07);
    --cyan-glow:    rgba(0,255,255,0.45);
    --pink:         #ff0080;
    --pink-mid:     rgba(255,0,128,0.22);
    --pink-dim:     rgba(255,0,128,0.08);
    --pink-glow:    rgba(255,0,128,0.45);
    --purple:       #9f00ff;
    --purple-mid:   rgba(159,0,255,0.22);
    --purple-dim:   rgba(159,0,255,0.08);
    --purple-glow:  rgba(159,0,255,0.45);
    --lime:         #39ff14;
    --lime-dim:     rgba(57,255,20,0.10);
    --orange:       #ff6b35;
    --orange-dim:   rgba(255,107,53,0.10);
    --maroon:       #8b0045;
    --maroon-dim:   rgba(139,0,69,0.15);
    --amber:        var(--orange);
    --amber-dim:    var(--orange-dim);
    --red:          var(--pink);
    --red-dim:      var(--pink-dim);

    --bg:           #22103e;
    --bg-secondary: #1a0d2e;
    --bg-tertiary:  #16213e;
    --bg-purple:    #2a1a4a;
    --bg-card:      #1e1e2e;
    --bg-raised:    #2a1a4a;
    --bg-overlay:   rgba(34,16,62,0.94);

    --border:       rgba(0,255,255,0.12);
    --border-mid:   rgba(0,255,255,0.26);
    --border-hot:   rgba(0,255,255,0.52);

    --text-1:       #f0eeff;
    --text-2:       rgba(240,238,255,0.72);
    --text-3:       rgba(240,238,255,0.42);
    --text-4:       rgba(240,238,255,0.18);

    --font-display: 'VT323', monospace;
    --font-mono:    'Share Tech Mono', monospace;
    --font-body:    'Courier Prime', monospace;

    --s1:4px; --s2:8px; --s3:12px; --s4:16px;
    --s5:20px; --s6:24px; --s7:32px; --s8:48px;
    --ease: cubic-bezier(0.16,1,0.3,1);
    --fast: 0.12s; --mid: 0.22s;
  }

  /* ── BASE ── */
  .np-root *, .np-root *::before, .np-root *::after { box-sizing: border-box; margin: 0; padding: 0; }
  .np-root {
    background: var(--bg);
    color: var(--text-1);
    font-family: var(--font-mono);
    font-size: 14px;
    line-height: 1.65;
    -webkit-font-smoothing: antialiased;
    min-height: 100vh;
    display: flex;
  }

  /* CRT scanline */
  .np-root::before {
    content: '';
    position: fixed; inset: 0;
    background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.07) 2px, rgba(0,0,0,0.07) 4px);
    pointer-events: none;
    z-index: 9999;
  }
  /* Vignette */
  .np-root::after {
    content: '';
    position: fixed; inset: 0;
    background: radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%);
    pointer-events: none;
    z-index: 9998;
  }

  .np-root ::-webkit-scrollbar { width: 3px; height: 3px; }
  .np-root ::-webkit-scrollbar-track { background: transparent; }
  .np-root ::-webkit-scrollbar-thumb { background: var(--border-mid); border-radius: 0; }

  /* ── LAYOUT ── */
  .np-nav {
    position: fixed; top: 0; left: 0;
    width: 220px; height: 100vh;
    border-right: 1px solid var(--border);
    background: var(--bg);
    padding: var(--s6) 0;
    overflow-y: auto;
    z-index: 100;
  }
  .np-logo {
    font-family: var(--font-display);
    font-size: 26px; letter-spacing: 3px;
    color: var(--cyan);
    text-shadow: 0 0 14px var(--cyan-glow);
    padding: 0 var(--s6) var(--s5);
    border-bottom: 1px solid var(--border);
    margin-bottom: var(--s3);
  }
  .np-logo span { color: var(--pink); text-shadow: 0 0 14px var(--pink-glow); }
  .np-nav-section {
    padding: var(--s3) var(--s6) var(--s1);
    font-size: 9px; letter-spacing: 3px;
    color: var(--text-3); text-transform: uppercase;
  }
  .np-nav a {
    display: block;
    padding: var(--s2) var(--s6);
    font-size: 12px; letter-spacing: 1.5px;
    color: var(--text-2); text-decoration: none;
    border-left: 2px solid transparent;
    transition: all var(--fast);
  }
  .np-nav a:hover { color: var(--cyan); background: var(--cyan-dim); border-left-color: var(--border-mid); }
  .np-main { margin-left: 220px; padding: var(--s8); max-width: 1100px; }

  /* ── SECTIONS ── */
  .np-section { margin-bottom: var(--s8); padding-top: var(--s7); border-top: 1px solid var(--border); }
  .np-section:first-child { border-top: none; padding-top: 0; }
  .section-tag { font-size: 9px; letter-spacing: 4px; color: var(--text-3); text-transform: uppercase; margin-bottom: var(--s2); }
  .section-title { font-family: var(--font-display); font-size: 44px; letter-spacing: 3px; color: var(--text-1); line-height: 1; margin-bottom: var(--s3); }
  .section-desc { font-family: var(--font-body); font-size: 14px; color: var(--text-2); letter-spacing: 0.3px; max-width: 540px; margin-bottom: var(--s6); }
  .demo-row { display: flex; flex-wrap: wrap; gap: var(--s4); align-items: flex-start; margin-bottom: var(--s5); }
  .demo-col { display: flex; flex-direction: column; gap: var(--s3); }
  .token { font-size: 10px; letter-spacing: 2px; color: var(--text-3); margin-top: var(--s1); }

  /* ── TYPOGRAPHY ── */
  .type-display-xl  { font-family: var(--font-display); font-size: 72px; letter-spacing: 4px; line-height: 1; color: var(--text-1); }
  .type-display-lg  { font-family: var(--font-display); font-size: 48px; letter-spacing: 3px; line-height: 1; color: var(--text-1); }
  .type-display-md  { font-family: var(--font-display); font-size: 32px; letter-spacing: 2px; line-height: 1.1; color: var(--text-1); }
  .type-display-sm  { font-family: var(--font-display); font-size: 24px; letter-spacing: 1px; line-height: 1.2; color: var(--text-1); }
  .type-mono-lg     { font-family: var(--font-mono); font-size: 16px; letter-spacing: 1.5px; color: var(--text-1); }
  .type-mono-md     { font-family: var(--font-mono); font-size: 14px; letter-spacing: 1px; color: var(--text-1); }
  .type-mono-sm     { font-family: var(--font-mono); font-size: 12px; letter-spacing: 1.5px; color: var(--text-2); }
  .type-mono-xs     { font-family: var(--font-mono); font-size: 10px; letter-spacing: 3px; text-transform: uppercase; color: var(--text-3); }
  .type-body        { font-family: var(--font-body); font-size: 15px; line-height: 1.75; letter-spacing: 0.3px; color: var(--text-1); }
  .type-body-sm     { font-family: var(--font-body); font-size: 13px; line-height: 1.65; letter-spacing: 0.3px; color: var(--text-2); }
  .type-body-i      { font-family: var(--font-body); font-size: 15px; font-style: italic; color: var(--text-2); }
  .type-label       { font-family: var(--font-mono); font-size: 10px; letter-spacing: 4px; text-transform: uppercase; color: var(--text-3); }
  .t-cyan   { color: var(--cyan); text-shadow: 0 0 10px var(--cyan-glow); }
  .t-pink   { color: var(--pink); text-shadow: 0 0 10px var(--pink-glow); }
  .t-lime   { color: var(--lime); }
  .t-amber  { color: var(--amber); }
  .t-dim    { color: var(--text-2); }
  .t-dimmer { color: var(--text-3); }

  /* ── CURSOR ── */
  .cursor {
    display: inline-block; width: 9px; height: 1.1em;
    background: var(--cyan); vertical-align: middle; margin-left: 2px;
    box-shadow: 0 0 8px var(--cyan);
    animation: np-blink 1.1s step-end infinite;
  }
  .cursor.pink { background: var(--pink); box-shadow: 0 0 8px var(--pink); }
  @keyframes np-blink { 0%,100%{opacity:1} 50%{opacity:0} }

  /* ── BUTTONS ── */
  .btn {
    display: inline-flex; align-items: center; gap: var(--s2);
    font-family: var(--font-mono); font-size: 12px;
    letter-spacing: 2.5px; text-transform: uppercase;
    padding: 10px 22px; border: 1px solid;
    background: transparent; cursor: pointer;
    transition: all var(--mid) var(--ease);
    position: relative; overflow: hidden; white-space: nowrap;
  }
  .btn::before { content:''; position:absolute; inset:0; background:currentColor; opacity:0; transition:opacity var(--fast); }
  .btn:hover::before { opacity:0.05; }
  .btn:active { transform: scale(0.98); }
  .btn-primary { border-color:var(--cyan); color:var(--cyan); text-shadow:0 0 8px var(--cyan-glow); }
  .btn-primary:hover { background:var(--cyan-dim); box-shadow:0 0 16px rgba(0,255,255,0.15); }
  .btn-solid { border-color:var(--cyan); background:var(--cyan); color:var(--bg); font-weight:700; box-shadow:0 0 20px rgba(0,255,255,0.2); }
  .btn-solid:hover { background:#33ffff; box-shadow:0 0 28px rgba(0,255,255,0.35); }
  .btn-pink { border-color:var(--pink); color:var(--pink); text-shadow:0 0 8px var(--pink-glow); }
  .btn-pink:hover { background:var(--pink-dim); box-shadow:0 0 16px rgba(255,0,128,0.15); }
  .btn-purple { border-color:var(--purple); color:var(--purple); text-shadow:0 0 8px var(--purple-glow); }
  .btn-purple:hover { background:var(--purple-dim); box-shadow:0 0 16px rgba(159,0,255,0.18); }
  .btn-ghost { border-color:var(--border-mid); color:var(--text-2); }
  .btn-ghost:hover { border-color:var(--border-hot); color:var(--text-1); }
  .btn-danger { border-color:var(--pink); color:var(--pink); }
  .btn-danger:hover { background:var(--pink-dim); box-shadow:0 0 12px rgba(255,0,128,0.2); }
  .btn-lg { padding:13px 28px; font-size:12px; letter-spacing:3px; }
  .btn-sm { padding:6px 14px; font-size:9px; letter-spacing:2px; }
  .btn-xs { padding:3px 10px; font-size:8px; letter-spacing:2px; }
  .btn-block { width:100%; justify-content:center; }
  .btn:disabled { opacity:0.3; cursor:not-allowed; pointer-events:none; }
  .btn-prefix { font-size:14px; opacity:0.7; }
  .btn-loading .btn-prefix { animation: np-spin 1s linear infinite; }
  @keyframes np-spin { to { transform:rotate(360deg); } }

  /* ── BADGES ── */
  .badge {
    display: inline-flex; align-items: center; gap: 5px;
    font-family: var(--font-mono); font-size: 10px;
    letter-spacing: 2.5px; text-transform: uppercase;
    padding: 3px 9px; border: 1px solid; white-space: nowrap;
  }
  .badge-dot { width:5px; height:5px; border-radius:50%; background:currentColor; box-shadow:0 0 5px currentColor; flex-shrink:0; }
  .badge-cyan   { border-color:rgba(0,255,255,0.35);  color:var(--cyan);   background:var(--cyan-dim); }
  .badge-pink   { border-color:rgba(255,0,128,0.35);  color:var(--pink);   background:var(--pink-dim); }
  .badge-purple { border-color:rgba(159,0,255,0.35);  color:var(--purple); background:var(--purple-dim); }
  .badge-lime   { border-color:rgba(57,255,20,0.3);   color:var(--lime);   background:var(--lime-dim); }
  .badge-amber  { border-color:rgba(255,107,53,0.3);  color:var(--orange); background:var(--orange-dim); }
  .badge-red    { border-color:rgba(255,0,128,0.3);   color:var(--pink);   background:var(--pink-dim); }
  .badge-ghost  { border-color:var(--border); color:var(--text-3); background:transparent; }
  .badge-pill   { border-radius:999px; }
  .badge-lg     { font-size:10px; letter-spacing:2px; padding:5px 12px; }
  .badge-online { animation: np-badge-pulse 2s ease-in-out infinite; }
  @keyframes np-badge-pulse { 0%,100%{box-shadow:0 0 0 0 var(--cyan-glow)} 50%{box-shadow:0 0 0 4px rgba(0,255,255,0)} }

  /* ── CHIPS ── */
  .chip {
    display: inline-flex; align-items: center; gap:5px;
    font-size:9px; letter-spacing:2px; text-transform:uppercase;
    padding:2px 8px; background:var(--bg-raised);
    border:1px solid var(--border); color:var(--text-2); cursor:default;
    transition:all var(--fast);
  }
  .chip:hover { border-color:var(--border-mid); color:var(--text-1); }
  .chip-remove { font-size:11px; cursor:pointer; color:var(--text-3); margin-left:2px; transition:color var(--fast); }
  .chip-remove:hover { color:var(--pink); }

  /* ── CARDS ── */
  .card { border:1px solid var(--border); background:var(--bg-card); padding:var(--s6); position:relative; transition:border-color var(--mid); }
  .card:hover { border-color:var(--border-mid); }
  .card-raised { background:var(--bg-raised); }
  .card-cyan { border-color:rgba(0,255,255,0.2); }
  .card-cyan:hover { border-color:rgba(0,255,255,0.4); }
  .card-glow::after { content:''; position:absolute; inset:-1px; border:1px solid var(--cyan); box-shadow:0 0 20px rgba(0,255,255,0.15); pointer-events:none; opacity:0; transition:opacity var(--mid); }
  .card-glow:hover::after { opacity:1; }
  .card-active-top { border-top:2px solid var(--cyan); box-shadow:0 -2px 12px rgba(0,255,255,0.2); }
  .stat-card { border:1px solid var(--border); background:var(--bg-card); padding:var(--s5) var(--s6); }
  .stat-label { font-size:9px; letter-spacing:4px; color:var(--text-3); text-transform:uppercase; margin-bottom:4px; }
  .stat-value { font-family:var(--font-display); font-size:42px; letter-spacing:2px; line-height:1; color:var(--text-1); }
  .stat-value.accent { color:var(--cyan); text-shadow:0 0 16px rgba(0,255,255,0.3); }
  .stat-sub { font-size:10px; letter-spacing:2px; color:var(--text-3); margin-top:4px; }
  .stat-delta { font-size:10px; letter-spacing:1px; }
  .stat-delta.up { color:var(--lime); }
  .stat-delta.down { color:var(--red); }
  .panel-block { border:1px solid var(--border); background:var(--bg-card); overflow:hidden; }
  .panel-block-header { padding:var(--s4) var(--s6); border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; font-size:9px; letter-spacing:3px; color:var(--text-3); text-transform:uppercase; }
  .panel-block-header a { color:var(--cyan); cursor:pointer; font-size:8px; text-decoration:none; opacity:0.7; transition:opacity var(--fast); }
  .panel-block-header a:hover { opacity:1; }
  .panel-block-body { padding:var(--s5) var(--s6); }
  .card-divider { height:1px; background:var(--border); margin:var(--s5) 0; }

  /* ── INPUTS ── */
  .field { display:flex; flex-direction:column; gap:var(--s2); }
  .field-label { font-size:9px; letter-spacing:3px; text-transform:uppercase; color:var(--text-3); }
  .field-hint { font-size:10px; letter-spacing:1px; color:var(--text-3); font-family:var(--font-body); }
  .field-error { font-size:10px; letter-spacing:1px; color:var(--red); font-family:var(--font-body); }
  .field-success { font-size:10px; letter-spacing:1px; color:var(--lime); font-family:var(--font-body); }
  .input {
    width:100%; background:var(--bg-card); border:1px solid var(--border-mid);
    color:var(--text-1); font-family:var(--font-mono); font-size:13px;
    letter-spacing:1px; padding:10px var(--s4); outline:none;
    transition:all var(--mid); caret-color:var(--cyan);
  }
  .input::placeholder { color:var(--text-3); }
  .input:focus { border-color:var(--cyan); background:rgba(0,255,255,0.03); box-shadow:0 0 0 1px rgba(0,255,255,0.08); }
  .input:disabled { opacity:0.3; cursor:not-allowed; }
  .input-error { border-color:var(--red) !important; }
  .input-success { border-color:var(--lime) !important; }
  .input-group { display:flex; align-items:center; border:1px solid var(--border-mid); background:var(--bg-card); transition:border-color var(--mid); }
  .input-group:focus-within { border-color:var(--cyan); background:rgba(0,255,255,0.03); }
  .input-group-prefix { padding:0 var(--s3); color:var(--cyan); font-size:13px; opacity:0.6; flex-shrink:0; }
  .input-group .input { border:none; background:transparent; padding-left:0; }
  .input-group .input:focus { box-shadow:none; }
  textarea.input { resize:vertical; min-height:90px; line-height:1.6; }
  .search-field { display:flex; align-items:center; gap:var(--s3); border:1px solid var(--border-mid); background:var(--bg-card); padding:10px var(--s4); transition:border-color var(--mid); }
  .search-field:focus-within { border-color:var(--cyan); }
  .search-icon { font-size:12px; color:var(--text-3); flex-shrink:0; }
  .search-field input { flex:1; background:none; border:none; outline:none; font-family:var(--font-mono); font-size:12px; letter-spacing:1px; color:var(--text-1); caret-color:var(--cyan); }
  .search-field input::placeholder { color:var(--text-3); }
  .range { -webkit-appearance:none; width:100%; height:2px; background:var(--border-mid); outline:none; cursor:pointer; }
  .range::-webkit-slider-thumb { -webkit-appearance:none; width:14px; height:14px; border:1px solid var(--cyan); background:var(--bg); cursor:pointer; box-shadow:0 0 8px rgba(0,255,255,0.3); }

  /* ── TOGGLE ── */
  .toggle { display:flex; align-items:center; gap:var(--s3); cursor:pointer; }
  .toggle-track { width:38px; height:20px; border:1px solid var(--border-mid); background:var(--bg-card); position:relative; transition:all var(--mid); flex-shrink:0; }
  .toggle-track.on { border-color:var(--cyan); background:var(--cyan-dim); box-shadow:0 0 10px rgba(0,255,255,0.1); }
  .toggle-thumb { position:absolute; top:3px; left:3px; width:12px; height:12px; background:var(--text-3); transition:all var(--mid) var(--ease); }
  .toggle-track.on .toggle-thumb { left:21px; background:var(--cyan); box-shadow:0 0 8px var(--cyan); }

  /* ── CHECKBOX / RADIO ── */
  .check-group { display:flex; align-items:center; gap:var(--s3); cursor:pointer; }
  .check-box { width:16px; height:16px; border:1px solid var(--border-mid); background:var(--bg-card); display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:all var(--fast); cursor:pointer; }
  .check-group:hover .check-box { border-color:var(--cyan); }
  .check-box.checked { background:var(--cyan-dim); border-color:var(--cyan); }
  .check-box.checked::after { content:'✓'; font-size:10px; color:var(--cyan); text-shadow:0 0 6px var(--cyan-glow); }
  .radio-box { width:14px; height:14px; border:1px solid var(--border-mid); border-radius:50%; background:var(--bg-card); display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:all var(--fast); }
  .radio-box.checked { border-color:var(--cyan); }
  .radio-box.checked::after { content:''; width:6px; height:6px; border-radius:50%; background:var(--cyan); box-shadow:0 0 6px var(--cyan); }

  /* ── ACCORDION ── */
  .accordion { border:1px solid var(--border); overflow:hidden; }
  .accordion + .accordion { margin-top:-1px; }
  .accordion-trigger { width:100%; display:flex; align-items:center; justify-content:space-between; padding:var(--s4) var(--s6); background:var(--bg-card); border:none; cursor:pointer; font-family:var(--font-mono); font-size:12px; letter-spacing:2px; text-transform:uppercase; color:var(--text-2); text-align:left; transition:all var(--fast); gap:var(--s3); }
  .accordion-trigger:hover { background:var(--cyan-dim); color:var(--text-1); }
  .accordion-trigger.open { color:var(--cyan); background:var(--cyan-dim); text-shadow:0 0 8px rgba(0,255,255,0.2); }
  .accordion-icon { font-size:14px; color:var(--text-3); flex-shrink:0; transition:transform var(--mid) var(--ease); }
  .accordion-trigger.open .accordion-icon { transform:rotate(90deg); color:var(--cyan); }
  .acc-prefix { color:var(--text-3); font-size:10px; margin-right:var(--s2); }
  .accordion-trigger.open .acc-prefix { color:var(--cyan); }
  .accordion-body { max-height:0; overflow:hidden; transition:max-height 0.35s var(--ease); background:var(--bg); border-top:0px solid var(--border); }
  .accordion-body.open { max-height:500px; border-top-width:1px; }
  .accordion-body-inner { padding:var(--s5) var(--s6); font-family:var(--font-body); font-size:14px; color:var(--text-2); line-height:1.75; }

  /* ── PROGRESS ── */
  .progress { display:flex; flex-direction:column; gap:var(--s2); }
  .progress-meta { display:flex; justify-content:space-between; align-items:baseline; }
  .progress-name { font-size:10px; letter-spacing:1.5px; color:var(--text-2); }
  .progress-val  { font-family:var(--font-display); font-size:18px; letter-spacing:1px; color:var(--text-1); }
  .progress-track { height:2px; background:rgba(255,255,255,0.05); position:relative; overflow:hidden; }
  .progress-track.thick { height:6px; }
  .progress-fill { height:100%; position:relative; transition:width 1.2s var(--ease); }
  .progress-fill::after { content:''; position:absolute; right:0; top:-2px; bottom:-2px; width:4px; background:inherit; filter:blur(3px); }
  .progress-fill.cyan  { background:var(--cyan); box-shadow:0 0 8px var(--cyan-glow); }
  .progress-fill.pink  { background:var(--pink); box-shadow:0 0 8px var(--pink-glow); }
  .progress-fill.lime  { background:var(--lime); box-shadow:0 0 8px rgba(57,255,20,0.4); }
  .progress-fill.amber { background:var(--amber); box-shadow:0 0 8px rgba(255,107,53,0.4); }
  .progress-fill.red   { background:var(--red); box-shadow:0 0 8px rgba(255,0,128,0.4); }
  .progress-fill.animated { background-image:repeating-linear-gradient(-45deg,transparent,transparent 4px,rgba(255,255,255,0.08) 4px,rgba(255,255,255,0.08) 8px); animation:np-stripe 0.8s linear infinite; }
  @keyframes np-stripe { to { background-position:16px 0; } }
  .week-progress { display:grid; grid-template-columns:repeat(7,1fr); gap:3px; }
  .week-day { height:4px; background:var(--border); transition:all var(--mid); }
  .week-day.done  { background:var(--cyan); box-shadow:0 0 6px rgba(0,255,255,0.4); }
  .week-day.today { background:var(--pink); box-shadow:0 0 6px rgba(255,0,128,0.4); animation:np-blink 1.5s step-end infinite; }
  .week-day.rest  { background:rgba(255,255,255,0.03); }

  /* ── TABLE ── */
  .table-wrap { overflow-x:auto; }
  table.np-table { width:100%; border-collapse:collapse; font-size:12px; letter-spacing:1px; }
  .np-table thead tr { border-bottom:1px solid var(--border-mid); }
  .np-table th { padding:var(--s3) var(--s5); text-align:left; font-size:9px; letter-spacing:3px; text-transform:uppercase; color:var(--text-3); font-weight:normal; }
  .np-table tbody tr { border-bottom:1px solid rgba(255,255,255,0.03); transition:background var(--fast); }
  .np-table tbody tr:hover { background:var(--cyan-dim); }
  .np-table td { padding:var(--s3) var(--s5); color:var(--text-2); vertical-align:middle; }
  .np-table td.highlight { color:var(--text-1); }
  .np-table td.accent    { color:var(--cyan); }
  .np-table tfoot tr { border-top:1px solid var(--border-mid); }
  .np-table tfoot td { color:var(--text-3); font-size:9px; letter-spacing:2px; }

  /* ── LISTS ── */
  .np-list { list-style:none; border:1px solid var(--border); overflow:hidden; }
  .np-list li { padding:var(--s4) var(--s6); border-bottom:1px solid rgba(255,255,255,0.03); display:flex; align-items:center; gap:var(--s4); font-size:13px; letter-spacing:1px; color:var(--text-2); transition:all var(--fast); }
  .np-list li:last-child { border-bottom:none; }
  .np-list li:hover { background:var(--cyan-dim); color:var(--text-1); }
  .np-list li.active { background:var(--cyan-dim); color:var(--cyan); border-left:2px solid var(--cyan); text-shadow:0 0 8px rgba(0,255,255,0.2); }
  .list-prefix { color:var(--text-3); font-size:10px; flex-shrink:0; }
  .list-action { margin-left:auto; }
  .list-meta   { margin-left:auto; font-size:9px; letter-spacing:2px; color:var(--text-3); }

  /* ── ALERTS ── */
  .alert { border:1px solid; padding:var(--s4) var(--s6); display:flex; gap:var(--s4); align-items:flex-start; }
  .alert-icon  { font-size:14px; flex-shrink:0; margin-top:1px; }
  .alert-body  { flex:1; }
  .alert-title { font-size:11px; letter-spacing:2px; text-transform:uppercase; margin-bottom:4px; }
  .alert-text  { font-family:var(--font-body); font-size:13px; color:var(--text-2); line-height:1.55; }
  .alert-info    { border-color:rgba(0,255,255,0.25); background:var(--cyan-dim); }
  .alert-info .alert-icon, .alert-info .alert-title { color:var(--cyan); }
  .alert-success { border-color:rgba(57,255,20,0.25); background:var(--lime-dim); }
  .alert-success .alert-icon, .alert-success .alert-title { color:var(--lime); }
  .alert-warning { border-color:rgba(255,107,53,0.25); background:var(--orange-dim); }
  .alert-warning .alert-icon, .alert-warning .alert-title { color:var(--orange); }
  .alert-error   { border-color:rgba(255,0,128,0.25); background:var(--pink-dim); }
  .alert-error .alert-icon, .alert-error .alert-title { color:var(--pink); }
  .toast { display:inline-flex; align-items:center; gap:var(--s3); padding:var(--s3) var(--s5); border:1px solid; background:var(--bg-raised); font-size:11px; letter-spacing:1.5px; box-shadow:0 8px 32px rgba(0,0,0,0.5); }
  .toast-cyan  { border-color:rgba(0,255,255,0.35); color:var(--cyan); }
  .toast-pink  { border-color:rgba(255,0,128,0.35); color:var(--pink); }
  .toast-amber { border-color:rgba(255,107,53,0.35); color:var(--orange); }

  /* ── MODAL ── */
  .modal-overlay { position:relative; background:rgba(26,13,46,0.92); border:1px solid var(--border); backdrop-filter:blur(4px); padding:0; overflow:hidden; }
  .modal-header { padding:var(--s5) var(--s6); border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; }
  .modal-title { font-family:var(--font-display); font-size:28px; letter-spacing:2px; color:var(--text-1); }
  .modal-close { font-size:12px; letter-spacing:2px; color:var(--text-3); cursor:pointer; border:1px solid var(--border); padding:3px 10px; background:none; font-family:var(--font-mono); transition:all var(--fast); }
  .modal-close:hover { border-color:var(--pink); color:var(--pink); }
  .modal-body { padding:var(--s6); }
  .modal-footer { padding:var(--s5) var(--s6); border-top:1px solid var(--border); display:flex; justify-content:flex-end; gap:var(--s3); }

  /* ── TABS ── */
  .tabs { display:flex; border-bottom:1px solid var(--border); }
  .tab { padding:10px 20px; font-family:var(--font-mono); font-size:10px; letter-spacing:2.5px; text-transform:uppercase; color:var(--text-3); cursor:pointer; border-bottom:2px solid transparent; margin-bottom:-1px; transition:all var(--fast); border-top:1px solid transparent; border-left:1px solid transparent; border-right:1px solid transparent; }
  .tab:hover { color:var(--text-2); }
  .tab.active { color:var(--cyan); border-top-color:var(--border); border-left-color:var(--border); border-right-color:var(--border); border-bottom-color:var(--bg); background:var(--bg-card); text-shadow:0 0 8px rgba(0,255,255,0.25); }
  .tabs-pill { display:flex; gap:var(--s2); padding:var(--s2); border:1px solid var(--border); background:var(--bg-card); width:fit-content; }
  .tab-pill { padding:7px 16px; font-family:var(--font-mono); font-size:10px; letter-spacing:2px; text-transform:uppercase; color:var(--text-3); cursor:pointer; border:1px solid transparent; transition:all var(--fast); }
  .tab-pill:hover { color:var(--text-2); }
  .tab-pill.active { color:var(--cyan); border-color:var(--border-mid); background:var(--cyan-dim); }

  /* ── BREADCRUMB ── */
  .breadcrumb { display:flex; align-items:center; gap:var(--s2); font-size:9px; letter-spacing:3px; text-transform:uppercase; color:var(--text-3); }
  .breadcrumb a { color:var(--text-3); text-decoration:none; transition:color var(--fast); cursor:pointer; }
  .breadcrumb a:hover { color:var(--cyan); }
  .breadcrumb-sep { color:var(--text-4); }
  .breadcrumb-current { color:var(--text-2); }

  /* ── TOOLTIP ── */
  [data-tip] { position:relative; }
  [data-tip]::after { content:attr(data-tip); position:absolute; bottom:calc(100% + 6px); left:50%; transform:translateX(-50%); white-space:nowrap; background:var(--bg-raised); border:1px solid var(--border-mid); padding:4px 10px; font-size:9px; letter-spacing:2px; color:var(--text-2); pointer-events:none; opacity:0; transition:opacity var(--fast); z-index:100; text-transform:uppercase; }
  [data-tip]:hover::after { opacity:1; }

  /* ── TIMELINE ── */
  .timeline { display:flex; flex-direction:column; }
  .timeline-item { display:flex; gap:var(--s5); position:relative; }
  .timeline-item::before { content:''; position:absolute; left:7px; top:24px; bottom:-8px; width:1px; background:var(--border); }
  .timeline-item:last-child::before { display:none; }
  .timeline-dot { width:15px; height:15px; border:1px solid var(--border-mid); background:var(--bg-card); flex-shrink:0; margin-top:4px; position:relative; z-index:1; display:flex; align-items:center; justify-content:center; transition:all var(--mid); }
  .timeline-dot.done   { border-color:var(--cyan); background:var(--cyan-dim); }
  .timeline-dot.done::after  { content:''; width:5px; height:5px; background:var(--cyan); box-shadow:0 0 6px var(--cyan); }
  .timeline-dot.active { border-color:var(--pink); background:var(--pink-dim); }
  .timeline-dot.active::after { content:''; width:5px; height:5px; background:var(--pink); box-shadow:0 0 6px var(--pink); animation:np-blink 1.5s step-end infinite; }
  .timeline-content { flex:1; padding-bottom:var(--s5); }
  .timeline-date  { font-size:9px; letter-spacing:3px; color:var(--text-3); text-transform:uppercase; margin-bottom:2px; }
  .timeline-title { font-size:12px; letter-spacing:1px; color:var(--text-1); margin-bottom:4px; }
  .timeline-desc  { font-family:var(--font-body); font-size:12px; color:var(--text-2); line-height:1.6; }

  /* ── CHAT ── */
  .chat-stream { display:flex; flex-direction:column; gap:var(--s5); }
  .chat-msg { display:flex; flex-direction:column; gap:3px; }
  .chat-msg.user { align-items:flex-end; }
  .chat-who { font-size:9px; letter-spacing:3px; text-transform:uppercase; color:var(--text-3); }
  .chat-msg.coach .chat-who { color:rgba(0,255,255,0.45); }
  .chat-msg.user  .chat-who { color:rgba(255,0,128,0.5); }
  .chat-bubble { font-family:var(--font-body); font-size:14px; line-height:1.7; color:var(--text-2); max-width:75%; letter-spacing:0.3px; }
  .chat-msg.user .chat-bubble { color:var(--text-1); text-align:right; }
  .chat-input-bar { display:flex; align-items:center; gap:var(--s3); border:1px solid var(--border-mid); padding:10px var(--s4); background:var(--bg-card); transition:border-color var(--mid); }
  .chat-input-bar:focus-within { border-color:var(--cyan); }
  .chat-prompt { color:var(--cyan); opacity:0.6; font-size:13px; flex-shrink:0; }
  .chat-input-bar input { flex:1; background:none; border:none; outline:none; font-family:var(--font-mono); font-size:13px; letter-spacing:1px; color:var(--text-1); caret-color:var(--cyan); }
  .chat-input-bar input::placeholder { color:var(--text-3); }
  .typing-dots { display:flex; gap:4px; align-items:center; padding:2px 0; }
  .typing-dot { width:4px; height:4px; background:var(--cyan); border-radius:50%; animation:np-tdot 1.2s ease-in-out infinite; }
  .typing-dot:nth-child(2) { animation-delay:0.2s; }
  .typing-dot:nth-child(3) { animation-delay:0.4s; }
  @keyframes np-tdot { 0%,100%{opacity:0.2;transform:scale(0.8)} 50%{opacity:1;transform:scale(1.2);box-shadow:0 0 5px var(--cyan)} }

  /* ── LOADING ── */
  .spinner { width:20px; height:20px; border:1px solid var(--border-mid); border-top-color:var(--cyan); border-radius:50%; animation:np-spin 0.8s linear infinite; }
  .spinner.sm { width:14px; height:14px; }
  .spinner.lg { width:32px; height:32px; }
  .skeleton { background:linear-gradient(90deg,var(--bg-card) 25%,var(--bg-raised) 50%,var(--bg-card) 75%); background-size:200% 100%; animation:np-shimmer 1.4s infinite; }
  @keyframes np-shimmer { to { background-position:-200% 0; } }
  .skeleton-line { height:12px; margin-bottom:12px; }
  .skeleton-line.short { width:40%; }
  .skeleton-line.mid   { width:65%; }
  .skeleton-line.full  { width:100%; }
  .pulse-dot { width:8px; height:8px; border-radius:50%; background:var(--cyan); box-shadow:0 0 8px var(--cyan); animation:np-pulse-dot 2s ease-in-out infinite; }
  @keyframes np-pulse-dot { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(0.6);opacity:0.4} }

  /* ── MISC ── */
  .divider { height:1px; background:var(--border); margin:var(--s6) 0; }
  .divider-label { display:flex; align-items:center; gap:var(--s4); color:var(--text-3); font-size:9px; letter-spacing:3px; text-transform:uppercase; margin:var(--s6) 0; }
  .divider-label::before, .divider-label::after { content:''; flex:1; height:1px; background:var(--border); }
  .code-block { background:rgba(0,0,0,0.4); border:1px solid var(--border); border-left:2px solid var(--cyan); padding:var(--s4) var(--s5); font-family:var(--font-mono); font-size:11px; color:var(--text-2); letter-spacing:0.5px; line-height:1.8; overflow-x:auto; }
  .code-block .kw  { color:var(--cyan); }
  .code-block .str { color:var(--lime); }
  .code-block .num { color:var(--amber); }
  .code-block .cmt { color:var(--text-3); font-style:italic; }
  kbd { display:inline-block; padding:2px 7px; border:1px solid var(--border-mid); background:var(--bg-raised); font-family:var(--font-mono); font-size:9px; letter-spacing:1px; color:var(--text-2); vertical-align:middle; }
`;

// ── Sub-components ──────────────────────────────────────────

function AccordionItem({ index, title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="accordion">
      <button
        className={`accordion-trigger${open ? " open" : ""}`}
        onClick={() => setOpen(!open)}
      >
        <span>
          <span className="acc-prefix">[0{index}]</span> {title}
        </span>
        <span className="accordion-icon">▶</span>
      </button>
      <div className={`accordion-body${open ? " open" : ""}`}>
        <div className="accordion-body-inner">{children}</div>
      </div>
    </div>
  );
}

function TabGroup({ tabs }) {
  const [active, setActive] = useState(0);
  return (
    <div className="tabs">
      {tabs.map((t, i) => (
        <div
          key={t}
          className={`tab${active === i ? " active" : ""}`}
          onClick={() => setActive(i)}
        >
          {t}
        </div>
      ))}
    </div>
  );
}

function PillTabGroup({ tabs }) {
  const [active, setActive] = useState(1);
  return (
    <div className="tabs-pill">
      {tabs.map((t, i) => (
        <div
          key={t}
          className={`tab-pill${active === i ? " active" : ""}`}
          onClick={() => setActive(i)}
        >
          {t}
        </div>
      ))}
    </div>
  );
}

function Toggle({ label, defaultOn = false }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <label className="toggle" onClick={() => setOn(!on)}>
      <div className={`toggle-track${on ? " on" : ""}`}>
        <div className="toggle-thumb" />
      </div>
      <span className="type-mono-sm">{label}</span>
    </label>
  );
}

function Checkbox({ label, defaultChecked = false }) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <label className="check-group" onClick={() => setChecked(!checked)}>
      <div className={`check-box${checked ? " checked" : ""}`} />
      <span className="type-mono-sm">{label}</span>
    </label>
  );
}

function RadioGroup({ options }) {
  const [selected, setSelected] = useState(0);
  return (
    <>
      {options.map((opt, i) => (
        <label key={opt} className="check-group" onClick={() => setSelected(i)}>
          <div className={`radio-box${selected === i ? " checked" : ""}`} />
          <span className="type-mono-sm">{opt}</span>
        </label>
      ))}
    </>
  );
}

// ── Main Component ──────────────────────────────────────────

export default function RetroTemplate() {
  return (
    <div className="np-root">
      <style>{css}</style>

      {/* ── SIDEBAR NAV ── */}
      <nav className="np-nav">
        <div className="np-logo">
          NEON<span>PANDA</span>
        </div>
        <div className="np-nav-section">// FOUNDATIONS</div>
        <a href="#tokens">Color Tokens</a>
        <a href="#typography">Typography</a>
        <div className="np-nav-section">// COMPONENTS</div>
        <a href="#buttons">Buttons</a>
        <a href="#badges">Badges & Tags</a>
        <a href="#cards">Cards & Containers</a>
        <a href="#inputs">Inputs & Forms</a>
        <a href="#collapsible">Collapsible</a>
        <a href="#progress">Progress Bars</a>
        <a href="#tables">Tables</a>
        <a href="#lists">Lists</a>
        <a href="#alerts">Alerts & Notifications</a>
        <a href="#modals">Modals</a>
        <a href="#tabs">Tabs</a>
        <a href="#breadcrumbs">Breadcrumbs</a>
        <a href="#timeline">Timeline</a>
        <a href="#chat">Chat Bubbles</a>
        <a href="#loading">Loading States</a>
        <a href="#misc">Misc Utilities</a>
      </nav>

      {/* ── MAIN ── */}
      <main className="np-main">
        {/* ── 01 COLOR TOKENS ── */}
        <section className="np-section" id="tokens">
          <div className="section-tag">// 01 — FOUNDATIONS</div>
          <div className="section-title">COLOR TOKENS</div>
          <div className="section-desc">
            All colors map directly to your synthwave palette. CSS custom
            properties — never hardcode hex values in components. Cyan is the
            primary interaction color; pink and purple are accents;
            lime/orange/maroon carry semantic meaning.
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))",
              gap: "12px",
              marginBottom: "12px",
            }}
          >
            {[
              [
                "--cyan",
                "NEON-CYAN",
                "#00ffff",
                "var(--cyan)",
                "var(--cyan-glow)",
              ],
              [
                "--pink",
                "NEON-PINK",
                "#ff0080",
                "var(--pink)",
                "var(--pink-glow)",
              ],
              [
                "--purple",
                "NEON-PURPLE",
                "#9f00ff",
                "var(--purple)",
                "var(--purple-glow)",
              ],
              ["--lime", "NEON-GREEN", "#39ff14", "var(--lime)", null],
              ["--orange", "NEON-ORANGE", "#ff6b35", "var(--orange)", null],
              ["--maroon", "NEON-MAROON", "#8b0045", "var(--maroon)", null],
            ].map(([token, label, hex, bg, glow]) => (
              <div
                key={token}
                style={{ border: "1px solid var(--border)", padding: "12px" }}
              >
                <div
                  style={{
                    height: "32px",
                    background: bg,
                    boxShadow: glow ? `0 0 14px ${glow}` : undefined,
                    marginBottom: "10px",
                  }}
                />
                <div className="type-mono-xs">
                  {token} / {label}
                </div>
                <div style={{ fontSize: "10px", color: "var(--text-3)" }}>
                  {hex}
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))",
              gap: "12px",
            }}
          >
            {[
              ["--bg · BG-PRIMARY", "#22103e", "var(--bg)"],
              ["--bg-secondary", "#1a0d2e", "var(--bg-secondary)"],
              ["--bg-tertiary", "#16213e", "var(--bg-tertiary)"],
              ["--bg-purple", "#2a1a4a", "var(--bg-purple)"],
              ["--bg-card", "#1e1e2e", "var(--bg-card)"],
            ].map(([label, hex, bg]) => (
              <div
                key={label}
                style={{ border: "1px solid var(--border)", padding: "12px" }}
              >
                <div
                  style={{
                    height: "24px",
                    background: bg,
                    border: "1px solid var(--border)",
                    marginBottom: "8px",
                  }}
                />
                <div className="type-mono-xs">{label}</div>
                <div style={{ fontSize: "10px", color: "var(--text-3)" }}>
                  {hex}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 02 TYPOGRAPHY ── */}
        <section className="np-section" id="typography">
          <div className="section-tag">// 02</div>
          <div className="section-title">TYPOGRAPHY</div>
          <div className="section-desc">
            Three typefaces. VT323 for display numbers and headlines. Share Tech
            Mono for UI labels and navigation. Courier Prime for readable body
            text and chat.
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "20px" }}
          >
            <div>
              <div className="type-display-xl t-cyan">
                DISPLAY XL
                <span className="cursor" />
              </div>
              <div className="token">VT323 · 72px · .type-display-xl</div>
            </div>
            <div>
              <div className="type-display-lg">DISPLAY LG — 48PX</div>
              <div className="token">VT323 · 48px · .type-display-lg</div>
            </div>
            <div>
              <div className="type-display-md t-pink">DISPLAY MD — 32PX</div>
              <div className="token">VT323 · 32px · .type-display-md</div>
            </div>
            <div>
              <div className="type-display-sm">Display Small — 24px</div>
              <div className="token">VT323 · 24px · .type-display-sm</div>
            </div>
            <div className="divider" />
            <div>
              <div className="type-mono-lg">MONO LARGE — UI LABELS</div>
              <div className="token">
                Share Tech Mono · 16px · .type-mono-lg
              </div>
            </div>
            <div>
              <div className="type-mono-md">
                Mono Medium — standard interface text
              </div>
              <div className="token">
                Share Tech Mono · 14px · .type-mono-md
              </div>
            </div>
            <div>
              <div className="type-mono-sm">MONO SMALL — secondary labels</div>
              <div className="token">
                Share Tech Mono · 12px · .type-mono-sm
              </div>
            </div>
            <div>
              <div className="type-mono-xs">
                MONO XS — SYSTEM TAGS AND OVERLINES
              </div>
              <div className="token">
                Share Tech Mono · 10px · .type-mono-xs
              </div>
            </div>
            <div className="divider" />
            <div>
              <div className="type-body">
                Body — Courier Prime for coach messages, descriptions, and any
                extended reading. Warm and readable.
              </div>
              <div className="token">Courier Prime · 15px · .type-body</div>
            </div>
            <div>
              <div className="type-body-sm">
                Body Small — secondary descriptions and supporting text at a
                smaller scale.
              </div>
              <div className="token">Courier Prime · 13px · .type-body-sm</div>
            </div>
            <div>
              <div className="type-body-i">
                Body Italic — used for coach personality, motivational copy,
                emphasis within prose.
              </div>
              <div className="token">Courier Prime italic · .type-body-i</div>
            </div>
          </div>
        </section>

        {/* ── 03 BUTTONS ── */}
        <section className="np-section" id="buttons">
          <div className="section-tag">// 03</div>
          <div className="section-title">BUTTONS</div>
          <div className="section-desc">
            All buttons are text-only, uppercase mono. No rounded corners. Hover
            states use faint fill and glow.
          </div>
          <div className="type-label" style={{ marginBottom: "12px" }}>
            VARIANTS
          </div>
          <div className="demo-row">
            {[
              ["btn-primary", "PRIMARY"],
              ["btn-solid", "SOLID FILL"],
              ["btn-pink", "NEON PINK"],
              ["btn-purple", "NEON PURPLE"],
              ["btn-ghost", "GHOST"],
              ["btn-danger", "DANGER"],
            ].map(([cls, label]) => (
              <div key={cls} className="demo-col">
                <button className={`btn ${cls}`}>{label}</button>
                <div className="token">.{cls}</div>
              </div>
            ))}
          </div>
          <div
            className="type-label"
            style={{ marginBottom: "12px", marginTop: "20px" }}
          >
            SIZES
          </div>
          <div className="demo-row" style={{ alignItems: "center" }}>
            <button className="btn btn-primary btn-lg">LARGE</button>
            <button className="btn btn-primary">DEFAULT</button>
            <button className="btn btn-primary btn-sm">SMALL</button>
            <button className="btn btn-primary btn-xs">TINY</button>
          </div>
          <div
            className="type-label"
            style={{ marginBottom: "12px", marginTop: "20px" }}
          >
            STATES
          </div>
          <div className="demo-row">
            <button className="btn btn-primary" disabled>
              DISABLED
            </button>
            <button className="btn btn-primary btn-loading">
              <span className="btn-prefix">↻</span>LOADING
            </button>
            <button className="btn btn-ghost">
              <span className="btn-prefix">→</span>WITH ICON
            </button>
            <button
              className="btn btn-primary btn-block"
              style={{ maxWidth: "280px" }}
            >
              BLOCK / FULL WIDTH
            </button>
          </div>
        </section>

        {/* ── 04 BADGES ── */}
        <section className="np-section" id="badges">
          <div className="section-tag">// 04</div>
          <div className="section-title">BADGES & TAGS</div>
          <div className="section-desc">
            Status indicators, tags, and labels. Always uppercase mono. Used for
            workout status, program phase, coach state, and categorization.
          </div>
          <div className="type-label" style={{ marginBottom: "12px" }}>
            COLOR VARIANTS
          </div>
          <div className="demo-row">
            {[
              ["badge-cyan", "ONLINE"],
              ["badge-pink", "TODAY"],
              ["badge-purple", "ACTIVE"],
              ["badge-lime", "COMPLETE"],
              ["badge-amber", "WARNING"],
              ["badge-red", "MISSED"],
              ["badge-ghost", "UPCOMING"],
            ].map(([cls, label]) => (
              <div key={cls} className="demo-col">
                <span className={`badge ${cls}`}>
                  <span className="badge-dot" />
                  {label}
                </span>
                <div className="token">.{cls}</div>
              </div>
            ))}
          </div>
          <div
            className="type-label"
            style={{ marginBottom: "12px", marginTop: "20px" }}
          >
            SIZES & SHAPES
          </div>
          <div className="demo-row" style={{ alignItems: "center" }}>
            <span className="badge badge-lg badge-cyan">LARGE BADGE</span>
            <span className="badge badge-cyan">DEFAULT</span>
            <span className="badge badge-cyan badge-pill">PILL SHAPE</span>
            <span className="badge badge-cyan badge-online">
              <span className="badge-dot" />
              LIVE PULSE
            </span>
          </div>
          <div
            className="type-label"
            style={{ marginBottom: "12px", marginTop: "20px" }}
          >
            CHIPS (removable)
          </div>
          <div className="demo-row">
            {["STRENGTH", "WEEK 03", "MARCUS"].map((label) => (
              <span key={label} className="chip">
                {label} <span className="chip-remove">×</span>
              </span>
            ))}
          </div>
        </section>

        {/* ── 05 CARDS ── */}
        <section className="np-section" id="cards">
          <div className="section-tag">// 05</div>
          <div className="section-title">CARDS & CONTAINERS</div>
          <div className="section-desc">
            Cards use single-pixel borders. No border radius. Background is
            always slightly elevated from the page background.
          </div>
          <div
            className="demo-row"
            style={{ alignItems: "flex-start", flexWrap: "wrap" }}
          >
            <div style={{ flex: 1, minWidth: "200px" }}>
              <div className="card">
                <div className="type-label">BASE CARD</div>
                <div
                  style={{
                    marginTop: "8px",
                    fontFamily: "var(--font-body)",
                    fontSize: "13px",
                    color: "var(--text-2)",
                  }}
                >
                  Default card. Hover increases border brightness.
                </div>
              </div>
              <div className="token">.card</div>
            </div>
            <div style={{ flex: 1, minWidth: "200px" }}>
              <div className="card card-cyan" data-label="[LABELED]">
                <div className="type-label" style={{ marginBottom: "8px" }}>
                  CYAN CARD
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "13px",
                    color: "var(--text-2)",
                  }}
                >
                  Subtle cyan border for highlighted content.
                </div>
              </div>
              <div className="token">.card .card-cyan + data-label</div>
            </div>
            <div style={{ flex: 1, minWidth: "200px" }}>
              <div className="card card-glow card-active-top">
                <div className="type-label" style={{ marginBottom: "8px" }}>
                  ACTIVE TOP BORDER
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "13px",
                    color: "var(--text-2)",
                  }}
                >
                  Hover to see glow outline. Top border marks active items.
                </div>
              </div>
              <div className="token">.card .card-glow .card-active-top</div>
            </div>
          </div>
          <div className="type-label" style={{ margin: "20px 0 12px" }}>
            STAT CARDS
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))",
              gap: "12px",
            }}
          >
            <div className="stat-card">
              <div className="stat-label">BACK SQUAT MAX</div>
              <div className="stat-value accent">
                285<span style={{ fontSize: "20px", opacity: 0.5 }}> LB</span>
              </div>
              <div className="stat-sub">
                <span className="stat-delta up">↑ +15 LB</span> SINCE START
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">ADHERENCE</div>
              <div className="stat-value">87%</div>
              <div className="stat-sub">
                <span className="stat-delta up">↑ +4%</span> VS LAST WEEK
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">SESSIONS LOGGED</div>
              <div className="stat-value">47</div>
              <div className="stat-sub t-dimmer">ALL TIME</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">PROGRAM WEEK</div>
              <div className="stat-value accent">
                03<span style={{ fontSize: "18px", opacity: 0.4 }}> / 08</span>
              </div>
              <div className="stat-sub">
                <span className="stat-delta down">↓ -1</span> MISSED SESSION
              </div>
            </div>
          </div>
          <div className="type-label" style={{ margin: "20px 0 12px" }}>
            PANEL BLOCK
          </div>
          <div className="panel-block" style={{ maxWidth: "380px" }}>
            <div className="panel-block-header">
              // THIS WEEK'S LIFTS <a>VIEW ALL →</a>
            </div>
            <div
              className="panel-block-body"
              style={{
                fontSize: "12px",
                color: "var(--text-2)",
                fontFamily: "var(--font-body)",
              }}
            >
              Sectioned panel with header rule and optional action link. Used in
              sidebars and right panels.
            </div>
          </div>
        </section>

        {/* ── 06 INPUTS ── */}
        <section className="np-section" id="inputs">
          <div className="section-tag">// 06</div>
          <div className="section-title">INPUTS & FORMS</div>
          <div className="section-desc">
            All inputs are mono font, no border radius. Focus state glows cyan.
            Validation states use semantic color borders.
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "24px",
              maxWidth: "700px",
            }}
          >
            <div className="field">
              <label className="field-label">TEXT INPUT</label>
              <input
                className="input"
                type="text"
                placeholder="ENTER VALUE..."
              />
              <div className="field-hint">
                Standard text input with cyan focus ring.
              </div>
            </div>
            <div className="field">
              <label className="field-label">WITH PREFIX SYMBOL</label>
              <div className="input-group">
                <span className="input-group-prefix">&gt;_</span>
                <input className="input" type="text" placeholder="COMMAND..." />
              </div>
            </div>
            <div className="field">
              <label className="field-label">ERROR STATE</label>
              <input
                className="input input-error"
                type="text"
                defaultValue="BAD_INPUT_VALUE"
              />
              <div className="field-error">↳ FIELD CANNOT BE EMPTY</div>
            </div>
            <div className="field">
              <label className="field-label">SUCCESS STATE</label>
              <input
                className="input input-success"
                type="text"
                defaultValue="VALID_INPUT_VALUE"
              />
              <div className="field-success">↳ LOOKS GOOD</div>
            </div>
            <div className="field">
              <label className="field-label">SELECT / DROPDOWN</label>
              <select className="input">
                <option>STRENGTH_PROGRAM</option>
                <option>HYPERTROPHY_PROGRAM</option>
                <option>ENDURANCE_PROGRAM</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label">SEARCH FIELD</label>
              <div className="search-field">
                <span className="search-icon">⌕</span>
                <input type="text" placeholder="SEARCH WORKOUTS..." />
              </div>
            </div>
            <div className="field" style={{ gridColumn: "span 2" }}>
              <label className="field-label">TEXTAREA</label>
              <textarea
                className="input"
                placeholder="DESCRIBE YOUR WORKOUT NOTES..."
              />
            </div>
            <div className="field">
              <label className="field-label">RANGE SLIDER</label>
              <input
                className="range"
                type="range"
                defaultValue="65"
                min="0"
                max="100"
              />
              <div className="field-hint">65% TRAINING MAX</div>
            </div>
            <div className="field">
              <label className="field-label">DISABLED</label>
              <input
                className="input"
                type="text"
                placeholder="READ ONLY"
                disabled
              />
            </div>
          </div>
          <div className="type-label" style={{ margin: "20px 0 12px" }}>
            CHECKBOXES, RADIOS & TOGGLES
          </div>
          <div className="demo-row" style={{ flexWrap: "wrap", gap: "20px" }}>
            <div className="demo-col">
              <Checkbox label="PROGRAM_ACTIVE" defaultChecked />
              <Checkbox label="NOTIFICATIONS_ON" />
            </div>
            <div className="demo-col">
              <RadioGroup options={["STRENGTH_FOCUS", "HYPERTROPHY_FOCUS"]} />
            </div>
            <div className="demo-col">
              <Toggle label="STREAMING_ENABLED" defaultOn />
              <Toggle label="AUTO_PROGRESS" />
            </div>
          </div>
        </section>

        {/* ── 07 COLLAPSIBLE ── */}
        <section className="np-section" id="collapsible">
          <div className="section-tag">// 07</div>
          <div className="section-title">COLLAPSIBLE</div>
          <div className="section-desc">
            Accordion sections for program phases, settings, and coach details.
            Click to expand.
          </div>
          <div style={{ maxWidth: "580px" }}>
            <AccordionItem
              index={1}
              title="PHASE 1 — BASE BUILDING"
              defaultOpen
            >
              Weeks 1–2. Focus on foundational movement patterns and
              establishing baseline loads. Training intensity stays between
              65–75% of your current max. Volume is moderate — the goal is
              groove, not grind.
            </AccordionItem>
            <AccordionItem index={2} title="PHASE 2 — VOLUME ACCUMULATION">
              Weeks 3–4. Sets and reps increase. Intensity climbs to 75–85%.
              Your body adapts to higher workload — this is where real strength
              is built. Expect some fatigue. That's the point.
            </AccordionItem>
            <AccordionItem index={3} title="PHASE 3 — INTENSIFICATION">
              Weeks 5–7. Volume decreases. Intensity peaks at 85–95%. Singles,
              doubles, heavy triples. Your body is ready. Now we find out what
              you're made of.
            </AccordionItem>
            <AccordionItem index={4} title="PHASE 4 — PEAK & TEST">
              Week 8. Deload first half. Max attempts second half. This is it.
            </AccordionItem>
          </div>
        </section>

        {/* ── 08 PROGRESS ── */}
        <section className="np-section" id="progress">
          <div className="section-tag">// 08</div>
          <div className="section-title">PROGRESS BARS</div>
          <div className="section-desc">
            2px height by default — the thinness is intentional. Glow tip on the
            fill. Thick variant and animated striped variant available.
          </div>
          <div
            style={{
              maxWidth: "480px",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            {[
              ["BACK SQUAT", "285 / 300 LB", "cyan", "95%"],
              ["PROGRAM ADHERENCE", "87%", "lime", "87%"],
              ["WEEKLY VOLUME LOAD", "74%", "pink", "74%"],
              ["RECOVERY SCORE", "52%", "amber", "52%"],
            ].map(([name, val, color, w]) => (
              <div key={name} className="progress">
                <div className="progress-meta">
                  <span className="progress-name">{name}</span>
                  <span className="progress-val">{val}</span>
                </div>
                <div className="progress-track">
                  <div
                    className={`progress-fill ${color}`}
                    style={{ width: w }}
                  />
                </div>
              </div>
            ))}
            <div className="progress">
              <div className="progress-meta">
                <span className="progress-name">FATIGUE LEVEL</span>
                <span className="progress-val">38%</span>
              </div>
              <div className="progress-track thick">
                <div
                  className="progress-fill red animated"
                  style={{ width: "38%" }}
                />
              </div>
            </div>
          </div>
          <div className="type-label" style={{ margin: "20px 0 12px" }}>
            WEEK AT A GLANCE (7-DAY)
          </div>
          <div style={{ maxWidth: "280px" }}>
            <div className="week-progress">
              {["done", "done", "today", "", "", "rest", ""].map((cls, i) => (
                <div key={i} className={`week-day${cls ? " " + cls : ""}`} />
              ))}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "6px",
                fontSize: "9px",
                letterSpacing: "2px",
                color: "var(--text-3)",
              }}
            >
              {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
          </div>
        </section>

        {/* ── 09 TABLES ── */}
        <section className="np-section" id="tables">
          <div className="section-tag">// 09</div>
          <div className="section-title">TABLES</div>
          <div className="section-desc">
            Used for workout history, leaderboards, and program schedules. Row
            hover shows cyan tint.
          </div>
          <div className="table-wrap">
            <table className="np-table">
              <thead>
                <tr>
                  <th>DATE</th>
                  <th>WORKOUT</th>
                  <th>PHASE</th>
                  <th>LOAD</th>
                  <th>RPE</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>02.23</td>
                  <td className="highlight">UPPER STRENGTH A</td>
                  <td>VOLUME</td>
                  <td className="accent">4,820 LB</td>
                  <td>7.5</td>
                  <td>
                    <span className="badge badge-lime">DONE</span>
                  </td>
                </tr>
                <tr>
                  <td>02.21</td>
                  <td className="highlight">LOWER STRENGTH B</td>
                  <td>VOLUME</td>
                  <td className="accent">6,140 LB</td>
                  <td>8.0</td>
                  <td>
                    <span className="badge badge-lime">DONE</span>
                  </td>
                </tr>
                <tr>
                  <td>02.19</td>
                  <td className="highlight">METCON + UPPER A</td>
                  <td>VOLUME</td>
                  <td>3,200 LB</td>
                  <td>6.0</td>
                  <td>
                    <span className="badge badge-amber">PARTIAL</span>
                  </td>
                </tr>
                <tr>
                  <td>02.17</td>
                  <td className="highlight">LOWER STRENGTH A</td>
                  <td>BASE</td>
                  <td>—</td>
                  <td>—</td>
                  <td>
                    <span className="badge badge-red">MISSED</span>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}>WEEK TOTAL</td>
                  <td>14,160 LB</td>
                  <td>7.5 AVG</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* ── 10 LISTS ── */}
        <section className="np-section" id="lists">
          <div className="section-tag">// 10</div>
          <div className="section-title">LISTS</div>
          <div className="section-desc">
            Bordered item lists for navigation, exercise selections, and workout
            queues. Active state gets a cyan left border accent.
          </div>
          <ul className="np-list" style={{ maxWidth: "400px" }}>
            <li className="active">
              <span className="list-prefix">→</span>LOWER STRENGTH A
              <span className="list-meta">TODAY</span>
            </li>
            <li>
              <span className="list-prefix">○</span>BACK SQUAT — 5×3 @ 245LB
              <span className="list-meta">WK 03</span>
            </li>
            <li>
              <span className="list-prefix">○</span>ROMANIAN DEADLIFT — 4×6
              <span className="list-meta">ACCESSORY</span>
            </li>
            <li>
              <span className="list-prefix">○</span>SINGLE LEG PRESS — 3×10
              <span className="list-meta">ACCESSORY</span>
            </li>
            <li>
              <span className="list-prefix">○</span>HAMSTRING CURL — 3×12
              <span className="list-action">
                <button className="btn btn-xs btn-ghost">LOG</button>
              </span>
            </li>
          </ul>
        </section>

        {/* ── 11 ALERTS ── */}
        <section className="np-section" id="alerts">
          <div className="section-tag">// 11</div>
          <div className="section-title">ALERTS & NOTIFICATIONS</div>
          <div className="section-desc">
            Inline alerts for form validation, coach tips, and system messages.
            Toast variants for transient notifications.
          </div>
          <div
            style={{
              maxWidth: "580px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div className="alert alert-info">
              <span className="alert-icon">ℹ</span>
              <div className="alert-body">
                <div className="alert-title">PROGRAM UPDATED</div>
                <div className="alert-text">
                  Marcus adjusted week 4 volume based on your check-in. 2
                  workouts modified.
                </div>
              </div>
            </div>
            <div className="alert alert-success">
              <span className="alert-icon">✓</span>
              <div className="alert-body">
                <div className="alert-title">WORKOUT LOGGED</div>
                <div className="alert-text">
                  Session data saved. Back squat PR detected — new best of 285lb
                  recorded.
                </div>
              </div>
            </div>
            <div className="alert alert-warning">
              <span className="alert-icon">⚠</span>
              <div className="alert-body">
                <div className="alert-title">HIGH FATIGUE DETECTED</div>
                <div className="alert-text">
                  Your RPE trend suggests accumulated fatigue. Marcus recommends
                  a deload this week.
                </div>
              </div>
            </div>
            <div className="alert alert-error">
              <span className="alert-icon">✕</span>
              <div className="alert-body">
                <div className="alert-title">MISSED SESSION</div>
                <div className="alert-text">
                  Lower Strength A was not completed on schedule. Check in with
                  Marcus to adjust.
                </div>
              </div>
            </div>
          </div>
          <div className="type-label" style={{ margin: "20px 0 12px" }}>
            TOAST NOTIFICATIONS
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              alignItems: "flex-start",
            }}
          >
            <div className="toast toast-cyan">
              ✓ &nbsp;WORKOUT SAVED SUCCESSFULLY
            </div>
            <div className="toast toast-pink">
              <span
                className="pulse-dot"
                style={{ width: "6px", height: "6px" }}
              />{" "}
              &nbsp;COACH IS RESPONDING...
            </div>
            <div className="toast toast-amber">
              ⚠ &nbsp;CONNECTION UNSTABLE — RETRYING
            </div>
          </div>
        </section>

        {/* ── 12 MODALS ── */}
        <section className="np-section" id="modals">
          <div className="section-tag">// 12</div>
          <div className="section-title">MODALS</div>
          <div className="section-desc">
            Dialog panels for confirmations, forms, and coach program reviews.
            Use backdrop blur — not a solid overlay.
          </div>
          <div className="modal-overlay" style={{ maxWidth: "520px" }}>
            <div className="modal-header">
              <div className="modal-title">FINALIZE PROGRAM</div>
              <button className="modal-close">ESC / CLOSE</button>
            </div>
            <div className="modal-body">
              <div className="field" style={{ marginBottom: "16px" }}>
                <label className="field-label">PROGRAM NAME</label>
                <input
                  className="input"
                  type="text"
                  defaultValue="STRENGTH FOUNDATION v1.2"
                />
              </div>
              <div className="field" style={{ marginBottom: "16px" }}>
                <label className="field-label">DURATION</label>
                <select className="input">
                  <option>08 WEEKS</option>
                  <option>12 WEEKS</option>
                </select>
              </div>
              <div className="alert alert-info">
                <span className="alert-icon" style={{ fontSize: "11px" }}>
                  ℹ
                </span>
                <div className="alert-body">
                  <div className="alert-text" style={{ fontSize: "11px" }}>
                    Once finalized, Marcus will begin generating your
                    week-by-week workouts.
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost btn-sm">CANCEL</button>
              <button className="btn btn-solid btn-sm">CONFIRM & START</button>
            </div>
          </div>
        </section>

        {/* ── 13 TABS ── */}
        <section className="np-section" id="tabs">
          <div className="section-tag">// 13</div>
          <div className="section-title">TABS</div>
          <div className="type-label" style={{ marginBottom: "12px" }}>
            BORDER TABS
          </div>
          <TabGroup tabs={["OVERVIEW", "PROGRAM", "HISTORY", "SETTINGS"]} />
          <div
            style={{
              padding: "16px 0",
              fontFamily: "var(--font-body)",
              fontSize: "13px",
              color: "var(--text-2)",
            }}
          >
            Active tab content renders below the tab row.
          </div>
          <div
            className="type-label"
            style={{ marginBottom: "12px", marginTop: "20px" }}
          >
            PILL TABS
          </div>
          <PillTabGroup tabs={["ALL", "STRENGTH", "METCON", "SKILL"]} />
        </section>

        {/* ── 14 BREADCRUMBS ── */}
        <section className="np-section" id="breadcrumbs">
          <div className="section-tag">// 14</div>
          <div className="section-title">BREADCRUMBS</div>
          <div className="breadcrumb">
            <a>ROOT</a>
            <span className="breadcrumb-sep">/</span>
            <a>DASHBOARD</a>
            <span className="breadcrumb-sep">/</span>
            <a>PROGRAMS</a>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">STRENGTH_FOUNDATION_V1.2</span>
          </div>
        </section>

        {/* ── 15 TIMELINE ── */}
        <section className="np-section" id="timeline">
          <div className="section-tag">// 15</div>
          <div className="section-title">TIMELINE</div>
          <div className="section-desc">
            Program phase progression, check-in history, and session milestones.
          </div>
          <div className="timeline" style={{ maxWidth: "420px" }}>
            {[
              {
                dot: "done",
                date: "02.10 — 02.16 · WEEK 01",
                title: "BASE BUILDING COMPLETE",
                desc: "Established baseline. 4/4 sessions logged. Average RPE 6.5. Marcus noted solid technique baseline.",
              },
              {
                dot: "done",
                date: "02.17 — 02.23 · WEEK 02",
                title: "VOLUME PHASE STARTED",
                desc: "3/4 sessions. Missed Friday session — adjusted next week's plan accordingly.",
              },
              {
                dot: "active",
                date: "02.24 — PRESENT · WEEK 03",
                title: "IN PROGRESS",
                desc: "2 of 4 sessions logged. Currently on track. Wednesday session next.",
              },
              {
                dot: "",
                date: "WEEK 04 — UPCOMING",
                title: "VOLUME PEAK",
                desc: "Highest volume week of the program. Marcus will check in before this block starts.",
              },
            ].map(({ dot, date, title, desc }) => (
              <div key={title} className="timeline-item">
                <div className={`timeline-dot${dot ? " " + dot : ""}`} />
                <div className="timeline-content">
                  <div className="timeline-date">{date}</div>
                  <div className="timeline-title">{title}</div>
                  <div className="timeline-desc">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 16 CHAT ── */}
        <section className="np-section" id="chat">
          <div className="section-tag">// 16</div>
          <div className="section-title">CHAT BUBBLES</div>
          <div className="section-desc">
            Coach messages use Courier Prime to feel warmer. Typing indicator
            shows a live streaming state.
          </div>
          <div style={{ maxWidth: "540px" }}>
            <div className="panel-block">
              <div className="panel-block-header">
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <div className="pulse-dot" />
                  <span
                    style={{
                      color: "var(--cyan)",
                      fontFamily: "var(--font-display)",
                      fontSize: "18px",
                      letterSpacing: "2px",
                    }}
                  >
                    MARCUS
                  </span>
                </div>
                <span>AI_AGENT_v2.1 · ONLINE</span>
              </div>
              <div className="panel-block-body">
                <div className="chat-stream">
                  <div className="chat-msg coach">
                    <div className="chat-who">MARCUS &gt;&gt;</div>
                    <div className="chat-bubble">
                      Good. Week 3 starts today — and I want you focused. Your
                      squat numbers have been trending up, so I'm keeping the
                      load at 86% of your training max. That's intentional.
                      Don't go heavier.
                    </div>
                  </div>
                  <div className="chat-msg user">
                    <div className="chat-who">&lt;&lt; YOU</div>
                    <div className="chat-bubble">
                      What if I feel strong today? Can I add a couple pounds?
                    </div>
                  </div>
                  <div className="chat-msg coach">
                    <div className="chat-who">MARCUS &gt;&gt;</div>
                    <div className="chat-bubble">
                      No. Trust the program. You're building a platform, not
                      chasing a number. If the prescribed weight feels easy,
                      that's feedback — not permission to go heavier.
                    </div>
                  </div>
                  <div className="chat-msg coach">
                    <div className="chat-who">MARCUS &gt;&gt;</div>
                    <div className="typing-dots">
                      <div className="typing-dot" />
                      <div className="typing-dot" />
                      <div className="typing-dot" />
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: "16px" }}>
                  <div className="chat-input-bar">
                    <span className="chat-prompt">&gt;_</span>
                    <input type="text" placeholder="MESSAGE MARCUS..." />
                    <button className="btn btn-xs btn-primary">SEND</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 17 LOADING ── */}
        <section className="np-section" id="loading">
          <div className="section-tag">// 17</div>
          <div className="section-title">LOADING STATES</div>
          <div className="type-label" style={{ marginBottom: "12px" }}>
            SPINNERS
          </div>
          <div className="demo-row" style={{ alignItems: "center" }}>
            {[
              ["sm", "sm"],
              ["", "default"],
              ["lg", "lg"],
            ].map(([cls, label]) => (
              <div key={label} className="demo-col">
                <div className={`spinner${cls ? " " + cls : ""}`} />
                <div className="token">.spinner{cls ? "." + cls : ""}</div>
              </div>
            ))}
            <div className="demo-col">
              <div className="pulse-dot" />
              <div className="token">.pulse-dot</div>
            </div>
          </div>
          <div
            className="type-label"
            style={{ marginBottom: "12px", marginTop: "20px" }}
          >
            SKELETON LOADERS
          </div>
          <div
            style={{
              maxWidth: "360px",
              border: "1px solid var(--border)",
              padding: "20px",
            }}
          >
            <div
              className="skeleton skeleton-line short"
              style={{ marginBottom: "16px" }}
            />
            <div className="skeleton skeleton-line full" />
            <div className="skeleton skeleton-line full" />
            <div className="skeleton skeleton-line mid" />
          </div>
        </section>

        {/* ── 18 MISC ── */}
        <section className="np-section" id="misc">
          <div className="section-tag">// 18</div>
          <div className="section-title">MISC UTILITIES</div>
          <div className="type-label" style={{ marginBottom: "12px" }}>
            DIVIDERS
          </div>
          <div style={{ maxWidth: "500px" }}>
            <div className="divider" />
            <div className="divider-label">OR</div>
            <div className="divider" />
          </div>
          <div
            className="type-label"
            style={{ marginBottom: "12px", marginTop: "20px" }}
          >
            CODE / TERMINAL BLOCK
          </div>
          <div className="code-block" style={{ maxWidth: "500px" }}>
            <span className="cmt">// program_context.ts</span>
            <br />
            <span className="kw">const</span> context ={" "}
            <span className="kw">await</span> getProgram(
            <span className="str">'prog_001'</span>);
            <br />
            console.log(context.currentWeek);{" "}
            <span className="cmt">// → 3</span>
            <br />
            <span className="kw">return</span> context.phase[
            <span className="num">1</span>].intensity;
          </div>
          <div
            className="type-label"
            style={{ marginBottom: "12px", marginTop: "20px" }}
          >
            TOOLTIPS
          </div>
          <div className="demo-row">
            <button
              className="btn btn-ghost"
              data-tip="TRAINING MAX PERCENTAGE"
            >
              HOVER ME
            </button>
            <span
              className="badge badge-cyan"
              data-tip="COACH IS RUNNING ON CLAUDE SONNET"
            >
              AI_AGENT
            </span>
          </div>
          <div
            className="type-label"
            style={{ marginBottom: "12px", marginTop: "20px" }}
          >
            CURSORS & KEYBOARD
          </div>
          <div className="demo-row" style={{ alignItems: "center" }}>
            <span className="type-display-md">
              TITLE
              <span className="cursor" />
            </span>
            <span className="type-display-md t-pink">
              PINK
              <span className="cursor pink" />
            </span>
            <kbd>ESC</kbd>
            <kbd>⌘ K</kbd>
            <kbd>ENTER</kbd>
          </div>
          <div
            className="type-label"
            style={{ marginBottom: "12px", marginTop: "20px" }}
          >
            EMPTY STATE
          </div>
          <div
            style={{
              border: "1px solid var(--border)",
              padding: "48px",
              textAlign: "center",
              maxWidth: "400px",
            }}
          >
            <div
              className="type-display-md"
              style={{ color: "var(--text-3)", marginBottom: "12px" }}
            >
              [ EMPTY ]
            </div>
            <div
              className="type-body-sm"
              style={{ color: "var(--text-3)", marginBottom: "20px" }}
            >
              No workouts logged for this week yet. Start your first session to
              see data here.
            </div>
            <button className="btn btn-primary btn-sm">START SESSION</button>
          </div>
        </section>
      </main>
    </div>
  );
}
