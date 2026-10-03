import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import {
  confirmAnswerKey,
  getSession,
  listAnswerKeys,
  saveAnswerKeys,
} from '../services/sessionService'

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
            Paste your answer key, one answer per line. The order is the question number.
          </p>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={8}
            placeholder={'B\nC\nA\nD\nTrue\nEncapsulation'}
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
    </section>
  )
}
