import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { matchStudents } from '../lib/nameMatching'
import CameraCapture from '../components/CameraCapture'
import {
  confirmAnswerKey,
  getSession,
  listAnswerKeys,
  saveAnswerKeys,
} from '../services/sessionService'
import { listStudents } from '../services/studentService'

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

  const [detectedName, setDetectedName] = useState('')
  const [matches, setMatches] = useState<{ studentId: string; name: string; confidence: number }[]>([])
  const [identified, setIdentified] = useState<string | null>(null)
  const [ocrError, setOcrError] = useState<string | null>(null)
  const [ocrLoading, setOcrLoading] = useState(false)

  async function handleNameBase64(base64: string, mimeType: string) {
    setOcrError(null)
    setDetectedName('')
    setMatches([])
    setIdentified(null)
    setOcrLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('recognize-name', {
        body: { imageBase64: base64, mimeType },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      const name = (data?.detectedName ?? '').trim()
      setDetectedName(name)
      setMatches(matchStudents(name, (students ?? []).map((s) => ({ id: s.id, name: s.name }))))
    } catch (e) {
      setOcrError(e instanceof Error ? e.message : String(e))
    } finally {
      setOcrLoading(false)
    }
  }

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
    <section className="space-y-6">
      <div>
        <Link to={session ? `/classes/${session.class_id}` : '/classes'} className="text-sm text-blue-600">
          &larr; Back to class
        </Link>
        <h2 className="mt-1 text-xl font-semibold">
          {session?.session_name ?? 'Checking session'}
        </h2>
        <p className="text-sm text-gray-500">
          {session?.session_date} · {locked ? 'Answer key CONFIRMED ✓' : 'Not confirmed yet'}
        </p>
      </div>

      {!locked && (
        <div className="rounded-lg border bg-white p-4">
          <h3 className="text-sm font-semibold">Answer key</h3>
          <p className="mt-1 text-xs text-gray-500">
            Paste your answer key, one answer per line (with or without numbers). The order is the question number.
          </p>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={8}
            placeholder={'1. B\n2. C\n3. A\n4. D\n5. True\n6. Encapsulation'}
            className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              className="rounded-md bg-gray-800 px-4 py-2 text-sm text-white"
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
            </button>
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="rounded-md border px-4 py-2 text-sm disabled:opacity-50"
            >
              Save draft
            </button>
            <button
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
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Confirm answer key
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      )}

      <div className="rounded-lg border bg-white p-4">
        <h3 className="text-sm font-semibold">
          Answer key {locked ? '(confirmed ✓)' : 'preview'}
        </h3>
        {rows.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">No answer key yet.</p>
        ) : (
          <ol className="mt-3 divide-y text-sm">
            {rows.map((row) => (
              <li key={row.question_number} className="flex items-center gap-3 py-1.5">
                <span className="w-8 text-right text-gray-400">{row.question_number}.</span>
                <span className="flex-1 font-medium">{row.correct_answer}</span>
                <span className="text-xs text-gray-400">{row.question_type}</span>
              </li>
            ))}
          </ol>
        )}
        {locked && <p className="mt-3 text-sm text-green-700">✓ Locked. Ready to check student papers.</p>}
      </div>

      {locked && (
        <div className="rounded-lg border bg-white p-4">
          <h3 className="text-sm font-semibold">Identify student (name photo)</h3>
          <p className="mt-1 text-xs text-gray-500">
            Take a photo of the student's name on the paper, or upload one.
          </p>
          <CameraCapture onCapture={handleNameBase64} disabled={ocrLoading} />
          {ocrLoading && <p className="mt-2 text-sm text-gray-500">Reading name…</p>}
          {ocrError && <p className="mt-2 text-sm text-red-600">{ocrError}</p>}

          {detectedName && (
            <p className="mt-3 text-sm">
              Detected: <span className="font-medium">{detectedName}</span>
            </p>
          )}

          {matches.length > 0 && (
            <ul className="mt-3 divide-y rounded-md border">
              {matches.map((m) => (
                <li key={m.studentId} className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm font-medium">{m.name}</span>
                  <span className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">{Math.round(m.confidence * 100)}%</span>
                    <button
                      className="rounded-md bg-blue-600 px-3 py-1 text-xs text-white"
                      onClick={() => setIdentified(m.name)}
                    >
                      Confirm
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}

          {detectedName && matches.length === 0 && (
            <p className="mt-2 text-sm text-amber-700">
              No roster match found. Check the spelling or pick the student manually in the class roster (Coming in Phase 4).
            </p>
          )}

          {identified && (
            <p className="mt-3 text-sm text-green-700">✓ Student identified: {identified}</p>
          )}
        </div>
      )}
    </section>
  )
}
