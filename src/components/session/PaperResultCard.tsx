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
  ruleViolations: RuleViolation[]
  onSetViolationStatus: (index: number, status: RuleViolation['status']) => void
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
  ruleViolations,
  onSetViolationStatus,
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
  const considerations = effectiveDetails.filter((detail) =>
    Boolean(detail.consideration_reason) && needsTeacherReview(detail),
  )
  const pendingRuleCount = ruleViolations.filter((violation) => violation.status === 'pending').length
  const attentionCount = reviewCount + considerations.length + pendingRuleCount

  return (
    <div className="paper-review space-y-5 rounded-xl border bg-card p-4 lg:p-5" aria-label="Paper review">
      <div className="paper-review-heading">
        <div className="min-w-0"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Paper review</p><h3 className="mt-1 break-words text-xl font-semibold">{studentName}</h3><p className="mt-1 text-sm text-muted-foreground">{attentionCount > 0 ? `${attentionCount} item${attentionCount === 1 ? '' : 's'} need your attention before saving.` : 'All answers and overall rules reviewed. Ready to save.'}</p></div>
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

        {considerations.length > 0 && (
          <section className="rounded-xl border border-amber-500/40 bg-amber-50/50 p-3 text-sm" aria-labelledby="answer-considerations-heading">
            <p id="answer-considerations-heading" className="font-medium">Possible answer matches — teacher decision required</p>
            <p className="mt-1 text-xs text-muted-foreground">These answers remain wrong until you accept them. Reading confidence does not determine correctness.</p>
            <ul className="mt-2 space-y-3">
              {considerations.map((detail) => (
                <li key={detail.question_number} className="rounded-lg border bg-card p-3">
                  <p className="font-medium">Question {detail.question_number}</p>
                  <p className="mt-1 break-words"><span className="text-muted-foreground">Student:</span> {detail.student_answer}</p>
                  <p className="break-words"><span className="text-muted-foreground">Answer key:</span> {detail.correct_answer}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{detail.consideration_reason}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => onUpdateDetail(detail.question_number, {
                      is_correct: true,
                      points_awarded: detail.max_points,
                      needs_review: false,
                      review_status: 'edited',
                      consideration_reason: undefined,
                    })}>Accept as correct</Button>
                    <Button size="sm" variant="outline" onClick={() => onUpdateDetail(detail.question_number, {
                      is_correct: false,
                      points_awarded: 0,
                      needs_review: false,
                      review_status: 'accepted',
                      consideration_reason: undefined,
                    })}>Keep wrong</Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {ruleViolations.length > 0 && (
          <div className="rounded-xl border p-3 text-xs">
            <p className="font-medium">Overall paper rules — review each one</p>
            <p className="mt-1 text-muted-foreground">Rules apply to the whole paper, never an individual question. Confirming a violation does not change the score automatically; use the teacher final score for any penalty.</p>
            <ul className="mt-1 space-y-1">
              {ruleViolations.map((v, i) => (
                <li key={i} className="flex flex-wrap items-center gap-2 py-2">
                  <span className="flex-1">
                    {v.violation}
                    {v.confidence !== null && (
                      <span className="ml-1 text-muted-foreground">({Math.round(v.confidence * 100)}%)</span>
                    )}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant={v.status === 'confirmed' ? 'default' : 'outline'} className="min-h-11 px-3 text-xs" aria-pressed={v.status === 'confirmed'} onClick={() => onSetViolationStatus(i, 'confirmed')}>Confirm violation</Button>
                    <Button size="sm" variant={v.status === 'dismissed' ? 'secondary' : 'outline'} className="min-h-11 px-3 text-xs" aria-pressed={v.status === 'dismissed'} onClick={() => onSetViolationStatus(i, 'dismissed')}>Dismiss</Button>
                  </div>
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
            return (
              <li
                key={d.question_number}
                className={`answer-review-row ${
                  low || d.needs_review ? 'border-l-2 border-destructive pl-2' : ''
                }`}
              >
                <span className="answer-review-number text-muted-foreground"><span className="sr-only">Question </span>{d.question_number}.</span>
                <span className="answer-review-text">
                  <span className="whitespace-pre-wrap">{d.student_answer || 'No answer detected'}</span>
                  {d.is_correct && <span className="ml-2 text-xs font-medium text-primary">Correct</span>}
                  {!d.is_correct && !d.needs_review && (
                    <span className="mt-1 block whitespace-pre-wrap text-xs text-destructive">Answer key: {d.correct_answer}</span>
                  )}
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
          <Button className="min-h-11 w-full" disabled={saving || attentionCount > 0 || !overrideValid} onClick={onSave}>
            {saving ? 'Saving…' : 'Save final result'}
          </Button>
        </div>
    </div>
  )
}
