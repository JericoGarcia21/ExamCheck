import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { displayConfidence, needsTeacherReview } from '../../lib/confidence'
import type { ScoreResult, ScoredAnswer } from '../../lib/scoring'
import type { RuleViolation } from '../../lib/readPaper'

interface PaperResultCardProps {
  saving: boolean
  studentName: string
  result: ScoreResult
  effectiveScore: number
  effectiveDetails: ScoredAnswer[]
  appliedViolationNumbers: Set<number>
  ruleViolations: RuleViolation[]
  onToggleViolation: (index: number) => void
  scoreOverride: string
  onScoreOverrideChange: (value: string) => void
  reviewCount: number
  onReview: () => void
  onSave: () => void
  onUpdateDetail: (questionNumber: number, patch: Partial<ScoredAnswer>) => void
}

export default function PaperResultCard({
  saving,
  studentName,
  result,
  effectiveScore,
  effectiveDetails,
  appliedViolationNumbers,
  ruleViolations,
  onToggleViolation,
  scoreOverride,
  onScoreOverrideChange,
  reviewCount,
  onReview,
  onSave,
  onUpdateDetail,
}: PaperResultCardProps) {
  const percent = result.total > 0 ? Math.round((effectiveScore / result.total) * 100) : 0
  const avgPct = (() => {
    if (effectiveDetails.length === 0) return null
    const avg = effectiveDetails.reduce((sum, d) => sum + displayConfidence(d), 0) / effectiveDetails.length
    return Math.round(avg * 100)
  })()
  const lowCount = effectiveDetails.filter((d) => displayConfidence(d) < 0.7).length

  return (
    <div className="space-y-4 rounded-2xl border bg-muted/20 p-4 lg:p-5">
      <p className="text-lg font-semibold">
        {studentName}: {effectiveScore}/{result.total} ({percent}%)
      </p>

      {avgPct !== null && (
        <p className={`text-sm font-medium ${avgPct < 70 ? 'text-destructive' : 'text-muted-foreground'}`}>
          🤖 AI confidence: {avgPct}% average
          {lowCount > 0 && ` · ${lowCount} below 70%`}
        </p>
      )}

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-end">
        <div className="text-sm">
          <p className="text-xs text-muted-foreground">System score</p>
          <p className="font-semibold">
            {effectiveScore} / {result.total}
          </p>
        </div>
        <div className="flex-1">
          <Label htmlFor="scoreOverride" className="text-xs text-muted-foreground">
            Teacher final score (leave blank to keep system score)
          </Label>
          <Input
            id="scoreOverride"
            step="any"
            type="number"
            min={0}
            max={result.total}
            value={scoreOverride}
            onChange={(e) => onScoreOverrideChange(e.target.value)}
            placeholder={`${effectiveScore}`}
            className="mt-1"
          />
        </div>
      </div>

        {ruleViolations.length > 0 && (
          <div className="rounded-xl border p-3 text-xs">
            <p className="font-medium">Rule checks — review each one. Nothing is marked wrong automatically.</p>
            <ul className="mt-1 space-y-1">
              {ruleViolations.map((v, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="flex-1">
                    {v.question_number !== null ? `Q${v.question_number}: ` : ''}
                    {v.violation}
                    {v.confidence !== null && (
                      <span className="ml-1 text-muted-foreground">({Math.round(v.confidence * 100)}%)</span>
                    )}
                  </span>
                  <Button
                    size="sm"
                    variant={v.applied ? 'default' : 'outline'}
                    className="h-6 px-2 text-xs"
                    onClick={() => onToggleViolation(i)}
                  >
                    {v.applied ? 'Marked wrong ✓' : 'Mark wrong'}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center gap-2 border-b py-1 text-xs font-semibold text-muted-foreground">
          <span className="w-6 text-right">No.</span>
          <span className="flex-1">Answer</span>
          <span className="w-16">Score</span>
          <span className="ml-1 whitespace-nowrap" title="How sure the AI is that it read the answer correctly">
            AI Confidence
          </span>
        </div>

        <ol className="divide-y text-sm">
          {effectiveDetails.map((d) => {
            const conf = displayConfidence(d)
            const confidencePct = Math.round(conf * 100)
            const low = conf < 0.7
            const forced = appliedViolationNumbers.has(d.question_number)
            return (
              <li
                key={d.question_number}
                className={`flex items-center gap-2 py-2.5 ${
                  low || d.needs_review || forced ? 'border-l-2 border-destructive pl-2' : ''
                }`}
              >
                <span className="w-6 text-right text-muted-foreground">{d.question_number}.</span>
                <span className="flex-1">
                  {d.student_answer || '—'}
                  {d.is_correct && !forced && <span className="ml-1 text-green-600">✓</span>}
                  {!d.is_correct && !d.needs_review && (
                    <span className="ml-1 text-destructive">✗ ({d.correct_answer})</span>
                  )}
                  {forced && <span className="ml-1 text-destructive">(rule)</span>}
                  {needsTeacherReview(d) && (
                    <Badge className="ml-1" variant="destructive">
                      review
                    </Badge>
                  )}
                </span>
                <span className="w-16 text-xs">
                  {d.max_points > 1 ? (
                    <input
                      aria-label={`Points for question ${d.question_number}`}
                      step="any"
                      type="number"
                      min={0}
                      max={d.max_points}
                      value={d.points_awarded}
                      onChange={(e) => {
                        const pts = Math.max(0, Math.min(d.max_points, Number(e.target.value) || 0))
                        onUpdateDetail(d.question_number, { points_awarded: pts, is_correct: pts >= d.max_points, needs_review: false, review_status: 'edited' })
                      }}
                      className="h-7 w-14 rounded border px-1"
                    />
                  ) : (
                    <span className={d.is_correct ? 'text-green-600' : 'text-destructive'}>
                      {d.points_awarded}/{d.max_points}
                    </span>
                  )}
                </span>
                <span
                  className={`ml-1 whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-semibold ${
                    low ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'
                  }`}
                  title={`AI confidence: ${confidencePct}%`}
                >
                  AI {confidencePct}%
                </span>
              </li>
            )
          })}
        </ol>

        <div className="flex flex-col gap-2">
          {reviewCount > 0 && (
            <Button variant="outline" onClick={onReview}>
              Review {reviewCount} answer{reviewCount === 1 ? '' : 's'} needing attention
            </Button>
          )}
          <Button className="w-full" disabled={saving || reviewCount > 0} onClick={onSave}>
            {saving ? 'Saving…' : 'Save final result'}
          </Button>
        </div>
    </div>
  )
}
