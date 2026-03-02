import { useState } from "react";

const CopyIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
    />
  </svg>
);

const CheckIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 13l4 4L19 7"
    />
  </svg>
);

function CopyButton({ text, resetDelayMs = 2000 }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text || "");
    setCopied(true);
    setTimeout(() => setCopied(false), resetDelayMs);
  };

  return (
    <button
      onClick={handleCopy}
      className="self-start flex items-center gap-1 ml-1 text-synthwave-text-secondary/40 hover:text-synthwave-neon-cyan transition-colors duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100"
      title={copied ? "Copied!" : "Copy to clipboard"}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
      {copied && <span className="text-xs font-rajdhani">Copied!</span>}
    </button>
  );
}

export default CopyButton;
