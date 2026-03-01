import { inputPatterns, fieldPatterns } from "../utils/uiPatterns";

/**
 * Search input with a leading search icon.
 *
 * Props:
 *   label     — optional field label above
 *   icon      — icon character (default "⌕")
 *   className — applied to the search wrapper div
 */
export function SearchField({ label, icon = "⌕", className = "", ...props }) {
  return (
    <div className={fieldPatterns.wrapper}>
      {label && <label className={fieldPatterns.label}>{label}</label>}
      <div className={`${inputPatterns.searchWrapper} ${className}`.trim()}>
        <span className={inputPatterns.searchIcon}>{icon}</span>
        <input className={inputPatterns.searchInput} {...props} />
      </div>
    </div>
  );
}

export default SearchField;
