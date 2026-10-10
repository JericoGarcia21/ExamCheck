/** Protect text from spreadsheet formula interpretation; numbers stay numeric. */
export function escapeCsvCell(cell: string | number): string {
  if (typeof cell === 'number') {
    if (!Number.isFinite(cell)) throw new Error('Cannot export a nonfinite grade.')
    return String(cell)
  }
  const first = [...cell].find((c) => c.charCodeAt(0) >= 32 && !/\s/.test(c)) ?? ''
  const safe = /^[=+@-]$/.test(first) || (cell.length > 0 && cell.charCodeAt(0) < 32) ? "'" + cell : cell
  return /[",\r\n]/.test(safe) ? '"' + safe.replace(/"/g, '""') + '"' : safe
}
