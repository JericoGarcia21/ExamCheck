import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import CameraCapture from '../components/CameraCapture'
import {
  confirmAnswerKey,
  getSession,
  listAnswerKeys,
  saveAnswerKeys,
} from '../services/sessionService'
import { listStudents } from '../services/studentService'
import { Button } from '../components/ui/button'
import { Textarea } from '../components/ui/textarea'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
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
  const [error, setError] = useState<string | null>(null)
  const [expectedStyle, setExpectedStyle] = useState('any')
  const [checkResult, setCheckResult] = useState<string[] | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)
  const [selectedStudentName, setSelectedStudentName] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

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
            <div className="flex flex-col gap-2">
              <div>
                <Label htmlFor="style">Expected answer style</Label>
                <Select value={expectedStyle} onValueChange={setExpectedStyle}>
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
          {locked && <p className="mt-3 text-sm text-green-700">✓ Locked. Ready to check student papers.</p>}
        </CardContent>
      </Card>

      {locked && (
        <Card>
          <CardHeader>
            <CardTitle>Who are you checking?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select
              value={selectedStudent ?? ''}
              onValueChange={(id) => {
                setSelectedStudent(id || null)
                setSelectedStudentName(students?.find((s) => s.id === id)?.name ?? null)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
              <SelectContent>
                {students?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedStudentName && (
              <>
                <p className="text-sm text-green-700">✓ Now checking: {selectedStudentName}</p>
                <CameraCapture onCapture={(b64) => setPreview(`data:image/jpeg;base64,${b64}`)} />
                {preview && <img src={preview} alt="Captured" className="max-h-48 rounded-md border" />}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </section>
  )
}
