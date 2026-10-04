import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import CameraCapture from '../components/CameraCapture'
import { supabase } from '../lib/supabase'
import {
  confirmAnswerKey,
  getSession,
  listAnswerKeys,
  saveAnswerKeys,
  saveRules,
} from '../services/sessionService'
import { listStudents } from '../services/studentService'
import { saveSubmission } from '../services/submissionService'
import { calculateScore } from '../lib/scoring'
import { Button } from '../components/ui/button'
import { Textarea } from '../components/ui/textarea'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Input } from '../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'

interface Row {
  question_number: number
  correct_answer: string
  question_type: string
}

export function parseAnswerKeyText(text: string): Row[] {
  const rows: Row[] = []
  let autoNumber = 0
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue
    const match = line.match(/^(?:(\d+)[.):-]?\s*)?(.+)$/)
    if (!match) continue
    const answer = match[2].trim()
    if (!answer) continue
    autoNumber += 1
    const questionNumber = match[1] ? Number(match[1]) : autoNumber
    const normalized = answer.toLowerCase()
    const questionType =
      normalized === 'true' || normalized === 'false'
        ? 'true_false'
        : /^[a-e]$/i.test(answer)
          ? 'multiple_choice'
          : 'identification'
    rows.push({ question_number: questionNumber, correct_answer: answer, question_type: questionType })
  }
  return rows.sort((a, b) => a.question_number - b.question_number)
}

export default function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<Row[] | null>(null)
  const [pasteText, setPasteText] = useState('')
  const [rules, setRules] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [expectedStyle, setExpectedStyle] = useState('any')
  const [checkResult, setCheckResult] = useState<string[] | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)
  const [selectedStudentName, setSelectedStudentName] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [paperResult, setPaperResult] = useState<ReturnType<typeof calculateScore> | null>(null)
  const [paperError, setPaperError] = useState<string | null>(null)
  const [paperLoading, setPaperLoading] = useState(false)
  const [paperProgress, setPaperProgress] = useState(0)
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const [ruleViolations, setRuleViolations] = useState<{ question_number: number | null; violation: string }[]>([])
  const [studentSearch, setStudentSearch] = useState('')

  const { data: session } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => getSession(sessionId!),
    enabled: !!sessionId,
  })

  const { data: keys } = useQuery({
    queryKey: ['answerKeys', sessionId],
    queryFn: () => listAnswerKeys(sessionId!),
    enabled: !!sessionId,
  })

  const { data: students } = useQuery({
    queryKey: ['students', session?.class_id],
    queryFn: () => listStudents(session!.class_id),
    enabled: !!session?.class_id,
  })

  const rows =
    draft ??
    (keys ?? []).map((k) => ({
      question_number: k.question_number,
      correct_answer: k.correct_answer,
      question_type: k.question_type ?? 'multiple_choice',
    }))

  const saveMutation = useMutation({
    mutationFn: () => saveAnswerKeys(sessionId!, rows),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['answerKeys', sessionId] })
      setDraft(null)
      setError(null)
    },
    onError: (e) => setError(e.message),
  })

  const confirmMutation = useMutation({
    mutationFn: () => confirmAnswerKey(sessionId!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['session', sessionId] }),
    onError: (e) => setError(e.message),
  })

  const locked = session?.answer_key_confirmed === true

  return (
    <section className="space-y-4">
      <div>
        <Link to={session ? `/classes/${session.class_id}` : '/classes'} className="text-sm text-primary">
          &larr; Back to class
        </Link>
        <div className="mt-1 flex items-center justify-between">
          <h2 className="text-xl font-semibold">{session?.session_name ?? 'Checking session'}</h2>
          <Badge variant={locked ? 'default' : 'secondary'}>
            {locked ? 'Key confirmed' : 'Draft'}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{session?.session_date}</p>
      </div>

      {!locked && (
        <Card>
          <CardHeader>
            <CardTitle>Answer key</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Paste your answer key, one answer per line (with or without numbers). The order is the question number.
            </p>
            <Textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={8}
              className="max-h-60 overflow-y-auto"
              placeholder={'1. B\n2. C\n3. A\n4. D\n5. True\n6. Encapsulation'}
            />
            <Textarea
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              rows={3}
              placeholder={'Example rules:\n- No erasures\n- Uppercase letters only\n- No tampering'}
            />
            <Button
              variant="outline"
              onClick={() => saveRules(sessionId!, rules).then(() => setError(null)).catch((e) => setError(e.message))}
            >
              Save rules
            </Button>
            <div className="flex flex-col gap-2">
              <div>
                <Label htmlFor="style">Expected answer style</Label>
                <Select value={expectedStyle} onValueChange={(v) => setExpectedStyle(v ?? 'any')}>
                  <SelectTrigger id="style">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="multiple_choice">Multiple choice (A, B, C...)</SelectItem>
                    <SelectItem value="true_false">True / False only</SelectItem>
                    <SelectItem value="identification">Identification (text)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  const parsed = parseAnswerKeyText(pasteText)
                  const problems: string[] = []
                  if (parsed.length === 0) problems.push('No answers found in the paste.')
                  if (expectedStyle === 'multiple_choice') {
                    parsed.forEach((r) => {
                      if (!/^[A-Za-z]$/.test(r.correct_answer)) problems.push(`Q${r.question_number}: "${r.correct_answer}" is not a single letter.`)
                    })
                  }
                  if (expectedStyle === 'true_false') {
                    parsed.forEach((r) => {
                      if (!/^(true|false)$/i.test(r.correct_answer)) problems.push(`Q${r.question_number}: "${r.correct_answer}" is not True/False.`)
                    })
                  }
                  if (expectedStyle === 'identification') {
                    parsed.forEach((r) => {
                      if (/^[A-Za-z]$/.test(r.correct_answer)) problems.push(`Q${r.question_number}: "${r.correct_answer}" looks like multiple choice, not text.`)
                    })
                  }
                  for (let i = 1; i < parsed.length; i++) {
                    if (parsed[i].question_number !== parsed[i - 1].question_number + 1) {
                      problems.push(`Question numbers are not sequential around Q${parsed[i].question_number}.`)
                    }
                  }
                  setCheckResult(problems.length === 0 ? ['✓ Answer key looks good.'] : problems)
                }}
              >
                Check answer key
              </Button>
              {checkResult && (
                <ul className="rounded-md border p-2 text-xs">
                  {checkResult.map((p, i) => (
                    <li key={i} className={p.startsWith('✓') ? 'text-green-700' : 'text-destructive'}>{p}</li>
                  ))}
                </ul>
              )}
              <Button
                variant="secondary"
                onClick={() => {
                  const parsed = parseAnswerKeyText(pasteText)
                  if (parsed.length === 0) {
                    setError('No answers found. Use one answer per line, e.g. "B", "True", "Encapsulation".')
                    return
                  }
                  setDraft(parsed)
                  setError(null)
                }}
              >
                Preview
              </Button>
              <Button variant="outline" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                Save draft
              </Button>
              <Button
                onClick={() => {
                  const parsed = draft ?? parseAnswerKeyText(pasteText)
                  if (parsed.length === 0) {
                    setError('Paste the answer key before confirming.')
                    return
                  }
                  setDraft(parsed)
                  saveAnswerKeys(sessionId!, parsed)
                    .then(() => saveRules(sessionId!, rules))
                    .then(() => confirmMutation.mutate())
                    .catch((e) => setError(e.message))
                }}
                disabled={confirmMutation.isPending}
              >
                Confirm answer key
              </Button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Answer key {locked ? '(confirmed ✓)' : 'preview'}</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No answer key yet.</p>
          ) : (
            <ol className="divide-y text-sm max-h-72 overflow-y-auto">
              {rows.map((row) => (
                <li key={row.question_number} className="flex items-center gap-3 py-1.5">
                  <span className="w-8 text-right text-muted-foreground">{row.question_number}.</span>
                  <span className="flex-1 font-medium">{row.correct_answer}</span>
                  <Badge variant="outline">{row.question_type}</Badge>
                </li>
              ))}
            </ol>
          )}
          {locked && (
            <div className="mt-3 space-y-1">
              <p className="text-sm text-green-700">✓ Locked. Ready to check student papers.</p>
              {session?.rules && (
                <p className="text-xs text-muted-foreground">
                  Rules: {session.rules.replace(/\n/g, ' · ')}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {locked && (
        <Card>
          <CardHeader>
            <CardTitle>Who are you checking?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Search student name..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
            />
            <div className="max-h-64 divide-y overflow-y-auto rounded-md border">
              {students
                ?.filter((s) => s.name.toLowerCase().includes(studentSearch.toLowerCase()))
                .map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`block w-full px-3 py-2 text-left text-sm hover:bg-muted/50 ${
                      selectedStudent === s.id
                        ? 'bg-primary/10 font-medium text-primary'
                        : checkedIds.has(s.id)
                          ? 'bg-green-50 text-green-800'
                          : ''
                    }`}
                    onClick={() => {
                      setSelectedStudent(s.id)
                      setSelectedStudentName(s.name)
                    }}
                  >
                    {s.name}
                    {checkedIds.has(s.id) && <span className="float-right text-green-600">✓ Checked</span>}
                  </button>
                ))}
              {students?.filter((s) => s.name.toLowerCase().includes(studentSearch.toLowerCase())).length === 0 && (
                <p className="px-3 py-4 text-center text-sm text-muted-foreground">No students found.</p>
              )}
            </div>

            {selectedStudentName && (
              <>
                <p className="text-sm text-green-700">✓ Now checking: {selectedStudentName}</p>
                <CameraCapture
                  onCapture={async (b64) => {
                    setPreview(`data:image/jpeg;base64,${b64}`)
                    setPaperLoading(true)
                    setPaperResult(null)
                    setPaperError(null)
                    setPaperProgress(5)
                    const interval = setInterval(() => {
                      setPaperProgress((p) => Math.min(90, p + Math.max(1, Math.round((90 - p) / 10))))
                    }, 500)
                    try {
                      const { data, error } = await supabase.functions.invoke('read-answers', {
                        body: { imageBase64: b64, mimeType: 'image/jpeg', totalItems: rows.length, rules: session?.rules ?? '' },
                      })
                      if (error) throw error
                      if (data?.error) throw new Error(data.error)
                      const scored = calculateScore(data.answers ?? [], rows)
                      const violations: { question_number: number | null; violation: string }[] = data.rule_violations ?? []
                      const violatedNumbers = new Set(
                        violations.filter((v) => v.question_number !== null).map((v) => v.question_number),
                      )
                      const adjustedDetails = scored.details.map((d) => ({
                        ...d,
                        is_correct: d.is_correct && !violatedNumbers.has(d.question_number),
                      }))
                      const adjustedScore = {
                        score: adjustedDetails.filter((d) => d.is_correct).length,
                        total: scored.total,
                        details: adjustedDetails,
                      }
                      setPaperResult(adjustedScore)
                      setRuleViolations(violations)
                    } catch (e) {
                      let message = e instanceof Error ? e.message : String(e)
                      if (e && typeof e === 'object' && 'context' in e) {
                        try {
                          const body = await (e as { context: Response }).context.json()
                          if (body?.error) message = body.error
                        } catch { /* ignore */ }
                      }
                      setPaperError(message)
                    } finally {
                      clearInterval(interval)
                      setPaperProgress(100)
                      setPaperLoading(false)
                    }
                  }}
                />
                {preview && <img src={preview} alt="Captured" className="max-h-48 rounded-md border" />}
                {paperLoading && (
                  <div className="space-y-1">
                    <div className="h-2 w-full rounded bg-muted">
                      <div
                        className="h-full rounded bg-primary transition-all"
                        style={{ width: `${paperProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Reading answers… {paperProgress}%</p>
                  </div>
                )}
                {paperError && <p className="text-sm text-destructive">{paperError}</p>}
                {paperResult && (
                  <Card>
                    <CardContent className="space-y-2 py-4">
                      <p className="text-lg font-semibold">
                        {selectedStudentName}: {paperResult.score}/{paperResult.total} ({Math.round((paperResult.score / paperResult.total) * 100)}%)
                      </p>
                      {ruleViolations.length > 0 && (
                        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
                          <p className="font-medium">Rule violations detected:</p>
                          <ul className="list-disc pl-4">
                            {ruleViolations.map((v, i) => (
                              <li key={i}>
                                {v.question_number !== null ? `Q${v.question_number}: ` : ''}{v.violation}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <ol className="divide-y text-sm">
                        {paperResult.details.map((d) => (
                          <li key={d.question_number} className="flex items-center gap-2 py-1">
                            <span className="w-6 text-right text-muted-foreground">{d.question_number}.</span>
                            <span className="flex-1">{d.student_answer}</span>
                            <span className={d.is_correct ? 'text-green-600' : 'text-destructive'}>
                              {d.is_correct ? '✓' : `✗ (${d.correct_answer})`}
                            </span>
                          </li>
                        ))}
                      </ol>
                      <Button
                        className="w-full"
                        onClick={async () => {
                          try {
                            await saveSubmission({
                              checking_session_id: sessionId!,
                              student_id: selectedStudent!,
                              score: paperResult.score,
                              total_items: paperResult.total,
                              answers: paperResult.details.map((d) => ({
                                question_number: d.question_number,
                                student_answer: d.student_answer,
                                correct_answer: d.correct_answer,
                                is_correct: d.is_correct,
                              })),
                            })
                            setCheckedIds((prev) => new Set(prev).add(selectedStudent!))
                            setPaperResult(null)
                            setPaperError(null)
                            setPreview(null)
                            setError(null)
                            setSelectedStudent(null)
                            setSelectedStudentName(null)
                          } catch (e) {
                            setPaperError(e instanceof Error ? e.message : String(e))
                          }
                        }}
                      >
                        Save result
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </section>
  )
}
