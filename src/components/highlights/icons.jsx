// Shared icons for the highlights section

// AI sparkle icon — two 4-pointed stars with wide arms so they read
// clearly as filled shapes at w-3 h-3 through w-6 h-6.
export function SparklesIcon({ className = "w-4 h-4" }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {/* Large 4-pointed star centred at (12, 13), outer r=9, inner r=3.5 */}
      <path d="M12 4 L14.47 10.53 L21 13 L14.47 15.47 L12 22 L9.53 15.47 L3 13 L9.53 10.53 Z" />
      {/* Small accent star at top-right, centred at (19, 6), outer r=3, inner r=1.2 */}
      <path d="M19 3 L19.85 5.15 L22 6 L19.85 6.85 L19 9 L18.15 6.85 L16 6 L18.15 5.15 Z" />
    </svg>
  );
}
