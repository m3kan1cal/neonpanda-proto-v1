import { useState } from "react";
import { togglePatterns, typographyPatterns } from "../utils/uiPatterns";

/**
 * Stateful on/off toggle.
 *
 * Props:
 *   label      — label text displayed beside the track
 *   defaultOn  — initial state (default false)
 *   onChange   — (value: boolean) => void
 */
export function Toggle({ label, defaultOn = false, onChange }) {
  const [on, setOn] = useState(defaultOn);

  const handleClick = () => {
    const next = !on;
    setOn(next);
    onChange?.(next);
  };

  return (
    <label className={togglePatterns.container} onClick={handleClick}>
      <div className={on ? togglePatterns.trackOn : togglePatterns.track}>
        <div className={on ? togglePatterns.thumbOn : togglePatterns.thumb} />
      </div>
      {label && <span className={typographyPatterns.monoSm}>{label}</span>}
    </label>
  );
}

export default Toggle;
