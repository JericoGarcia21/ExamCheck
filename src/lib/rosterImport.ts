import { parseStudentNames } from './students'

export const MAX_ROSTER_BYTES = 5 * 1024 * 1024
export function validateRosterFile(file: { name: string; size: number }): void {
  if (!/\.(xlsx|xls|csv)$/i.test(file.name)) throw new Error('Choose an Excel or CSV file.')
  if (file.size === 0 || file.size > MAX_ROSTER_BYTES) throw new Error('Choose a nonempty file smaller than 5 MB.')
}
export function detectNameColumn(rows: unknown[][]): { column: number; hasHeader: boolean } {
  const headers = rows[0] ?? []
  const column = headers.findIndex((v) => typeof v === 'string' && /^(student\s*name|full\s*name|name)$/i.test(v.trim()))
  return { column: column < 0 ? 0 : column, hasHeader: column >= 0 }
}
export function previewRoster(rows: unknown[][], column: number, hasHeader: boolean, existing: string[]) {
  const seen = new Set(existing.map((n) => n.trim().replace(/\s+/g, ' ').toLowerCase()))
  const names: string[] = []
  let rejected = 0
  let duplicates = 0
  for (const row of rows.slice(hasHeader ? 1 : 0)) {
    if (row.every((v) => v === null || v === undefined || String(v).trim() === '')) continue
    const cell = row[column]
    if (typeof cell !== 'string' || !/\p{L}/u.test(cell) || cell.length > 200 || [...cell].some((c) => c.charCodeAt(0) < 32)) { rejected++; continue }
    const name = parseStudentNames(cell)[0]?.replace(/\s+/g, ' ').trim()
    if (!name) { rejected++; continue }
    const key = name.toLowerCase()
    if (seen.has(key)) { duplicates++; continue }
    seen.add(key)
    names.push(name)
  }
  return { names, rejected, duplicates }
}
