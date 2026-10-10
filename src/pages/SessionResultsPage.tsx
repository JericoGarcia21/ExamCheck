import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import {
  getSessionWithClass,
  listSessionResults,
  listSubmissionAnswers,
} from '../services/resultsService'
import {
  buildAnswerRows,
  exportCsv,
  exportExcel,
  exportPdf,
  exportStudentExcel,
  type ExportMeta,
} from '../lib/export'
import { PASSING_PERCENTAGE, remarkFor } from '../lib/grading'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Input } from '../components/ui/input'
import { Skeleton } from '../components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'

function Stat({ label, value, loading }: { label: string; value: string | number; loading?: boolean }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      {loading ? <Skeleton className="mt-1 h-6 w-16" /> : <p className="text-lg font-semibold">{value}</p>}
    </div>
  )
}

type Filter = 'all' | 'checked' | 'unchecked' | 'review'

export default function SessionResultsPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const [exportError, setExportError] = useState<string | null>(null)
  async function downloadExcel(student = false) {
    setExportError(null)
    try {
      if (student && detail) await exportStudentExcel(detail.studentName, detailAnswers ?? [], meta)
      else await exportExcel(rows, meta)
    } catch { setExportError('Could not export the workbook. Please retry.') }
  }
  const [detailId, setDetailId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const { data: session, isLoading: loadingSession, error: sessionError } = useQuery({
    queryKey: ['sessionResult', sessionId],
    queryFn: () => getSessionWithClass(sessionId!),
    enabled: !!sessionId,
  })

  const { data: results, isLoading: loadingResults, error: resultsError } = useQuery({
    queryKey: ['sessionResults', sessionId],
    queryFn: () => listSessionResults(sessionId!),
    enabled: !!sessionId,
  })

  const detail = detailId ? (results ?? []).find((r) => r.studentId === detailId) ?? null : null

  const { data: detailAnswers, isLoading: loadingAnswers, error: answerError } = useQuery({
    queryKey: ['submissionAnswers', detail?.submissionId],
    queryFn: () => listSubmissionAnswers(detail!.submissionId!),
    enabled: !!detail?.submissionId,
  })

  const rows = results ?? []
  const checkedRows = rows.filter((r) => r.checked)
  const meta: ExportMeta = {
    className: session?.classes?.block_name ?? 'Class',
    schoolYear: session?.classes?.school_year ?? '',
    sessionName: session?.session_name ?? 'Session',
    sessionDate: session?.session_date ?? '',
  }

  // Statistics reflect checked students only — unchecked ones have no score yet.
  const percentages = checkedRows.map((r) => r.percentage)
  const average = percentages.length ? Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length) : 0
  const highest = percentages.length ? Math.max(...percentages) : 0
  const lowest = percentages.length ? Math.min(...percentages) : 0
  const needsReview = checkedRows.filter((r) => r.needsReview).length
  const passRate = percentages.length ? Math.round((percentages.filter((p) => p >= PASSING_PERCENTAGE).length / percentages.length) * 100) : 0

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (results ?? []).filter((r) => {
      if (q && !r.studentName.toLowerCase().includes(q)) return false
      if (filter === 'checked') return r.checked
      if (filter === 'unchecked') return !r.checked
      if (filter === 'review') return r.needsReview
      return true
    })
  }, [results, search, filter])

  const error = sessionError ?? resultsError

  return (
    <section className="space-y-4">
      <div>
        <Link to="/results" className="text-sm text-primary">
          &larr; Back to results
        </Link>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">
          {loadingSession ? <Skeleton className="h-8 w-56" /> : session?.session_name || 'Untitled session'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {session
            ? `${session.classes?.block_name ?? ''} · ${session.classes?.school_year ?? ''} · ${session.session_date}`
            : ''}
        </p>
      </div>

      {exportError && <p role="alert" className="text-destructive">{exportError}</p>}
      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-sm text-destructive">
          Could not load results: {error.message}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Checked" value={`${checkedRows.length} / ${rows.length}`} loading={loadingResults} />
        <Stat label="Average" value={`${average}%`} loading={loadingResults} />
        <Stat label="Highest" value={`${highest}%`} loading={loadingResults} />
        <Stat label="Lowest" value={`${lowest}%`} loading={loadingResults} />
        <Stat label={`Passed (≥${PASSING_PERCENTAGE}%)`} value={`${passRate}%`} loading={loadingResults} />
      </div>

      {needsReview > 0 && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-sm text-destructive">
          {needsReview} result{needsReview === 1 ? '' : 's'} still {needsReview === 1 ? 'needs' : 'need'} review.
        </p>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Class results</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={rows.length === 0} onClick={() => void downloadExcel()}>
                Excel
              </Button>
              <Button size="sm" variant="outline" disabled={rows.length === 0} onClick={() => exportCsv(rows, meta)}>
                CSV
              </Button>
              <Button size="sm" variant="outline" disabled={rows.length === 0} onClick={() => exportPdf(rows, meta)}>
                PDF
              </Button>
            </div>
          </div>
          {rows.length > 0 && (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder="Search student…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="sm:max-w-xs"
              />
              <Select value={filter} onValueChange={(v) => setFilter((v ?? 'all') as Filter)}>
                <SelectTrigger className="sm:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All students</SelectItem>
                  <SelectItem value="checked">Checked only</SelectItem>
                  <SelectItem value="unchecked">Not checked</SelectItem>
                  <SelectItem value="review">Needs review</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {loadingResults ? (
            <div className="divide-y">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <Skeleton className="h-4 w-6" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-10" />
                </div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No students in this class yet.
            </p>
          ) : visibleRows.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No students match your search or filter.
            </p>
          ) : (
            <div className="max-h-[70vh] overflow-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead className="sticky top-0 z-10 bg-card text-left text-xs text-muted-foreground">
                  <tr className="border-b">
                    <th className="px-4 py-2 text-right">No.</th>
                    <th className="px-2 py-2">Student</th>
                    <th className="px-2 py-2 text-right">Score</th>
                    <th className="px-2 py-2">%</th>
                    <th className="px-2 py-2">Remarks</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((r) => (
                    <tr
                      key={r.studentId}
                      className={`border-b last:border-0 hover:bg-muted/40 ${r.checked ? '' : 'bg-muted/20'}`}
                    >
                      <td className="px-4 py-2 text-right text-muted-foreground">{rows.findIndex((row) => row.studentId === r.studentId) + 1}</td>
                      <td className="px-2 py-2">
                        {r.studentName}
                        {r.needsReview && (
                          <Badge variant="destructive" className="ml-2">
                            review
                          </Badge>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {r.checked ? (
                          <span className={r.percentage < PASSING_PERCENTAGE ? 'text-destructive' : ''}>{r.score}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td
                        className={`px-2 py-2 ${
                          r.checked && r.percentage < PASSING_PERCENTAGE ? 'text-destructive' : 'text-muted-foreground'
                        }`}
                      >
                        {r.checked ? `${r.percentage}%` : '—'}
                      </td>
                      <td className="px-2 py-2">
                        <span
                          className={
                            !r.checked
                              ? 'text-muted-foreground'
                              : r.needsReview
                                ? 'text-destructive'
                                : r.percentage >= PASSING_PERCENTAGE
                                  ? 'text-green-700'
                                  : 'text-destructive'
                          }
                        >
                          {remarkFor(r)}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        {r.checked && (
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setDetailId(r.studentId)}>
                            View
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{detail?.studentName}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm">
                  Final score: <strong>{detail.score} / {detail.total}</strong> ({detail.percentage}%)
                  {detail.needsReview && (
                    <Badge variant="destructive" className="ml-2">
                      needs review
                    </Badge>
                  )}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!detailAnswers || detailAnswers.length === 0}
                  onClick={() => void downloadExcel(true)}
                >
                  Export student
                </Button>
              </div>
              {answerError && <p role="alert" className="text-destructive">Could not load answers. Please close and retry.</p>}
              <div className="max-h-[55vh] overflow-auto rounded-md border">
                <table className="w-full min-w-[420px] text-xs">
                  <thead className="sticky top-0 bg-card text-left text-muted-foreground">
                    <tr className="border-b">
                      <th className="py-1.5 pr-2 pl-2 text-right">Q</th>
                      <th className="py-1.5 pr-2">Student</th>
                      <th className="py-1.5 pr-2">Key</th>
                      <th className="py-1.5 pr-2">Points</th>
                      <th className="py-1.5 pr-2">AI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingAnswers &&
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={`sk-${i}`} className="border-b last:border-0">
                          <td className="py-1.5 pr-2 pl-2"><Skeleton className="ml-auto h-3.5 w-4" /></td>
                          <td className="py-1.5 pr-2"><Skeleton className="h-3.5 w-20" /></td>
                          <td className="py-1.5 pr-2"><Skeleton className="h-3.5 w-16" /></td>
                          <td className="py-1.5 pr-2"><Skeleton className="h-3.5 w-8" /></td>
                          <td className="py-1.5 pr-2"><Skeleton className="h-3.5 w-8" /></td>
                        </tr>
                      ))}
                    {!loadingAnswers &&
                      buildAnswerRows(detailAnswers ?? []).map((a) => (
                        <tr key={a.question} className="border-b last:border-0">
                          <td className="py-1.5 pr-2 pl-2 text-right text-muted-foreground">{a.question}</td>
                          <td className="py-1.5 pr-2">{a.student || '—'}</td>
                          <td className="py-1.5 pr-2">{a.correct}</td>
                          <td
                            className={`py-1.5 pr-2 ${
                              a.isCorrect === 'Correct' ? 'text-green-600' : 'text-destructive'
                            }`}
                          >
                            {a.isCorrect === 'Correct' ? '✓ ' : '✗ '}
                            {a.points}
                          </td>
                          <td className="py-1.5 pr-2">{a.confidence}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
