/* ─────────────────────────────────────────────────────────────────────────
   NEONPANDA V2 — Retro UI Patterns
   Tailwind class constants mirroring every CSS block in RetroComponents.jsx.
   Import individual pattern objects or the full default export.
   ───────────────────────────────────────────────────────────────────────── */

// ── Typography ─────────────────────────────────────────────────────────────

export const typographyPatterns = {
  // Display scale (VT323)
  displayXl:
    "font-retro-display text-[72px] tracking-[4px] leading-none text-retro-text-1",
  displayLg:
    "font-retro-display text-[48px] tracking-[3px] leading-none text-retro-text-1",
  displayMd:
    "font-retro-display text-[32px] tracking-[2px] leading-[1.1] text-retro-text-1",
  displaySm:
    "font-retro-display text-[24px] tracking-[1px] leading-[1.2] text-retro-text-1",

  // Mono scale (Share Tech Mono)
  monoLg: "font-retro-mono text-[16px] tracking-[1.5px] text-retro-text-1",
  monoMd: "font-retro-mono text-[14px] tracking-[1px] text-retro-text-1",
  monoSm: "font-retro-mono text-[12px] tracking-[1.5px] text-retro-text-2",
  monoXs:
    "font-retro-mono text-[10px] tracking-[3px] uppercase text-retro-text-3",

  // Body scale (Courier Prime)
  body: "font-retro-body text-[15px] leading-[1.75] tracking-[0.3px] text-retro-text-1",
  bodySm:
    "font-retro-body text-[13px] leading-[1.65] tracking-[0.3px] text-retro-text-2",
  bodyI: "font-retro-body text-[15px] italic text-retro-text-2",
  label:
    "font-retro-mono text-[10px] tracking-[4px] uppercase text-retro-text-3",

  // Color modifiers
  cyan: "text-retro-cyan [text-shadow:0_0_10px_rgba(0,255,255,0.45)]",
  pink: "text-retro-pink [text-shadow:0_0_10px_rgba(255,0,128,0.45)]",
  lime: "text-retro-lime",
  amber: "text-retro-amber",
  dim: "text-retro-text-2",
  dimmer: "text-retro-text-3",

  // Blinking cursor
  cursor:
    "inline-block w-[9px] h-[1.1em] bg-retro-cyan align-middle ml-[2px] shadow-[0_0_8px_#00ffff] animate-np-blink",
  cursorPink:
    "inline-block w-[9px] h-[1.1em] bg-retro-pink align-middle ml-[2px] shadow-[0_0_8px_#ff0080] animate-np-blink",
};

// ── Buttons ────────────────────────────────────────────────────────────────

const BTN_BASE =
  "inline-flex items-center gap-2 font-retro-mono text-[12px] tracking-[2.5px] uppercase px-[22px] py-[10px] border cursor-pointer transition-all duration-[220ms] ease-[cubic-bezier(0.16,1,0.3,1)] relative overflow-hidden whitespace-nowrap active:scale-[0.98]";

export const buttonPatterns = {
  base: BTN_BASE,

  // Variants (combine with base)
  primary: `${BTN_BASE} border-retro-cyan text-retro-cyan [text-shadow:0_0_8px_rgba(0,255,255,0.45)] hover:bg-retro-cyan-dim hover:shadow-[0_0_16px_rgba(0,255,255,0.15)]`,
  solid: `${BTN_BASE} border-retro-cyan bg-retro-cyan text-retro-bg font-bold shadow-[0_0_20px_rgba(0,255,255,0.2)] hover:bg-[#33ffff] hover:shadow-[0_0_28px_rgba(0,255,255,0.35)]`,
  pink: `${BTN_BASE} border-retro-pink text-retro-pink [text-shadow:0_0_8px_rgba(255,0,128,0.45)] hover:bg-retro-pink-dim hover:shadow-[0_0_16px_rgba(255,0,128,0.15)]`,
  purple: `${BTN_BASE} border-retro-purple text-retro-purple [text-shadow:0_0_8px_rgba(159,0,255,0.45)] hover:bg-retro-purple-dim hover:shadow-[0_0_16px_rgba(159,0,255,0.18)]`,
  ghost: `${BTN_BASE} border-retro-border-mid text-retro-text-2 hover:border-retro-border-hot hover:text-retro-text-1`,
  danger: `${BTN_BASE} border-retro-pink text-retro-pink hover:bg-retro-pink-dim hover:shadow-[0_0_12px_rgba(255,0,128,0.2)]`,

  // Sizes (append to a variant)
  lg: "px-7 py-[13px] text-[12px] tracking-[3px]",
  sm: "px-[14px] py-[6px] text-[9px] tracking-[2px]",
  xs: "px-[10px] py-[3px] text-[8px] tracking-[2px]",
  block: "w-full justify-center",

  // States
  disabled: "opacity-30 cursor-not-allowed pointer-events-none",
  prefix: "text-[14px] opacity-70",
  loading: "animate-np-spin-slow",
};

// ── Badges ─────────────────────────────────────────────────────────────────

const BADGE_BASE =
  "inline-flex items-center gap-[5px] font-retro-mono text-[10px] tracking-[2.5px] uppercase px-[9px] py-[3px] border whitespace-nowrap";

export const badgePatterns = {
  base: BADGE_BASE,

  // Color variants
  cyan: `${BADGE_BASE} border-[rgba(0,255,255,0.35)] text-retro-cyan bg-retro-cyan-dim`,
  pink: `${BADGE_BASE} border-[rgba(255,0,128,0.35)] text-retro-pink bg-retro-pink-dim`,
  purple: `${BADGE_BASE} border-[rgba(159,0,255,0.35)] text-retro-purple bg-retro-purple-dim`,
  lime: `${BADGE_BASE} border-[rgba(57,255,20,0.3)] text-retro-lime bg-retro-lime-dim`,
  amber: `${BADGE_BASE} border-[rgba(255,107,53,0.3)] text-retro-amber bg-retro-amber-dim`,
  red: `${BADGE_BASE} border-[rgba(255,0,128,0.3)] text-retro-pink bg-retro-pink-dim`,
  ghost: `${BADGE_BASE} border-retro-border text-retro-text-3 bg-transparent`,

  // Modifiers (append to a color variant)
  pill: "rounded-full",
  lg: "text-[10px] tracking-[2px] px-[12px] py-[5px]",
  online: "animate-np-badge-pulse",

  // Dot indicator inside badge
  dot: "w-[5px] h-[5px] rounded-full bg-current shadow-[0_0_5px_currentColor] shrink-0",
};

// ── Chips ──────────────────────────────────────────────────────────────────

export const chipPatterns = {
  chip: "inline-flex items-center gap-[5px] text-[9px] tracking-[2px] uppercase px-[8px] py-[2px] bg-retro-bg-raised border border-retro-border text-retro-text-2 cursor-default transition-all duration-[120ms] hover:border-retro-border-mid hover:text-retro-text-1",
  remove:
    "text-[11px] cursor-pointer text-retro-text-3 ml-[2px] transition-colors duration-[120ms] hover:text-retro-pink",
};

// ── Cards ──────────────────────────────────────────────────────────────────

const CARD_BASE =
  "border border-retro-border bg-retro-bg-card p-6 relative transition-[border-color] duration-[220ms] hover:border-retro-border-mid";

export const cardPatterns = {
  base: CARD_BASE,
  raised: `${CARD_BASE} bg-retro-bg-raised`,
  cyan: `${CARD_BASE} border-[rgba(0,255,255,0.2)] hover:border-[rgba(0,255,255,0.4)]`,
  glow: `${CARD_BASE} retro-card-glow`,
  activeTop: `${CARD_BASE} border-t-2 border-t-retro-cyan shadow-[0_-2px_12px_rgba(0,255,255,0.2)]`,
  divider: "h-px bg-retro-border my-5",
};

// ── Stat Cards ─────────────────────────────────────────────────────────────

export const statCardPatterns = {
  card: "border border-retro-border bg-retro-bg-card px-6 py-5",
  label: "text-[9px] tracking-[4px] text-retro-text-3 uppercase mb-[4px]",
  value:
    "font-retro-display text-[42px] tracking-[2px] leading-none text-retro-text-1",
  valueAccent:
    "font-retro-display text-[42px] tracking-[2px] leading-none text-retro-cyan [text-shadow:0_0_16px_rgba(0,255,255,0.3)]",
  sub: "text-[10px] tracking-[2px] text-retro-text-3 mt-[4px]",
  deltaUp: "text-[10px] tracking-[1px] text-retro-lime",
  deltaDown: "text-[10px] tracking-[1px] text-retro-pink",
};

// ── Panel Block ────────────────────────────────────────────────────────────

export const panelPatterns = {
  block: "border border-retro-border bg-retro-bg-card overflow-hidden",
  header:
    "px-6 py-4 border-b border-retro-border flex justify-between items-center text-[9px] tracking-[3px] text-retro-text-3 uppercase",
  headerLink:
    "text-retro-cyan cursor-pointer text-[8px] no-underline opacity-70 transition-opacity duration-[120ms] hover:opacity-100",
  body: "px-6 py-5",
};

// ── Inputs & Forms ─────────────────────────────────────────────────────────

const INPUT_BASE =
  "w-full bg-retro-bg-card border border-retro-border-mid text-retro-text-1 font-retro-mono text-[13px] tracking-[1px] px-4 py-[10px] outline-none transition-all duration-[220ms] [caret-color:#00ffff] placeholder:text-retro-text-3 focus:border-retro-cyan focus:bg-[rgba(0,255,255,0.03)] focus:shadow-[0_0_0_1px_rgba(0,255,255,0.08)]";

export const fieldPatterns = {
  wrapper: "flex flex-col gap-2",
  label: "text-[9px] tracking-[3px] uppercase text-retro-text-3",
  hint: "text-[10px] tracking-[1px] text-retro-text-3 font-retro-body",
  error: "text-[10px] tracking-[1px] text-retro-pink font-retro-body",
  success: "text-[10px] tracking-[1px] text-retro-lime font-retro-body",
};

export const inputPatterns = {
  base: INPUT_BASE,
  error: `${INPUT_BASE} border-retro-pink`,
  success: `${INPUT_BASE} border-retro-lime`,
  disabled: `${INPUT_BASE} opacity-30 cursor-not-allowed`,
  textarea: `${INPUT_BASE} resize-y min-h-[90px] leading-[1.6]`,

  // Input group (prefix symbol)
  group:
    "flex items-center border border-retro-border-mid bg-retro-bg-card transition-[border-color] duration-[220ms] focus-within:border-retro-cyan focus-within:bg-[rgba(0,255,255,0.03)]",
  groupPrefix: "px-3 text-retro-cyan text-[13px] opacity-60 shrink-0",
  groupInput:
    "flex-1 bg-transparent border-none outline-none font-retro-mono text-[13px] tracking-[1px] text-retro-text-1 [caret-color:#00ffff] placeholder:text-retro-text-3 py-[10px] pr-4",

  // Search field
  searchWrapper:
    "flex items-center gap-3 border border-retro-border-mid bg-retro-bg-card px-4 py-[10px] transition-[border-color] duration-[220ms] focus-within:border-retro-cyan",
  searchIcon: "text-[12px] text-retro-text-3 shrink-0",
  searchInput:
    "flex-1 bg-transparent border-none outline-none font-retro-mono text-[12px] tracking-[1px] text-retro-text-1 [caret-color:#00ffff] placeholder:text-retro-text-3",

  // Range slider
  range:
    "[appearance:none] w-full h-[2px] bg-retro-border-mid outline-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[14px] [&::-webkit-slider-thumb]:h-[14px] [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-retro-cyan [&::-webkit-slider-thumb]:bg-retro-bg [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(0,255,255,0.3)]",
};

// ── Toggle ─────────────────────────────────────────────────────────────────

export const togglePatterns = {
  container: "flex items-center gap-3 cursor-pointer",
  track:
    "w-[38px] h-[20px] border border-retro-border-mid bg-retro-bg-card relative transition-all duration-[220ms] shrink-0",
  trackOn:
    "w-[38px] h-[20px] border border-retro-cyan bg-retro-cyan-dim shadow-[0_0_10px_rgba(0,255,255,0.1)] relative transition-all duration-[220ms] shrink-0",
  thumb:
    "absolute top-[3px] left-[3px] w-[12px] h-[12px] bg-retro-text-3 transition-all duration-[220ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
  thumbOn:
    "absolute top-[3px] left-[21px] w-[12px] h-[12px] bg-retro-cyan shadow-[0_0_8px_#00ffff] transition-all duration-[220ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
};

// ── Checkbox & Radio ────────────────────────────────────────────────────────

export const checkPatterns = {
  group: "flex items-center gap-3 cursor-pointer",

  // Checkbox
  box: "w-[16px] h-[16px] border border-retro-border-mid bg-retro-bg-card flex items-center justify-center shrink-0 transition-all duration-[120ms] cursor-pointer group-hover:border-retro-cyan",
  boxChecked:
    "w-[16px] h-[16px] border border-retro-cyan bg-retro-cyan-dim flex items-center justify-center shrink-0",
  checkmark:
    "text-[10px] text-retro-cyan [text-shadow:0_0_6px_rgba(0,255,255,0.45)]",

  // Radio
  radio:
    "w-[14px] h-[14px] border border-retro-border-mid rounded-full bg-retro-bg-card flex items-center justify-center shrink-0 transition-all duration-[120ms]",
  radioChecked:
    "w-[14px] h-[14px] border border-retro-cyan rounded-full bg-retro-bg-card flex items-center justify-center shrink-0",
  radioDot:
    "w-[6px] h-[6px] rounded-full bg-retro-cyan shadow-[0_0_6px_#00ffff]",
};

// ── Accordion ──────────────────────────────────────────────────────────────

export const accordionPatterns = {
  wrapper: "border border-retro-border overflow-hidden retro-accordion",

  trigger:
    "w-full flex items-center justify-between px-6 py-4 bg-retro-bg-card border-none cursor-pointer font-retro-mono text-[12px] tracking-[2px] uppercase text-retro-text-2 text-left transition-all duration-[120ms] gap-3 hover:bg-retro-cyan-dim hover:text-retro-text-1",
  triggerOpen:
    "w-full flex items-center justify-between px-6 py-4 bg-retro-cyan-dim border-none cursor-pointer font-retro-mono text-[12px] tracking-[2px] uppercase text-retro-cyan text-left transition-all duration-[120ms] gap-3 [text-shadow:0_0_8px_rgba(0,255,255,0.2)]",

  icon: "text-[14px] text-retro-text-3 shrink-0 transition-transform duration-[220ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
  iconOpen:
    "text-[14px] text-retro-cyan shrink-0 rotate-90 transition-transform duration-[220ms] ease-[cubic-bezier(0.16,1,0.3,1)]",

  prefix: "text-retro-text-3 text-[10px] mr-2",
  prefixOpen: "text-retro-cyan text-[10px] mr-2",

  body: "max-h-0 overflow-hidden [transition:max-height_0.35s_cubic-bezier(0.16,1,0.3,1)] bg-retro-bg",
  bodyOpen:
    "max-h-[500px] overflow-hidden [transition:max-height_0.35s_cubic-bezier(0.16,1,0.3,1)] bg-retro-bg border-t border-retro-border",
  bodyInner:
    "px-6 py-5 font-retro-body text-[14px] text-retro-text-2 leading-[1.75]",
};

// ── Progress ────────────────────────────────────────────────────────────────

export const progressPatterns = {
  wrapper: "flex flex-col gap-2",
  meta: "flex justify-between items-baseline",
  name: "text-[10px] tracking-[1.5px] text-retro-text-2",
  val: "font-retro-display text-[18px] tracking-[1px] text-retro-text-1",

  track: "h-[2px] bg-[rgba(255,255,255,0.05)] relative overflow-hidden",
  trackThick: "h-[6px] bg-[rgba(255,255,255,0.05)] relative overflow-hidden",

  // All fill variants include the retro-progress-fill utility for the glow tip
  fillCyan:
    "retro-progress-fill bg-retro-cyan shadow-[0_0_8px_rgba(0,255,255,0.45)]",
  fillPink:
    "retro-progress-fill bg-retro-pink shadow-[0_0_8px_rgba(255,0,128,0.45)]",
  fillLime:
    "retro-progress-fill bg-retro-lime shadow-[0_0_8px_rgba(57,255,20,0.4)]",
  fillAmber:
    "retro-progress-fill bg-retro-amber shadow-[0_0_8px_rgba(255,107,53,0.4)]",
  fillRed:
    "retro-progress-fill bg-retro-pink shadow-[0_0_8px_rgba(255,0,128,0.4)]",
  fillAnimated:
    "retro-progress-fill bg-[repeating-linear-gradient(-45deg,transparent,transparent_4px,rgba(255,255,255,0.08)_4px,rgba(255,255,255,0.08)_8px)] animate-np-stripe",
};

// ── Week Progress ───────────────────────────────────────────────────────────

export const weekPatterns = {
  grid: "grid grid-cols-7 gap-[3px]",
  day: "h-[4px] bg-retro-border transition-all duration-[220ms]",
  done: "h-[4px] bg-retro-cyan shadow-[0_0_6px_rgba(0,255,255,0.4)]",
  today:
    "h-[4px] bg-retro-pink shadow-[0_0_6px_rgba(255,0,128,0.4)] animate-np-blink-slow",
  rest: "h-[4px] bg-[rgba(255,255,255,0.03)]",
  labels:
    "flex justify-between mt-[6px] text-[9px] tracking-[2px] text-retro-text-3",
};

// ── Table ───────────────────────────────────────────────────────────────────

export const tablePatterns = {
  wrap: "overflow-x-auto",
  table: "w-full border-collapse text-[12px] tracking-[1px]",
  theadRow: "border-b border-retro-border-mid",
  th: "px-5 py-3 text-left text-[9px] tracking-[3px] uppercase text-retro-text-3 font-normal",
  tbodyRow:
    "border-b border-[rgba(255,255,255,0.03)] transition-[background] duration-[120ms] hover:bg-retro-cyan-dim",
  td: "px-5 py-3 text-retro-text-2 align-middle",
  tdHighlight: "px-5 py-3 text-retro-text-1 align-middle",
  tdAccent: "px-5 py-3 text-retro-cyan align-middle",
  tfootRow: "border-t border-retro-border-mid",
  tfootTd: "px-5 py-3 text-retro-text-3 text-[9px] tracking-[2px]",
};

// ── Lists ───────────────────────────────────────────────────────────────────

export const listPatterns = {
  list: "list-none border border-retro-border overflow-hidden",
  item: "px-6 py-4 border-b border-[rgba(255,255,255,0.03)] last:border-b-0 flex items-center gap-4 text-[13px] tracking-[1px] text-retro-text-2 transition-all duration-[120ms] hover:bg-retro-cyan-dim hover:text-retro-text-1",
  active:
    "px-6 py-4 border-b border-[rgba(255,255,255,0.03)] last:border-b-0 flex items-center gap-4 text-[13px] tracking-[1px] text-retro-cyan bg-retro-cyan-dim border-l-2 border-l-retro-cyan [text-shadow:0_0_8px_rgba(0,255,255,0.2)]",
  prefix: "text-retro-text-3 text-[10px] shrink-0",
  action: "ml-auto",
  meta: "ml-auto text-[9px] tracking-[2px] text-retro-text-3",
};

// ── Alerts ──────────────────────────────────────────────────────────────────

export const alertPatterns = {
  base: "border px-6 py-4 flex gap-4 items-start",
  icon: "text-[14px] shrink-0 mt-[1px]",
  body: "flex-1",
  title: "text-[11px] tracking-[2px] uppercase mb-[4px]",
  text: "font-retro-body text-[13px] text-retro-text-2 leading-[1.55]",

  info: "border-[rgba(0,255,255,0.25)] bg-retro-cyan-dim [&_.alert-icon]:text-retro-cyan [&_.alert-title]:text-retro-cyan",
  success:
    "border-[rgba(57,255,20,0.25)] bg-retro-lime-dim [&_.alert-icon]:text-retro-lime [&_.alert-title]:text-retro-lime",
  warning:
    "border-[rgba(255,107,53,0.25)] bg-retro-orange-dim [&_.alert-icon]:text-retro-amber [&_.alert-title]:text-retro-amber",
  error:
    "border-[rgba(255,0,128,0.25)] bg-retro-pink-dim [&_.alert-icon]:text-retro-pink [&_.alert-title]:text-retro-pink",

  // Alert variants with explicit icon/title color (for use without CSS child selectors)
  infoIcon: "text-retro-cyan text-[14px] shrink-0 mt-[1px]",
  infoTitle: "text-[11px] tracking-[2px] uppercase mb-[4px] text-retro-cyan",
  successIcon: "text-retro-lime text-[14px] shrink-0 mt-[1px]",
  successTitle: "text-[11px] tracking-[2px] uppercase mb-[4px] text-retro-lime",
  warningIcon: "text-retro-amber text-[14px] shrink-0 mt-[1px]",
  warningTitle:
    "text-[11px] tracking-[2px] uppercase mb-[4px] text-retro-amber",
  errorIcon: "text-retro-pink text-[14px] shrink-0 mt-[1px]",
  errorTitle: "text-[11px] tracking-[2px] uppercase mb-[4px] text-retro-pink",
};

// ── Toasts ──────────────────────────────────────────────────────────────────

export const toastPatterns = {
  base: "inline-flex items-center gap-3 px-5 py-3 border bg-retro-bg-raised text-[11px] tracking-[1.5px] shadow-[0_8px_32px_rgba(0,0,0,0.5)]",
  cyan: "inline-flex items-center gap-3 px-5 py-3 border border-[rgba(0,255,255,0.35)] bg-retro-bg-raised text-retro-cyan text-[11px] tracking-[1.5px] shadow-[0_8px_32px_rgba(0,0,0,0.5)]",
  pink: "inline-flex items-center gap-3 px-5 py-3 border border-[rgba(255,0,128,0.35)] bg-retro-bg-raised text-retro-pink text-[11px] tracking-[1.5px] shadow-[0_8px_32px_rgba(0,0,0,0.5)]",
  amber:
    "inline-flex items-center gap-3 px-5 py-3 border border-[rgba(255,107,53,0.35)] bg-retro-bg-raised text-retro-amber text-[11px] tracking-[1.5px] shadow-[0_8px_32px_rgba(0,0,0,0.5)]",
};

// ── Modal ───────────────────────────────────────────────────────────────────

export const modalPatterns = {
  overlay:
    "relative bg-[rgba(26,13,46,0.92)] border border-retro-border backdrop-blur-[4px] overflow-hidden",
  header:
    "px-6 py-5 border-b border-retro-border flex justify-between items-center",
  title: "font-retro-display text-[28px] tracking-[2px] text-retro-text-1",
  close:
    "text-[12px] tracking-[2px] text-retro-text-3 cursor-pointer border border-retro-border px-[10px] py-[3px] bg-transparent font-retro-mono transition-all duration-[120ms] hover:border-retro-pink hover:text-retro-pink",
  body: "p-6",
  footer: "px-6 py-5 border-t border-retro-border flex justify-end gap-3",
};

// ── Tabs ────────────────────────────────────────────────────────────────────

export const tabPatterns = {
  // Border tabs
  tabs: "flex border-b border-retro-border",
  tab: "px-5 py-[10px] font-retro-mono text-[10px] tracking-[2.5px] uppercase text-retro-text-3 cursor-pointer border-b-2 border-b-transparent -mb-px transition-all duration-[120ms] border-t border-l border-r border-t-transparent border-l-transparent border-r-transparent hover:text-retro-text-2",
  tabActive:
    "px-5 py-[10px] font-retro-mono text-[10px] tracking-[2.5px] uppercase text-retro-cyan cursor-pointer border-b-2 border-b-retro-bg -mb-px bg-retro-bg-card border-t border-l border-r border-t-retro-border border-l-retro-border border-r-retro-border [text-shadow:0_0_8px_rgba(0,255,255,0.25)]",

  // Pill tabs
  pillTabs: "flex gap-2 p-2 border border-retro-border bg-retro-bg-card w-fit",
  pill: "px-4 py-[7px] font-retro-mono text-[10px] tracking-[2px] uppercase text-retro-text-3 cursor-pointer border border-transparent transition-all duration-[120ms] hover:text-retro-text-2",
  pillActive:
    "px-4 py-[7px] font-retro-mono text-[10px] tracking-[2px] uppercase text-retro-cyan cursor-pointer border border-retro-border-mid bg-retro-cyan-dim",
};

// ── Breadcrumb ──────────────────────────────────────────────────────────────

export const breadcrumbPatterns = {
  container:
    "flex items-center gap-2 text-[9px] tracking-[3px] uppercase text-retro-text-3",
  link: "text-retro-text-3 no-underline transition-colors duration-[120ms] cursor-pointer hover:text-retro-cyan",
  sep: "text-retro-text-4",
  current: "text-retro-text-2",
};

// ── Timeline ────────────────────────────────────────────────────────────────

export const timelinePatterns = {
  container: "flex flex-col",
  item: "retro-timeline-item",

  dot: "w-[15px] h-[15px] border border-retro-border-mid bg-retro-bg-card shrink-0 mt-[4px] relative z-[1] flex items-center justify-center transition-all duration-[220ms]",
  dotDone:
    "w-[15px] h-[15px] retro-timeline-dot-done shrink-0 mt-[4px] relative z-[1] flex items-center justify-center",
  dotActive:
    "w-[15px] h-[15px] retro-timeline-dot-active shrink-0 mt-[4px] relative z-[1] flex items-center justify-center",

  content: "flex-1 pb-5",
  date: "text-[9px] tracking-[3px] text-retro-text-3 uppercase mb-[2px]",
  title: "text-[12px] tracking-[1px] text-retro-text-1 mb-[4px]",
  desc: "font-retro-body text-[12px] text-retro-text-2 leading-[1.6]",
};

// ── Chat ─────────────────────────────────────────────────────────────────────

export const chatPatterns = {
  stream: "flex flex-col gap-5",
  msg: "flex flex-col gap-[3px]",
  msgUser: "flex flex-col gap-[3px] items-end",
  whoCoach: "text-[9px] tracking-[3px] uppercase text-[rgba(0,255,255,0.45)]",
  whoUser: "text-[9px] tracking-[3px] uppercase text-[rgba(255,0,128,0.5)]",
  bubble:
    "font-retro-body text-[14px] leading-[1.7] text-retro-text-2 max-w-[75%] tracking-[0.3px]",
  bubbleUser:
    "font-retro-body text-[14px] leading-[1.7] text-retro-text-1 max-w-[75%] tracking-[0.3px] text-right",

  inputBar:
    "flex items-center gap-3 border border-retro-border-mid px-4 py-[10px] bg-retro-bg-card transition-[border-color] duration-[220ms] focus-within:border-retro-cyan",
  prompt: "text-retro-cyan opacity-60 text-[13px] shrink-0",
  input:
    "flex-1 bg-transparent border-none outline-none font-retro-mono text-[13px] tracking-[1px] text-retro-text-1 [caret-color:#00ffff] placeholder:text-retro-text-3",

  typingDots: "flex gap-[4px] items-center py-[2px]",
  typingDot: "w-[4px] h-[4px] bg-retro-cyan rounded-full animate-np-tdot",
};

// ── Loading ──────────────────────────────────────────────────────────────────

export const loadingPatterns = {
  // Spinners
  spinner:
    "w-[20px] h-[20px] border border-retro-border-mid border-t-retro-cyan rounded-full animate-np-spin",
  spinnerSm:
    "w-[14px] h-[14px] border border-retro-border-mid border-t-retro-cyan rounded-full animate-np-spin",
  spinnerLg:
    "w-[32px] h-[32px] border border-retro-border-mid border-t-retro-cyan rounded-full animate-np-spin",

  // Skeleton lines — uses CSS classes from theme.css (shimmer animation + bg-size)
  skeletonShort:
    "h-[12px] mb-[12px] w-[40%] bg-[linear-gradient(90deg,#1e1e2e_25%,#2a1a4a_50%,#1e1e2e_75%)] [background-size:200%_100%] animate-np-shimmer",
  skeletonMid:
    "h-[12px] mb-[12px] w-[65%] bg-[linear-gradient(90deg,#1e1e2e_25%,#2a1a4a_50%,#1e1e2e_75%)] [background-size:200%_100%] animate-np-shimmer",
  skeletonFull:
    "h-[12px] mb-[12px] w-full bg-[linear-gradient(90deg,#1e1e2e_25%,#2a1a4a_50%,#1e1e2e_75%)] [background-size:200%_100%] animate-np-shimmer",

  // Pulse dot
  pulseDot:
    "w-[8px] h-[8px] rounded-full bg-retro-cyan shadow-[0_0_8px_#00ffff] animate-np-pulse-dot",
};

// ── Misc ─────────────────────────────────────────────────────────────────────

export const miscPatterns = {
  divider: "h-px bg-retro-border my-6",
  dividerLabel: "retro-divider-label",

  codeBlock:
    "bg-[rgba(0,0,0,0.4)] border border-retro-border border-l-2 border-l-retro-cyan px-5 py-4 font-retro-mono text-[11px] text-retro-text-2 tracking-[0.5px] leading-[1.8] overflow-x-auto",
  codeKw: "text-retro-cyan",
  codeStr: "text-retro-lime",
  codeNum: "text-retro-amber",
  codeCmt: "text-retro-text-3 italic",

  kbd: "inline-block px-[7px] py-[2px] border border-retro-border-mid bg-retro-bg-raised font-retro-mono text-[9px] tracking-[1px] text-retro-text-2 align-middle",
};

// ── Nav (sidebar layout) ─────────────────────────────────────────────────────

export const navPatterns = {
  nav: "fixed top-0 left-0 w-[220px] h-screen border-r border-retro-border bg-retro-bg py-6 overflow-y-auto z-[100]",
  logo: "font-retro-display text-[26px] tracking-[3px] text-retro-cyan [text-shadow:0_0_14px_rgba(0,255,255,0.45)] px-6 pb-5 border-b border-retro-border mb-3",
  logoAccent: "text-retro-pink [text-shadow:0_0_14px_rgba(255,0,128,0.45)]",
  section:
    "px-6 pt-3 pb-1 text-[9px] tracking-[3px] text-retro-text-3 uppercase",
  link: "block px-6 py-2 text-[12px] tracking-[1.5px] text-retro-text-2 no-underline border-l-2 border-l-transparent transition-all duration-[120ms] hover:text-retro-cyan hover:bg-retro-cyan-dim hover:border-l-retro-border-mid",
  main: "ml-[220px] p-12 max-w-[1100px]",
};

// ── Section layout (demo/docs pages) ────────────────────────────────────────

export const sectionPatterns = {
  section:
    "mb-12 pt-8 border-t border-retro-border first:border-t-0 first:pt-0",
  tag: "text-[9px] tracking-[4px] text-retro-text-3 uppercase mb-2",
  title:
    "font-retro-display text-[44px] tracking-[3px] text-retro-text-1 leading-none mb-3",
  desc: "font-retro-body text-[14px] text-retro-text-2 tracking-[0.3px] max-w-[540px] mb-6",
  demoRow: "flex flex-wrap gap-4 items-start mb-5",
  demoCol: "flex flex-col gap-3",
  token: "text-[10px] tracking-[2px] text-retro-text-3 mt-1",
};

// ── Default export ────────────────────────────────────────────────────────────

const uiPatterns = {
  typographyPatterns,
  buttonPatterns,
  badgePatterns,
  chipPatterns,
  cardPatterns,
  statCardPatterns,
  panelPatterns,
  fieldPatterns,
  inputPatterns,
  togglePatterns,
  checkPatterns,
  accordionPatterns,
  progressPatterns,
  weekPatterns,
  tablePatterns,
  listPatterns,
  alertPatterns,
  toastPatterns,
  modalPatterns,
  tabPatterns,
  breadcrumbPatterns,
  timelinePatterns,
  chatPatterns,
  loadingPatterns,
  miscPatterns,
  navPatterns,
  sectionPatterns,
};

export default uiPatterns;
