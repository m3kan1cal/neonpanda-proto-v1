import { useState } from "react";
import { checkPatterns, typographyPatterns } from "../utils/uiPatterns";

/**
 * Stateful radio button group.
 *
 * Props:
 *   options        — array of label strings
 *   defaultIndex   — initially selected index (default 0)
 *   onChange       — (index: number, label: string) => void
 */
export function Radio({ options = [], defaultIndex = 0, onChange }) {
  const [selected, setSelected] = useState(defaultIndex);

  const handleSelect = (i) => {
    setSelected(i);
    onChange?.(i, options[i]);
  };

  return (
    <>
      {options.map((opt, i) => (
        <label
          key={opt}
          className={checkPatterns.group}
          onClick={() => handleSelect(i)}
        >
          <div
            className={
              selected === i ? checkPatterns.radioChecked : checkPatterns.radio
            }
          >
            {selected === i && <div className={checkPatterns.radioDot} />}
          </div>
          <span className={typographyPatterns.monoSm}>{opt}</span>
        </label>
      ))}
    </>
  );
}

export default Radio;
