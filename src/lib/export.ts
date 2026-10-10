import { escapeCsvCell } from './csv'
import type { AnswerRow, ResultRow } from '../types'
import { remarkFor } from './grading'

// xlsx is a large dependency used only when a teacher exports. Load it on demand
// so it never lands in the initial bundle.
async function loadXlsx() {
  return import('xlsx')
}

export interface ExportMeta {
  className: string
  schoolYear: string
  sessionName: string
  sessionDate: string
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Safe filename fragment from arbitrary text. */
export function slugify(value: string): string {
  return value
    .trim()
    .replace(/[^\w.-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'export'
}

export interface TableRow {
  no: number
  student: string
  score: string | number
  percentage: string
  remarks: string
}

export function buildTableRows(results: ResultRow[]): TableRow[] {
  return results.map((r, i) => ({
    no: i + 1,
    student: r.studentName,
    score: r.checked ? r.score : '—',
    percentage: r.checked ? `${r.percentage}%` : '—',
    remarks: remarkFor(r),
  }))
}

const HEADERS = ['No.', 'Student', 'Score', 'Percentage', 'Remarks']

function rowsToMatrix(rows: TableRow[]): (string | number)[][] {
  return [HEADERS, ...rows.map((r) => [r.no, r.student, r.score, r.percentage, r.remarks])]
}

/** CSV export using native generation (project rule: no library for CSV). */
export function exportCsv(results: ResultRow[], meta: ExportMeta): void {
  const matrix = rowsToMatrix(buildTableRows(results))
  const lines = [
    [`CLASS: ${meta.className} (${meta.schoolYear})`],
    [`SESSION: ${meta.sessionName} — ${meta.sessionDate}`],
    [],
    ...matrix,
  ]
  const csv = lines.map((line) => line.map(escapeCsvCell).join(',')).join('\r\n')
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${slugify(meta.className)}_${slugify(meta.sessionName)}.csv`)
}

/** Excel export via SheetJS (loaded on demand). */
export async function exportExcel(results: ResultRow[], meta: ExportMeta): Promise<void> {
  const XLSX = await loadXlsx()
  const matrix = rowsToMatrix(buildTableRows(results))
  const sheet = XLSX.utils.aoa_to_sheet([
    [`CLASS: ${meta.className} (${meta.schoolYear})`],
    [`SESSION: ${meta.sessionName} — ${meta.sessionDate}`],
    [],
    ...matrix,
  ])
  sheet['!cols'] = [{ wch: 6 }, { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 14 }]
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, 'Results')
  XLSX.writeFile(book, `${slugify(meta.className)}_${slugify(meta.sessionName)}.xlsx`)
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

/**
 * PDF export via the browser's print dialog ("Save as PDF").
 * Avoids adding a PDF library; prints only the results table via a hidden iframe.
 */
export function exportPdf(results: ResultRow[], meta: ExportMeta): void {
  const rows = buildTableRows(results)
  const body = rows
    .map(
      (r) =>
        `<tr><td>${r.no}</td><td>${escapeHtml(r.student)}</td><td>${r.score}</td><td>${r.percentage}</td><td>${escapeHtml(r.remarks)}</td></tr>`,
    )
    .join('')
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(meta.sessionName)}</title>
  <style>
    * { font-family: system-ui, Arial, sans-serif; }
    body { padding: 24px; color: #111; }
    h1 { font-size: 20px; margin: 0; }
    h2 { font-size: 14px; font-weight: 500; color: #555; margin: 4px 0 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
    th { background: #f1f5f9; }
    td:nth-child(1) { width: 40px; text-align: right; }
    td:nth-child(3), td:nth-child(4) { width: 90px; }
  </style></head><body>
    <h1>EXAMCHECK — ${escapeHtml(meta.className)}</h1>
    <h2>${escapeHtml(meta.sessionName)} · ${escapeHtml(meta.schoolYear)} · ${escapeHtml(meta.sessionDate)}</h2>
    <table><thead><tr>${HEADERS.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>
  </body></html>`

  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)
  const doc = iframe.contentWindow?.document
  if (!doc) {
    iframe.remove()
    return
  }
  doc.open()
  doc.write(html)
  doc.close()
  iframe.contentWindow?.focus()
  iframe.contentWindow?.print()
  setTimeout(() => iframe.remove(), 1000)
}

export interface AnswerExportRow {
  question: number
  student: string
  correct: string
  isCorrect: string
  points: string
  confidence: string
}

export function buildAnswerRows(answers: AnswerRow[]): AnswerExportRow[] {
  return answers.map((a) => ({
    question: a.question_number,
    student: a.student_answer ?? '',
    correct: a.correct_answer ?? '',
    isCorrect: a.is_correct ? 'Correct' : 'Wrong',
    points:
      a.max_points && a.max_points > 1 ? `${a.points_awarded ?? 0}/${a.max_points}` : a.is_correct ? '1/1' : '0/1',
    confidence: a.confidence !== null ? `${Math.round(a.confidence * 100)}%` : '—',
  }))
}

/** Export a single student's per-question breakdown (Excel) for record keeping. */
export async function exportStudentExcel(
  studentName: string,
  answers: AnswerRow[],
  meta: ExportMeta,
): Promise<void> {
  const XLSX = await loadXlsx()
  const header: (string | number)[][] = [
    [`CLASS: ${meta.className} (${meta.schoolYear})`],
    [`SESSION: ${meta.sessionName} — ${meta.sessionDate}`],
    [`STUDENT: ${studentName}`],
    [],
    ['Q', 'Student answer', 'Answer key', 'Result', 'Points', 'AI confidence'],
  ]
  const rows = buildAnswerRows(answers).map((a) => [
    a.question,
    a.student,
    a.correct,
    a.isCorrect,
    a.points,
    a.confidence,
  ])
  const sheet = XLSX.utils.aoa_to_sheet([...header, ...rows])
  sheet['!cols'] = [{ wch: 6 }, { wch: 30 }, { wch: 30 }, { wch: 10 }, { wch: 10 }, { wch: 14 }]
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, 'Student')
  XLSX.writeFile(book, `${slugify(meta.className)}_${slugify(studentName)}.xlsx`)
}
