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
import { calculateScore, normalizeAnswer } from '../lib/scoring'
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
  const [reviewMode, setReviewMode] = useState<'none' | 'view' | 'edit'>('none')
  const [reviewQuestion, setReviewQuestion] = useState<number | null>(null)
  const [reviewStudentAnswer, setReviewStudentAnswer] = useState<string>('')
  const [reviewConfidence, setReviewConfidence] = useState<number | null>(null)
  const [lowConfidenceQuestions, setLowConfidenceQuestions] = useState<number[]>([])
  const [reviewIndex, setReviewIndex] = useState(0)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [scoreOverride, setScoreOverride] = useState<string>('')

  const handleReviewSubmit = async () => {
    try {
      // Apply the teacher's edited answer back into the result details
      const details = paperResult?.details ?? []
      const itemIndex = details.findIndex((d) => d.question_number === reviewQuestion)
      
      if (itemIndex >= 0) {
        details[itemIndex].review_status = reviewMode === 'view' ? 'accepted' : 'edited'
        // If the teacher edited the answer, apply the edited text
        if (reviewMode === 'edit' && reviewStudentAnswer.trim() !== '') {
          details[itemIndex].student_answer = reviewStudentAnswer.trim()
          // Re-evaluate correctness against the answer key
          const keyItem = rows.find((r) => r.question_number === reviewQuestion)
          if (keyItem) {
            details[itemIndex].is_correct =
              normalizeAnswer(details[itemIndex].student_answer, keyItem.question_type) ===
              normalizeAnswer(keyItem.correct_answer, keyItem.question_type)
          }
        }
      }
      
      // Move to the next low-confidence question, or finish
      const nextIndex = reviewIndex + 1
      if (nextIndex < lowConfidenceQuestions.length) {
        const nextQ = lowConfidenceQuestions[nextIndex]
        const nextDetail = details.find((d) => d.question_number === nextQ)
        setReviewIndex(nextIndex)
        setReviewQuestion(nextQ)
        setReviewStudentAnswer(nextDetail?.student_answer ?? '')
        setReviewConfidence(nextDetail?.confidence ?? null)
        setReviewMode('view')
        return
      }
      
      // Recalculate score from the (possibly edited) answers
      const recalculatedScore = details.filter((d) => d.is_correct).length

      // Teacher may override the final score
      let finalScore = recalculatedScore
      if (scoreOverride !== '') {
        const n = Number(scoreOverride)
        if (Number.isNaN(n) || n < 0 || n > paperResult.total) {
          setError(`Teacher score must be a number between 0 and ${paperResult.total}.`)
          return
        }
        finalScore = n
      }

      // All reviewed — save the submission
      await saveSubmission({
        checking_session_id: sessionId!,
        student_id: selectedStudent!,
        score: finalScore,
        total_items: paperResult.total,
        answers: details.map((d) => ({
          question_number: d.question_number,
          student_answer: d.student_answer,
          correct_answer: d.correct_answer,
          is_correct: d.is_correct,
          confidence: d.confidence ?? null,
          review_status: d.review_status ?? 'pending',
        })),
      })

      setReviewMode('none')
      setReviewQuestion(null)
      setReviewStudentAnswer('')
      setReviewConfidence(null)
      setLowConfidenceQuestions([])
      setReviewIndex(0)
      setScoreOverride('')
      queryClient.invalidateQueries({ queryKey: ['submissions', sessionId] })
      setSaveMessage(`Saved ${selectedStudentName}: ${finalScore}/${paperResult.total}${finalScore !== recalculatedScore ? ' (teacher-adjusted)' : ''}`)
      setPaperResult(null)
      setPaperError(null)
      setPreview(null)
      setError(null)
      setSelectedStudent(null)
      setSelectedStudentName(null)
      setTimeout(() => setSaveMessage(null), 4000)
    } catch (e) {
      setPaperError(e instanceof Error ? e.message : String(e))
    }
  }

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

  const { data: doneSubmissions } = useQuery({
    queryKey: ['submissions', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('submissions')
        .select('student_id')
        .eq('checking_session_id', sessionId!)
      if (error) throw error
      return data ?? []
    },
    enabled: !!sessionId,
  })

  const doneIds = new Set([
    ...(doneSubmissions ?? []).map((s) => s.student_id),
    ...checkedIds,
  ])

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
          <h2 className="text-2xl font-semibold tracking-tight">{session?.session_name ?? 'Checking session'}</h2>
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
                        : doneIds.has(s.id)
                          ? 'bg-green-50 text-green-800'
                          : ''
                    }`}
                    onClick={() => {
                      setSelectedStudent(s.id)
                      setSelectedStudentName(s.name)
                    }}
                  >
                    {s.name}
                    {doneIds.has(s.id) && <span className="float-right text-green-600">✓ Checked</span>}
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
                      
                      // Track low-confidence answers for optional review
                      const lowConfidenceItems = scored.details
                        .filter((d) => d.confidence !== undefined && d.confidence < 0.7)
                        .map((d) => d.question_number)
                      
                      setPaperResult(adjustedScore)
                      setRuleViolations(violations)
                      setLowConfidenceQuestions(lowConfidenceItems)
                      setReviewIndex(0)
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
                {saveMessage && (
                  <p className="text-sm text-green-700 font-medium">✓ {saveMessage}</p>
                )}
                {paperResult && (
                  <Card>
                    <CardContent className="space-y-2 py-4">
                      <p className="text-lg font-semibold">
                        {selectedStudentName}: {paperResult.score}/{paperResult.total} ({Math.round((paperResult.score / paperResult.total) * 100)}%)
                      </p>
                      {(() => {
                        const confOf = (d: { confidence?: number | null; student_answer: string }): number => {
                          if (d.confidence !== undefined && d.confidence !== null) return d.confidence
                          const t = d.student_answer.trim()
                          if (!t) return 0.1
                          if (/^[a-e]$/i.test(t)) return 0.85
                          if (/^(true|false|t|f)$/i.test(t)) return 0.85
                          return 0.6
                        }
                        const details = paperResult.details
                        if (details.length === 0) return null
                        const avg = details.reduce((sum, d) => sum + confOf(d), 0) / details.length
                        const avgPct = Math.round(avg * 100)
                        const lowCount = details.filter((d) => confOf(d) < 0.7).length
                        return (
                          <p className={`text-sm font-medium ${avgPct < 70 ? 'text-destructive' : 'text-muted-foreground'}`}>
                            🤖 AI confidence: {avgPct}% average
                            {lowCount > 0 && ` · ${lowCount} below 70%`}
                          </p>
                        )
                      })()}
                      <div className="flex items-end gap-3 rounded-md border p-2">
                        <div className="text-sm">
                          <p className="text-muted-foreground text-xs">System score</p>
                          <p className="font-semibold">
                            {paperResult.score} / {paperResult.total}
                          </p>
                        </div>
                        <div className="flex-1">
                          <Label htmlFor="scoreOverride" className="text-xs text-muted-foreground">
                            Teacher final score (leave blank to keep system score)
                          </Label>
                          <Input
                            id="scoreOverride"
                            type="number"
                            min={0}
                            max={paperResult.total}
                            value={scoreOverride}
                            onChange={(e) => setScoreOverride(e.target.value)}
                            placeholder={`${paperResult.score}`}
                            className="mt-1"
                          />
                          {scoreOverride !== '' && (
                            <p className="text-xs mt-1">
                              {(() => {
                                const n = Number(scoreOverride)
                                if (Number.isNaN(n)) return <span className="text-destructive">Enter a number</span>
                                if (n < 0 || n > paperResult.total)
                                  return <span className="text-destructive">Must be 0–{paperResult.total}</span>
                                return (
                                  <span className="text-green-700">
                                    Final: {n} / {paperResult.total} ({Math.round((n / paperResult.total) * 100)}%)
                                  </span>
                                )
                              })()}
                            </p>
                          )}
                        </div>
                      </div>
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
                      <div className="flex items-center gap-2 py-1 text-xs font-semibold text-muted-foreground border-b">
                        <span className="w-6 text-right">No.</span>
                        <span className="flex-1">Answer</span>
                        <span className="w-10">Result</span>
                        <span className="ml-1 whitespace-nowrap" title="How sure the AI is that it read the answer correctly">
                          AI Confidence
                        </span>
                      </div>
                      <ol className="divide-y text-sm">
                        {paperResult.details.map((d) => {
                          // Fallback confidence if the AI did not provide one
                          const getConfidence = (): number => {
                            if (d.confidence !== undefined && d.confidence !== null) return d.confidence
                            const t = d.student_answer.trim()
                            if (!t) return 0.1
                            if (/^[a-e]$/i.test(t)) return 0.85
                            if (/^(true|false|t|f)$/i.test(t)) return 0.85
                            return 0.6
                          }
                          const conf = getConfidence()
                          const confidencePct = Math.round(conf * 100)
                          const isLowConfidence = conf < 0.7
                          return (
                            <li
                              key={d.question_number}
                              className={`flex items-center gap-2 py-1.5 ${
                                isLowConfidence ? 'border-l-2 border-destructive pl-2' : ''
                              }`}
                            >
                              <span className="w-6 text-right text-muted-foreground">{d.question_number}.</span>
                              <span className="flex-1">{d.student_answer}</span>
                              <span className={`w-10 ${d.is_correct ? 'text-green-600' : 'text-destructive'}`}>
                                {d.is_correct ? '✓' : `✗ (${d.correct_answer})`}
                              </span>
                              <span
                                className={`text-xs font-semibold ml-1 px-1.5 py-0.5 rounded whitespace-nowrap ${
                                  isLowConfidence
                                    ? 'bg-destructive/10 text-destructive'
                                    : 'bg-muted text-muted-foreground'
                                }`}
                                title={`AI confidence: ${confidencePct}% — how sure the AI is that it read this answer correctly`}
                              >
                                AI {confidencePct}%
                              </span>
                            </li>
                          )
                        })}
                      </ol>
                      {lowConfidenceQuestions.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {lowConfidenceQuestions.length} answer{lowConfidenceQuestions.length === 1 ? '' : 's'} need
                          review (confidence below 70%).
                        </p>
                      )}
                      <div className="flex flex-col gap-2">
                        {lowConfidenceQuestions.length > 0 && (
                          <Button
                            variant="outline"
                            onClick={() => {
                              const firstQ = lowConfidenceQuestions[0]
                              const detail = paperResult.details.find((d) => d.question_number === firstQ)
                              setReviewIndex(0)
                              setReviewQuestion(firstQ)
                              setReviewStudentAnswer(detail?.student_answer ?? '')
                              setReviewConfidence(detail?.confidence ?? null)
                              setReviewMode('view')
                            }}
                          >
                            Review {lowConfidenceQuestions.length} uncertain answer{lowConfidenceQuestions.length === 1 ? '' : 's'}
                          </Button>
                        )}
                        <Button
                          className="w-full"
                          onClick={async () => {
                            try {
                              // Teacher may override the system score
                              let finalScore = paperResult.score
                              if (scoreOverride !== '') {
                                const n = Number(scoreOverride)
                                if (Number.isNaN(n) || n < 0 || n > paperResult.total) {
                                  setError(`Teacher score must be a number between 0 and ${paperResult.total}.`)
                                  return
                                }
                                finalScore = n
                              }
                              await saveSubmission({
                                checking_session_id: sessionId!,
                                student_id: selectedStudent!,
                                score: finalScore,
                                total_items: paperResult.total,
                                answers: paperResult.details.map((d) => ({
                                  question_number: d.question_number,
                                  student_answer: d.student_answer,
                                  correct_answer: d.correct_answer,
                                  is_correct: d.is_correct,
                                  confidence: d.confidence ?? null,
                                  review_status: d.review_status ?? 'pending',
                                })),
                              })
                              setCheckedIds((prev) => new Set(prev).add(selectedStudent!))
                              queryClient.invalidateQueries({ queryKey: ['submissions', sessionId] })
                              setSaveMessage(`Saved ${selectedStudentName}: ${finalScore}/${paperResult.total}${finalScore !== paperResult.score ? ' (teacher-adjusted)' : ''}`)
                              setPaperResult(null)
                              setPaperError(null)
                              setPreview(null)
                              setError(null)
                              setScoreOverride('')
                              setLowConfidenceQuestions([])
                              setReviewIndex(0)
                              setSelectedStudent(null)
                              setSelectedStudentName(null)
                              setTimeout(() => setSaveMessage(null), 4000)
                            } catch (e) {
                              setPaperError(e instanceof Error ? e.message : String(e))
                            }
                          }}
                        >
                          Save result
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
      {/* Review uncertain answers screen */}
  {reviewMode !== 'none' && (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {reviewMode === 'view' ? 'Review Uncertain Answer' : 'Edit Answer'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Question <strong>{reviewQuestion}</strong>
            <span className="ml-2 text-xs">
              {reviewIndex + 1} of {lowConfidenceQuestions.length}
            </span>
          </p>
          <div className="rounded-md p-3 bg-muted/50">
            <p className="font-medium">Student answer:</p>
            <p className={`mt-1 text-lg font-mono ${reviewConfidence !== null && reviewConfidence < 0.7 ? 'text-destructive' : 'text-foreground'}`}>
              {reviewStudentAnswer || '—'}
            </p>
          </div>
          {reviewMode === 'view' ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">AI confidence:</p>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={`h-full rounded-full transition-colors ${(reviewConfidence ?? 0) < 0.7 ? 'bg-destructive' : 'bg-primary'}`}
                  style={{ width: `${(reviewConfidence ?? 0) * 100}%` }}
                />
              </div>
              <p className={`text-xs ${(reviewConfidence ?? 0) < 0.7 ? 'text-destructive' : 'text-foreground'}`}>
                {Math.round((reviewConfidence ?? 0) * 100)}%
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setReviewMode('none')}>
                  Skip review
                </Button>
                <Button variant="outline" onClick={() => setReviewMode('edit')}>
                  Edit answer
                </Button>
                <Button onClick={handleReviewSubmit}>
                  Accept
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Your interpretation:</p>
              <Textarea
                value={reviewStudentAnswer}
                onChange={(e) => setReviewStudentAnswer(e.target.value)}
                rows={2}
                placeholder="Enter the answer as you see it"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setReviewMode('view')}>
                  Back
                </Button>
                <Button
                  onClick={handleReviewSubmit}
                  disabled={reviewStudentAnswer.trim() === ''}
                >
                  Save answer
                </Button>
              </div>
            </div>
          )}
          {reviewConfidence !== null && reviewConfidence < 0.7 && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <p>This answer has low AI confidence ({Math.round(reviewConfidence * 100)}%). Please review carefully.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
      )}
    </section>
  )
}
