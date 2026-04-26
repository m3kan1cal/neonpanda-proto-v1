import {
  buttonPatterns,
  containerPatterns,
  typographyPatterns,
} from "../../utils/ui/uiPatterns";

export default function EmptyStateCard({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) {
  return (
    <div
      className={`${containerPatterns.mediumGlass} flex flex-col items-center text-center gap-4 py-8 px-6`}
    >
      <div className="w-16 h-16 flex items-center justify-center rounded-xl border border-synthwave-neon-cyan/30 bg-synthwave-neon-cyan/10">
        {typeof icon === "string" ? (
          <span className="text-3xl">{icon}</span>
        ) : (
          icon
        )}
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-gradient-neon font-header font-bold text-xl uppercase tracking-wider">
          {title}
        </p>
        <p className={typographyPatterns.emptyStateDescription}>{description}</p>
      </div>
      {actionLabel && onAction && (
        <button className={buttonPatterns.secondarySmall} onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
