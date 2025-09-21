// utils/synthwaveThemeClasses.js
export const themeClasses = {
  // Layout
  container: "bg-synthwave-gradient min-h-screen text-synthwave-text-primary font-rajdhani",

  // Hero section
  hero: "relative overflow-hidden py-24 px-8 text-center bg-synthwave-gradient before:absolute before:inset-0 before:bg-gradient-to-br before:from-synthwave-neon-pink/10 before:via-transparent before:to-synthwave-neon-cyan/10 before:pointer-events-none",

  // Typography
  heroTitle: "font-russo font-black text-5xl md:text-6xl lg:text-7xl text-gradient-neon mb-8 drop-shadow-lg",
  heroSubtitle: "font-rajdhani text-2xl text-synthwave-text-secondary mb-6",
  heroDescription: "font-rajdhani text-lg text-synthwave-text-secondary mb-12 max-w-2xl mx-auto leading-relaxed",

  // Buttons
  neonButton: "bg-transparent border-2 border-synthwave-neon-pink text-synthwave-neon-pink px-8 py-3 rounded-lg font-rajdhani font-semibold text-lg uppercase tracking-wide cursor-pointer transition-all duration-300 hover:bg-synthwave-neon-pink hover:text-synthwave-bg-primary hover:shadow-neon-pink hover:-translate-y-1 active:translate-y-0",

  cyanButton: "bg-transparent border-2 border-synthwave-neon-cyan/30 text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/10 hover:border-synthwave-neon-cyan hover:text-white hover:-translate-y-1 hover:shadow-lg hover:shadow-synthwave-neon-cyan/30 active:translate-y-0 disabled:hover:bg-transparent disabled:hover:text-synthwave-neon-cyan disabled:hover:translate-y-0 disabled:hover:shadow-none font-rajdhani font-semibold text-lg uppercase tracking-wide cursor-pointer transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-0 outline-none px-8 py-3 rounded-lg",

  // Cards
  glowCard: "bg-card-gradient border border-synthwave-neon-pink/30 rounded-xl p-8 shadow-card transition-all duration-300 hover:border-synthwave-neon-pink hover:shadow-glow hover:-translate-y-2",

  // Grid
  cardGrid: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto px-8",

  // Text styles
  cardTitle: "font-russo text-xl mb-4 uppercase tracking-wide",
  cardText: "font-rajdhani text-synthwave-text-secondary leading-relaxed",

  // Special effects
  pulseGlow: "animate-pulse-glow",
  glitch: "animate-glitch",
  gridBackground: "grid-bg animate-scroll-grid",
};
