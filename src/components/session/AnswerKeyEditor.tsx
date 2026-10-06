import { Textarea } from '../ui/textarea'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { ANSWER_KINDS } from '../../lib/scoring'

interface AnswerKeyEditorProps {
  pasteText: string
  onPasteTextChange: (value: string) => void
  rules: string
  onRulesChange: (value: string) => void
  onSaveRules: () => void
  expectedStyle: string
  onExpectedStyleChange: (value: string) => void
  checkResult: string[] | null
  onCheck: () => void
  onPreview: () => void
  onSaveDraft: () => void
  onConfirm: () => void
  savePending: boolean
  confirmPending: boolean
  error: string | null
}

export default function AnswerKeyEditor({
  pasteText,
  onPasteTextChange,
  rules,
  onRulesChange,
  onSaveRules,
  expectedStyle,
  onExpectedStyleChange,
  checkResult,
  onCheck,
  onPreview,
  onSaveDraft,
  onConfirm,
  savePending,
  confirmPending,
  error,
}: AnswerKeyEditorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Answer key</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Paste one answer per line, or paste a table with repeated No. / Ans. columns (from Word or a spreadsheet).
          Table question numbers are kept. For answer lists, questions are numbered in paste order — printed numbers
          that restart in each part are ignored. Optionally add a <code># Heading</code> before a part to set its type
          (Multiple choice / True-False / Identification / Coding / Essay).
        </p>
        <Textarea
          value={pasteText}
          onChange={(e) => onPasteTextChange(e.target.value)}
          rows={8}
          className="max-h-60 overflow-y-auto font-mono text-xs"
          placeholder={'# Multiple Choice\nB\nC\nA\nD\n# Coding\nclass Person {}\nNO ERROR\n# Essay\nExplain polymorphism.'}
        />
        <Textarea
          value={rules}
          onChange={(e) => onRulesChange(e.target.value)}
          rows={3}
          placeholder={'Example rules:\n- No erasures\n- Uppercase letters only\n- No tampering'}
        />
        <Button variant="outline" onClick={onSaveRules}>
          Save rules
        </Button>
        <div className="flex flex-col gap-2">
          <div>
            <Label htmlFor="style">Expected answer style (used by the checker)</Label>
            <Select value={expectedStyle} onValueChange={(v) => onExpectedStyleChange(v ?? 'any')}>
              <SelectTrigger id="style">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                {ANSWER_KINDS.map((k) => (
                  <SelectItem key={k.value} value={k.value}>
                    {k.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={onCheck}>
            Check answer key
          </Button>
          {checkResult && (
            <ul className="rounded-md border p-2 text-xs">
              {checkResult.map((p, i) => (
                <li key={i} className={p.startsWith('✓') ? 'text-green-700' : 'text-destructive'}>
                  {p}
                </li>
              ))}
            </ul>
          )}
          <Button variant="secondary" onClick={onPreview}>
            Preview
          </Button>
          <Button variant="outline" onClick={onSaveDraft} disabled={savePending}>
            Save draft
          </Button>
          <Button onClick={onConfirm} disabled={confirmPending}>
            Confirm answer key
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  )
}
