/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Synthwave color palette
        synthwave: {
          // Backgrounds
          'bg-primary': '#0a0a0a',
          'bg-secondary': '#1a0d2e',
          'bg-tertiary': '#16213e',
          'bg-card': '#1e1e2e',

          // Neon colors
          'neon-pink': '#ff0080',
          'neon-cyan': '#00ffff',
          'neon-purple': '#8b5cf6',
          'neon-green': '#39ff14',
          'neon-orange': '#ff6b35',

          // Text colors
          'text-primary': '#ffffff',
          'text-secondary': '#b4b4b4',
          'text-muted': '#666666',
        }
      },
      fontFamily: {
        'orbitron': ['"Orbitron"', 'monospace'],
        'rajdhani': ['"Rajdhani"', 'sans-serif'],
        'russo': ['"Russo One"', 'sans-serif'],
      },
      backgroundImage: {
        'synthwave-gradient': 'linear-gradient(135deg, #0a0a0a 0%, #1a0d2e 50%, #16213e 100%)',
        'neon-gradient': 'linear-gradient(45deg, #ff0080 0%, #00ffff 100%)',
        'purple-gradient': 'linear-gradient(45deg, #8b5cf6 0%, #ff0080 100%)',
        'card-gradient': 'linear-gradient(145deg, #1e1e2e 0%, #2a2a3e 100%)',
        'grid-pattern': `
          linear-gradient(rgba(255, 0, 128, 0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 0, 128, 0.1) 1px, transparent 1px)
        `,
      },
      boxShadow: {
        'neon-pink': '0 0 20px #ff0080, 0 0 40px #ff0080, 0 0 60px #ff0080',
        'neon-cyan': '0 0 20px #00ffff, 0 0 40px #00ffff, 0 0 60px #00ffff',
        'neon-purple': '0 0 20px #8b5cf6, 0 0 40px #8b5cf6, 0 0 60px #8b5cf6',
        'glow': '0 0 30px rgba(255, 0, 128, 0.3)',
        'card': '0 8px 32px rgba(0, 0, 0, 0.5)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite alternate',
        'glitch': 'glitch 2s infinite',
        'scroll-grid': 'scroll-grid 20s linear infinite',
      },
      keyframes: {
        'pulse-glow': {
          'from': { boxShadow: '0 0 20px rgba(255, 0, 128, 0.4)' },
          'to': { boxShadow: '0 0 40px rgba(255, 0, 128, 0.8)' },
        },
        'glitch': {
          '0%, 100%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(-2px, -2px)' },
          '60%': { transform: 'translate(2px, 2px)' },
          '80%': { transform: 'translate(2px, -2px)' },
        },
        'scroll-grid': {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '50px 50px' },
        },
      },
    },
  },
  plugins: [],
}