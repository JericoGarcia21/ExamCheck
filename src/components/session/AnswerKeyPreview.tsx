import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { ANSWER_KINDS, type AnswerKind } from '../../lib/scoring'
import type { KeyRow } from '../../lib/answerKey'

interface AnswerKeyPreviewProps {
  rows: KeyRow[]
  locked: boolean
  /** True while showing an editable draft (before it is saved/confirmed). */
  editable: boolean
  rules: string | null | undefined
  onUpdate: (questionNumber: number, patch: Partial<KeyRow>) => void
}

export default function AnswerKeyPreview({ rows, locked, editable, rules, onUpdate }: AnswerKeyPreviewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Answer key {locked ? '(confirmed ✓)' : editable ? '(editable preview)' : 'preview'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No answer key yet.</p>
        ) : (
          <div className="max-h-96 divide-y overflow-y-auto text-sm">
            {rows.map((row) => (
              <div key={row.question_number} className="space-y-1 py-2">
                <div className="flex items-center gap-2">
                  <span className="w-8 text-right text-muted-foreground">{row.question_number}.</span>
                  <span className="flex-1 font-medium">{row.correct_answer}</span>
                  {editable && !locked ? (
                    <Select
                      value={row.question_type}
                      onValueChange={(v) =>
                        onUpdate(row.question_number, {
                          question_type: (v ?? 'identification') as AnswerKind,
                          max_points: v === 'essay' ? (row.max_points > 1 ? row.max_points : 10) : 1,
                        })
                      }
                    >
                      <SelectTrigger className="h-8 w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ANSWER_KINDS.map((k) => (
                          <SelectItem key={k.value} value={k.value}>
                            {k.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline">{row.question_type}</Badge>
                  )}
                  {row.max_points > 1 && <span className="text-xs text-muted-foreground">{row.max_points} pts</span>}
                </div>
                {editable && !locked && row.question_type === 'essay' && (
                  <div className="flex gap-2 pl-10">
                    <Input
                      type="number"
                      min={1}
                      className="h-8 w-20"
                      value={row.max_points}
                      onChange={(e) =>
                        onUpdate(row.question_number, { max_points: Math.max(1, Number(e.target.value) || 1) })
                      }
                    />
                    <Textarea
                      className="min-h-8 flex-1 font-mono text-xs"
                      rows={2}
                      placeholder="Rubric for this essay question (used to award partial credit)"
                      value={row.rubric ?? ''}
                      onChange={(e) => onUpdate(row.question_number, { rubric: e.target.value })}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {locked && (
          <div className="mt-3 space-y-1">
            <p className="text-sm text-green-700">✓ Locked. Ready to check student papers.</p>
            {rules && <p className="text-xs text-muted-foreground">Rules: {rules.replace(/\n/g, ' · ')}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
