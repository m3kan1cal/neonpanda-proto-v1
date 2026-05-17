import { useState } from "react";

const CopyIcon = ({ className }) => (
  <svg
    className={className}
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

const CheckIcon = ({ className }) => (
  <svg
    className={className}
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

const ICON_SIZE_CLASSES = {
  md: "w-5 h-5",
  sm: "w-4 h-4",
};

function CopyButton({ text, resetDelayMs = 2000, size = "md" }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text || "");
    setCopied(true);
    setTimeout(() => setCopied(false), resetDelayMs);
  };

  const iconClass = ICON_SIZE_CLASSES[size] || ICON_SIZE_CLASSES.md;

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 ml-1 text-synthwave-text-secondary/40 hover:text-synthwave-neon-cyan transition-colors duration-200 opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 cursor-pointer"
      title={copied ? "Copied!" : "Copy to clipboard"}
    >
      {copied ? <CheckIcon className={iconClass} /> : <CopyIcon className={iconClass} />}
      {copied && <span className="text-xs font-body">Copied!</span>}
    </button>
  );
}

export default CopyButton;
