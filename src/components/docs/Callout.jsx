function Callout({ type = "info", children }) {
  const styles = {
    info: "border-synthwave-neon-cyan/30 bg-synthwave-neon-cyan/5 text-synthwave-neon-cyan",
    tip: "border-synthwave-neon-green/30 bg-synthwave-neon-green/5 text-synthwave-neon-green",
    warning: "border-synthwave-neon-orange/30 bg-synthwave-neon-orange/5 text-synthwave-neon-orange",
  };
  const icons = {
    info: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
    tip: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    ),
    warning: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
      />
    ),
  };

  return (
    <div className={`flex items-start space-x-3 p-4 rounded-lg border ${styles[type]}`}>
      <svg
        className="w-5 h-5 shrink-0 mt-0.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        {icons[type]}
      </svg>
      <div className="font-body text-sm text-synthwave-text-secondary leading-relaxed">
        {children}
      </div>
    </div>
  );
}

export default Callout;
