import { tablePatterns } from "../utils/uiPatterns";

/**
 * Retro data table.
 *
 * Props:
 *   columns  — array of header strings
 *   rows     — array of row arrays; each cell can be a string or { value, variant }
 *              where variant is "highlight" | "accent" | undefined
 *   footer   — optional array for a tfoot row
 *   className— applied to the scroll wrapper
 */
export function Table({ columns = [], rows = [], footer, className = "" }) {
  return (
    <div className={`${tablePatterns.wrap} ${className}`.trim()}>
      <table className={tablePatterns.table}>
        {columns.length > 0 && (
          <thead>
            <tr className={tablePatterns.theadRow}>
              {columns.map((col) => (
                <th key={col} className={tablePatterns.th}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className={tablePatterns.tbodyRow}>
              {row.map((cell, ci) => {
                const isObj = cell && typeof cell === "object";
                const value = isObj ? cell.value : cell;
                const variant = isObj ? cell.variant : undefined;
                const tdClass =
                  variant === "highlight"
                    ? tablePatterns.tdHighlight
                    : variant === "accent"
                      ? tablePatterns.tdAccent
                      : tablePatterns.td;
                return (
                  <td key={ci} className={tdClass}>
                    {value}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        {footer && (
          <tfoot>
            <tr className={tablePatterns.tfootRow}>
              {footer.map((cell, ci) => {
                const isObj = cell && typeof cell === "object";
                const value = isObj ? cell.value : cell;
                const colSpan = isObj ? cell.colSpan : undefined;
                return (
                  <td
                    key={ci}
                    className={tablePatterns.tfootTd}
                    colSpan={colSpan}
                  >
                    {value}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

export default Table;
