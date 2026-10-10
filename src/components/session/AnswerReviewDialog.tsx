import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import type { ReviewMode } from '../../hooks/useAnswerReview'

interface AnswerReviewDialogProps {
  allowPoints: boolean
  mode: ReviewMode
  question: number | null
  index: number
  queueLength: number
  studentAnswer: string
  onStudentAnswerChange: (value: string) => void
  confidence: number | null
  points: string
  onPointsChange: (value: string) => void
  feedback: string
  onFeedbackChange: (value: string) => void
  maxPoints: number | null
  suggestedFeedback?: string
  onSetMode: (mode: ReviewMode) => void
  onSubmit: () => void
  onClose: () => void
}

export default function AnswerReviewDialog({
  allowPoints,
  mode,
  question,
  index,
  queueLength,
  studentAnswer,
  onStudentAnswerChange,
  confidence,
  points,
  onPointsChange,
  feedback,
  onFeedbackChange,
  maxPoints,
  suggestedFeedback,
  onSetMode,
  onSubmit,
  onClose,
}: AnswerReviewDialogProps) {
  if (mode === 'none') return null
  const isEssay = allowPoints

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'view' ? 'Review Answer' : 'Edit Answer'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Question <strong>{question}</strong>
            <span className="ml-2 text-xs">
              {index + 1} of {queueLength}
            </span>
          </p>

          {mode === 'view' ? (
            <>
              <div className="rounded-md bg-muted/50 p-3">
                <p className="font-medium">Student answer:</p>
                <p
                  className={`mt-1 font-mono text-lg ${
                    confidence !== null && confidence < 0.7 ? 'text-destructive' : 'text-foreground'
                  }`}
                >
                  {studentAnswer || '—'}
                </p>
                {isEssay && (
                  <p className="mt-2 text-sm">
                    Suggested: <strong>{points}</strong> / {maxPoints}
                    {suggestedFeedback && (
                      <span className="block text-xs text-muted-foreground">{suggestedFeedback}</span>
                    )}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">AI confidence:</p>
                <div className="mt-1 h-2 w-full rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${(confidence ?? 0) < 0.7 ? 'bg-destructive' : 'bg-primary'}`}
                    style={{ width: `${(confidence ?? 0) * 100}%` }}
                  />
                </div>
                <p className={`mt-1 text-xs ${(confidence ?? 0) < 0.7 ? 'text-destructive' : 'text-foreground'}`}>
                  {Math.round((confidence ?? 0) * 100)}%
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
                <Button variant="outline" onClick={() => onSetMode('edit')}>
                  Edit
                </Button>
                <Button onClick={onSubmit}>Accept</Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Your interpretation:</p>
                <Textarea
                  aria-label="Your interpretation of the answer"
                  value={studentAnswer}
                  onChange={(e) => onStudentAnswerChange(e.target.value)}
                  rows={2}
                  placeholder="Enter the answer as you see it"
                />
              </div>
              {isEssay && (
                <div className="space-y-1">
                  <Label className="text-sm">Points (0–{maxPoints})</Label>
                  <Input
                    aria-label="Awarded points"
                    step="any"
                    type="number"
                    min={0}
                    max={maxPoints ?? undefined}
                    value={points}
                    onChange={(e) => onPointsChange(e.target.value)}
                  />
                  <Label className="text-sm">Feedback (optional)</Label>
                  <Textarea aria-label="Feedback" value={feedback} onChange={(e) => onFeedbackChange(e.target.value)} rows={2} />
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => onSetMode('view')}>
                  Back
                </Button>
                <Button onClick={onSubmit}>Save answer</Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
