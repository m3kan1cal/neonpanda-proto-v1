import { useState } from "react";
import { checkPatterns, typographyPatterns } from "../utils/uiPatterns";

/**
 * Stateful checkbox with retro styling.
 *
 * Props:
 *   label          — label text beside the box
 *   defaultChecked — initial checked state
 *   onChange       — (value: boolean) => void
 */
export function Checkbox({ label, defaultChecked = false, onChange }) {
  const [checked, setChecked] = useState(defaultChecked);

  const handleClick = () => {
    const next = !checked;
    setChecked(next);
    onChange?.(next);
  };

  return (
    <label className={`${checkPatterns.group} group`} onClick={handleClick}>
      <div className={checked ? checkPatterns.boxChecked : checkPatterns.box}>
        {checked && <span className={checkPatterns.checkmark}>✓</span>}
      </div>
      {label && <span className={typographyPatterns.monoSm}>{label}</span>}
    </label>
  );
}

export default Checkbox;
