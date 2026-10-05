import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import CameraCapture, { type CameraCaptureHandle } from '../components/CameraCapture'
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
import { calculateScore, sumPoints, type AnswerKind, type ScoredAnswer, type StudentAnswer } from '../lib/scoring'
import { parseAnswerKeyText, type KeyRow } from '../lib/answerKey'
import { displayConfidence } from '../lib/confidence'
import { readPaperAnswers, extractFunctionError, type RuleViolation } from '../lib/readPaper'
import { useAnswerReview } from '../hooks/useAnswerReview'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { AlertCircle, CheckCircle2, Camera } from 'lucide-react'
import AnswerKeyEditor from '../components/session/AnswerKeyEditor'
import AnswerKeyPreview from '../components/session/AnswerKeyPreview'
import StudentPicker from '../components/session/StudentPicker'
import PaperResultCard from '../components/session/PaperResultCard'
import AnswerReviewDialog from '../components/session/AnswerReviewDialog'

export default function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const queryClient = useQueryClient()

  // Answer key editing
  const [draft, setDraft] = useState<KeyRow[] | null>(null)
  const [pasteText, setPasteText] = useState('')
  const [rules, setRules] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [expectedStyle, setExpectedStyle] = useState('any')
  const [checkResult, setCheckResult] = useState<string[] | null>(null)

  // Current paper
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)
  const [selectedStudentName, setSelectedStudentName] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [paperResult, setPaperResult] = useState<ReturnType<typeof calculateScore> | null>(null)
  const [paperError, setPaperError] = useState<string | null>(null)
  const [paperLoading, setPaperLoading] = useState(false)
  const [paperProgress, setPaperProgress] = useState(0)
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const [editText, setEditText] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [ruleViolations, setRuleViolations] = useState<RuleViolation[]>([])
  const [studentSearch, setStudentSearch] = useState('')
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [scoreOverride, setScoreOverride] = useState('')
  const cameraRef = useRef<CameraCaptureHandle>(null)

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

  const doneIds = new Set([...(doneSubmissions ?? []).map((s) => s.student_id), ...checkedIds])

  const isCheckedStudent = !!selectedStudent && doneIds.has(selectedStudent)

  // For already-checked students, don't force the camera flow. Let the teacher
  // see the saved result and/or edit the answer text directly.
  const { data: savedAnswers } = useQuery({
    queryKey: ['savedAnswers', sessionId, selectedStudent],
    queryFn: async () => {
      if (!selectedStudent) return []
      const { data: subs, error: subError } = await supabase
        .from('submissions')
        .select('id')
        .eq('checking_session_id', sessionId!)
        .eq('student_id', selectedStudent)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (subError) throw subError
      if (!subs) return []
      const { data: answers, error: ansError } = await supabase
        .from('answers')
        .select('question_number, student_answer, is_correct, confidence')
        .eq('submission_id', subs.id)
        .order('question_number', { ascending: true })
      if (ansError) throw ansError
      return answers ?? []
    },
    enabled: !!sessionId && !!selectedStudent && isCheckedStudent,
  })

  // Prefill the editable answer text when a checked student is selected.
  useEffect(() => {
    if (!savedAnswers || savedAnswers.length === 0) return
    const lines = savedAnswers.map((a) => `${a.question_number}. ${a.student_answer}`)
    setEditText(lines.join('\n'))
    setEditError(null)
  }, [savedAnswers])

  const rows: KeyRow[] =
    draft ??
    (keys ?? []).map((k) => ({
      question_number: k.question_number,
      correct_answer: k.correct_answer,
      question_type: (k.question_type ?? 'identification') as AnswerKind,
      rubric: k.rubric,
      max_points: k.max_points ?? 1,
    }))

  const locked = session?.answer_key_confirmed === true

  // A violation only affects the score when the teacher applies it.
  const appliedViolationNumbers = useMemo(
    () =>
      new Set(
        ruleViolations
          .filter((v) => v.applied && v.question_number !== null)
          .map((v) => v.question_number as number),
      ),
    [ruleViolations],
  )

  const effectiveDetails = useMemo(
    () =>
      (paperResult?.details ?? []).map((d) =>
        appliedViolationNumbers.has(d.question_number)
          ? { ...d, is_correct: false, points_awarded: 0 }
          : d,
      ),
    [paperResult, appliedViolationNumbers],
  )

  const effectiveScore = sumPoints(effectiveDetails)

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

  function updateDraft(questionNumber: number, patch: Partial<KeyRow>) {
    setDraft((prev) => (prev ? prev.map((r) => (r.question_number === questionNumber ? { ...r, ...patch } : r)) : prev))
  }

  const updateDetail = useCallback((questionNumber: number, patch: Partial<ScoredAnswer>) => {
    setPaperResult((prev) =>
      prev
        ? { ...prev, details: prev.details.map((d) => (d.question_number === questionNumber ? { ...d, ...patch } : d)) }
        : prev,
    )
  }, [])

  // A ref keeps the review hook able to read the freshest details without
  // re-creating its callbacks on every keystroke.
  const review = useAnswerReview({
    rows,
    details: paperResult?.details ?? [],
    updateDetail,
  })
  const reviewDetail =
    paperResult?.details.find((d) => d.question_number === review.question) ?? null

  const reviewCount = paperResult
    ? paperResult.details.filter((d) => d.needs_review || displayConfidence(d) < 0.7).length
    : 0

  function handleCheck() {
    const parsed = parseAnswerKeyText(pasteText)
    const problems: string[] = []
    if (parsed.length === 0) problems.push('No answers found in the paste.')
    if (expectedStyle === 'multiple_choice') {
      parsed.forEach((r) => {
        if (!/^[A-Za-z]$/.test(r.correct_answer))
          problems.push(`Q${r.question_number}: "${r.correct_answer}" is not a single letter.`)
      })
    }
    if (expectedStyle === 'true_false') {
      parsed.forEach((r) => {
        if (!/^(true|false)$/i.test(r.correct_answer))
          problems.push(`Q${r.question_number}: "${r.correct_answer}" is not True/False.`)
      })
    }
    for (let i = 1; i < parsed.length; i++) {
      if (parsed[i].question_number !== parsed[i - 1].question_number + 1) {
        problems.push(`Question numbers are not sequential around Q${parsed[i].question_number}.`)
      }
    }
    setCheckResult(problems.length === 0 ? ['✓ Answer key looks good.'] : problems)
  }

  function handlePreview() {
    const parsed = parseAnswerKeyText(pasteText)
    if (parsed.length === 0) {
      setError('No answers found. Use one answer per line, e.g. "B", "True", "Encapsulation".')
      return
    }
    setDraft(parsed)
    setError(null)
  }

  function handleConfirm() {
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
  }

  async function handleCapture(b64: string) {
    setPreview(`data:image/jpeg;base64,${b64}`)
    setPaperLoading(true)
    setPaperResult(null)
    setPaperError(null)
    setRuleViolations([])
    setPaperProgress(5)
    const interval = setInterval(() => {
      setPaperProgress((p) => Math.min(90, p + Math.max(1, Math.round((90 - p) / 10))))
    }, 500)
    try {
      const { result, violations } = await readPaperAnswers({
        imageBase64: b64,
        mimeType: 'image/jpeg',
        rules: session?.rules ?? '',
        rows,
      })
      setPaperResult(result)
      setRuleViolations(violations)
    } catch (e) {
      setPaperError(await extractFunctionError(e))
    } finally {
      clearInterval(interval)
      setPaperProgress(100)
      setPaperLoading(false)
    }
  }

  function toggleViolation(index: number) {
    setRuleViolations((prev) => prev.map((v, i) => (i === index ? { ...v, applied: !v.applied } : v)))
  }

  async function handleSaveResult() {
    if (!paperResult || !selectedStudent) return
    try {
      let finalScore = effectiveScore
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
        student_id: selectedStudent,
        score: finalScore,
        total_items: paperResult.total,
        answers: effectiveDetails.map((d) => ({
          question_number: d.question_number,
          student_answer: d.student_answer,
          correct_answer: d.correct_answer,
          is_correct: d.is_correct,
          confidence: d.confidence ?? null,
          review_status: d.review_status ?? 'pending',
          points_awarded: d.points_awarded,
          max_points: d.max_points,
          feedback: d.feedback ?? null,
          needs_review: d.needs_review ?? false,
        })),
      })
      setCheckedIds((prev) => new Set(prev).add(selectedStudent))
      queryClient.invalidateQueries({ queryKey: ['submissions', sessionId] })
      setSaveMessage(
        `Saved ${selectedStudentName}: ${finalScore}/${paperResult.total}${
          finalScore !== effectiveScore ? ' (teacher-adjusted)' : ''
        }`,
      )
      setPaperResult(null)
      setPaperError(null)
      setPreview(null)
      setError(null)
      setScoreOverride('')
      setRuleViolations([])
      setSelectedStudent(null)
      setSelectedStudentName(null)
      setTimeout(() => setSaveMessage(null), 4000)
    } catch (e) {
      setPaperError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <Link to={session ? `/classes/${session.class_id}` : '/classes'} className="text-sm text-primary">
          &larr; Back to class
        </Link>
        <div className="mt-1 flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">{session?.session_name ?? 'Checking session'}</h2>
          <Badge variant={locked ? 'default' : 'secondary'}>{locked ? 'Key confirmed' : 'Draft'}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{session?.session_date}</p>
      </div>

      {!locked && (
        <AnswerKeyEditor
          pasteText={pasteText}
          onPasteTextChange={setPasteText}
          rules={rules}
          onRulesChange={setRules}
          onSaveRules={() =>
            saveRules(sessionId!, rules)
              .then(() => setError(null))
              .catch((e) => setError(e.message))
          }
          expectedStyle={expectedStyle}
          onExpectedStyleChange={setExpectedStyle}
          checkResult={checkResult}
          onCheck={handleCheck}
          onPreview={handlePreview}
          onSaveDraft={() => saveMutation.mutate()}
          onConfirm={handleConfirm}
          savePending={saveMutation.isPending}
          confirmPending={confirmMutation.isPending}
          error={error}
        />
      )}

      <AnswerKeyPreview
        rows={rows}
        locked={locked}
        editable={!!draft}
        rules={session?.rules}
        onUpdate={updateDraft}
      />

      {locked && (
        <>
          <StudentPicker
            students={students}
            search={studentSearch}
            onSearchChange={setStudentSearch}
            selectedId={selectedStudent}
            doneIds={doneIds}
            onSelect={(s) => {
              setSelectedStudent(s.id)
              setSelectedStudentName(s.name)
            }}
          />

          <Card>
            <CardContent className="space-y-4 p-5 lg:p-6">
              {!selectedStudentName && (
                <p className="py-2 text-center text-sm text-muted-foreground">
                  Select a student above to start checking their paper.
                </p>
              )}

              {selectedStudentName && (
                <div className="space-y-4">
                  <p className="text-sm font-medium text-green-700">✓ Now checking: {selectedStudentName}</p>
                  {!isCheckedStudent && <CameraCapture ref={cameraRef} onCapture={handleCapture} />}
                  {isCheckedStudent && (
                    <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
                      <p className="text-xs text-muted-foreground">
                        This student was already checked. Edit the answers below instead of re-scanning the paper.
                      </p>
                      <textarea
                        className="h-40 w-full rounded-md border p-2 text-sm"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                      />
                      {editError && <p className="text-xs text-destructive">{editError}</p>}
                      <Button
                        size="sm"
                        onClick={() => {
                          const parsed = parseAnswerKeyText(editText)
                          if (parsed.length === 0) {
                            setEditError('No answers found. Use one answer per line, e.g. "1. B" or "B".')
                            return
                          }
                          const stuAnswers: StudentAnswer[] = parsed.map((r) => ({
                            question_number: r.question_number,
                            student_answer: r.correct_answer,
                          }))
                          const scored = calculateScore(stuAnswers, rows)
                          setPaperResult(scored)
                          setRuleViolations([])
                        }}
                      >
                        Recalculate score
                      </Button>
                    </div>
                  )}
                  {preview && (
                    <img src={preview} alt="Captured paper" className="max-h-64 rounded-2xl border object-contain" />
                  )}
                  {paperLoading && (
                    <div className="space-y-1">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${paperProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Reading answers… {paperProgress}%</p>
                    </div>
                  )}
                  {paperError && (
                    <div className="space-y-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{paperError}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => {
                          setPaperError(null)
                          setPreview(null)
                          cameraRef.current?.open()
                        }}
                      >
                        <Camera className="h-4 w-4" />
                        Retake photo
                      </Button>
                    </div>
                  )}
                  {saveMessage && (
                    <div className="flex items-center gap-2 rounded-2xl border border-green-600/30 bg-green-50 p-3 text-sm font-medium text-green-700">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      {saveMessage}
                    </div>
                  )}
                  {paperResult && (
                    <PaperResultCard
                      studentName={selectedStudentName}
                      result={paperResult}
                      effectiveScore={effectiveScore}
                      effectiveDetails={effectiveDetails}
                      appliedViolationNumbers={appliedViolationNumbers}
                      ruleViolations={ruleViolations}
                      onToggleViolation={toggleViolation}
                      scoreOverride={scoreOverride}
                      onScoreOverrideChange={setScoreOverride}
                      reviewCount={reviewCount}
                      onReview={review.open}
                      onSave={handleSaveResult}
                      onUpdateDetail={updateDetail}
                    />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <AnswerReviewDialog
        mode={review.mode}
        question={review.question}
        index={review.index}
        queueLength={review.queue.length}
        studentAnswer={review.studentAnswer}
        onStudentAnswerChange={review.setStudentAnswer}
        confidence={review.confidence}
        points={review.points}
        onPointsChange={review.setPoints}
        feedback={review.feedback}
        onFeedbackChange={review.setFeedback}
        maxPoints={reviewDetail?.max_points ?? null}
        suggestedFeedback={reviewDetail?.feedback}
        onSetMode={review.setMode}
        onSubmit={review.submit}
        onClose={review.close}
      />
    </section>
  )
}
