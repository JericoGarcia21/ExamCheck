import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { displayConfidence, needsTeacherReview } from '../../lib/confidence'
import { formatPercentage, percentageFor } from '../../lib/grading'
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
  const override = scoreOverride.trim() === '' ? null : Number(scoreOverride)
  const overrideValid = override === null || (Number.isFinite(override) && override >= 0 && override <= result.total)
  const finalScore = override !== null && overrideValid ? override : effectiveScore
  const percent = formatPercentage(percentageFor(finalScore, result.total))
  const avgPct = (() => {
    if (effectiveDetails.length === 0) return null
    const avg = effectiveDetails.reduce((sum, d) => sum + displayConfidence(d), 0) / effectiveDetails.length
    return Math.round(avg * 100)
  })()
  const lowCount = effectiveDetails.filter((d) => displayConfidence(d) < 0.7).length

  return (
    <div className="paper-review space-y-5 rounded-xl border bg-card p-4 lg:p-5" aria-label="Paper review">
      <div className="paper-review-heading">
        <div className="min-w-0"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Paper review</p><h3 className="mt-1 break-words text-xl font-semibold">{studentName}</h3><p className="mt-1 text-sm text-muted-foreground">{reviewCount > 0 ? `${reviewCount} answers need your attention before saving.` : 'All answers reviewed. Ready to save.'}</p></div>
        <div className="paper-score-summary"><span className="text-xs font-medium text-muted-foreground">Final score</span><strong>{finalScore}<span> / {result.total}</span></strong><span className="text-sm text-muted-foreground">{percent}{override !== null && overrideValid ? ' · Teacher adjusted' : ' · System score'}</span></div>
      </div>

      {avgPct !== null && (
        <p className={`text-sm font-medium ${avgPct < 70 ? 'text-destructive' : 'text-muted-foreground'}`}>
          AI reading confidence: {avgPct}% average
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
            aria-invalid={!overrideValid}
            aria-describedby="score-override-help"
            step="any"
            type="number"
            min={0}
            max={result.total}
            value={scoreOverride}
            onChange={(e) => onScoreOverrideChange(e.target.value)}
            placeholder={`${effectiveScore}`}
            className="mt-1"
          />
          <p id="score-override-help" className={`mt-2 text-xs ${overrideValid ? 'text-muted-foreground' : 'text-destructive'}`}>
            {overrideValid ? 'Clear this field to use the system score. Your final score appears above.' : `Enter a number from 0 to ${result.total}.`}
          </p>
        </div>
      </div>

        {ruleViolations.length > 0 && (
          <div className="rounded-xl border p-3 text-xs">
            <p className="font-medium">Rule checks — review each one. Nothing is marked wrong automatically.</p>
            <ul className="mt-1 space-y-1">
              {ruleViolations.map((v, i) => (
                <li key={i} className="flex flex-wrap items-center gap-2 py-2">
                  <span className="flex-1">
                    {v.question_number !== null ? `Q${v.question_number}: ` : ''}
                    {v.violation}
                    {v.confidence !== null && (
                      <span className="ml-1 text-muted-foreground">({Math.round(v.confidence * 100)}%)</span>
                    )}
                  </span>
                  {v.question_number === null ? (
                    <span className="text-muted-foreground">Advisory — no question identified</span>
                  ) : <Button
                    size="sm"
                    variant={v.applied ? 'default' : 'outline'}
                    className="min-h-11 px-3 text-xs"
                    aria-pressed={v.applied}
                    aria-label={`${v.applied ? 'Remove penalty from' : 'Mark wrong for'} question ${v.question_number}: ${v.violation}`}
                    onClick={() => onToggleViolation(i)}
                  >
                    {v.applied ? 'Marked wrong ✓' : 'Mark wrong'}
                  </Button>}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="answer-review-columns border-b py-2 text-xs font-semibold text-muted-foreground" aria-hidden="true">
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
                className={`answer-review-row ${
                  low || d.needs_review || forced ? 'border-l-2 border-destructive pl-2' : ''
                }`}
              >
                <span className="answer-review-number text-muted-foreground"><span className="sr-only">Question </span>{d.question_number}.</span>
                <span className="answer-review-text">
                  <span className="whitespace-pre-wrap">{d.student_answer || 'No answer detected'}</span>
                  {d.is_correct && !forced && <span className="ml-2 text-xs font-medium text-primary">Correct</span>}
                  {!d.is_correct && !d.needs_review && (
                    <span className="mt-1 block whitespace-pre-wrap text-xs text-destructive">Answer key: {d.correct_answer}</span>
                  )}
                  {forced && <span className="ml-1 text-destructive">(rule)</span>}
                  {needsTeacherReview(d) && (
                    <Badge className="ml-1" variant="destructive">
                      review
                    </Badge>
                  )}
                </span>
                <span className="answer-review-points text-xs"><span className="answer-review-mobile-label">Points</span>
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
                      className="min-h-11 w-16 rounded-md border px-2 text-sm"
                    />
                  ) : (
                    <span className={d.is_correct ? 'text-green-600' : 'text-destructive'}>
                      {d.points_awarded}/{d.max_points}
                    </span>
                  )}
                </span>
                <span
                  className={`answer-review-confidence whitespace-nowrap rounded px-2 py-1 text-xs font-semibold ${
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
          <Button className="min-h-11 w-full" disabled={saving || reviewCount > 0 || !overrideValid} onClick={onSave}>
            {saving ? 'Saving…' : 'Save final result'}
          </Button>
        </div>
    </div>
  )
}
