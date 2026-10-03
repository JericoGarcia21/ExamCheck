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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
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
    mutationFn: () => saveAnswerKeys(sessionId!, rows.filter((r) => r.correct_answer.trim() !== '')),
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

  function updateRow(index: number, patch: Partial<Row>) {
    setDraft(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  function addRow() {
    const next = rows.length > 0 ? Math.max(...rows.map((r) => r.question_number)) + 1 : 1
    setDraft([...rows, { question_number: next, correct_answer: '', question_type: 'multiple_choice' }])
  }

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

      <div className="rounded-lg border bg-white p-4">
        <h3 className="text-sm font-semibold">Upload answer key image (reference only)</h3>
        <input
          type="file"
          accept="image/*,.pdf"
          className="mt-2 text-sm"
          disabled={locked}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file && file.type.startsWith('image/')) {
              setPreviewUrl(URL.createObjectURL(file))
            } else {
              setPreviewUrl(null)
            }
          }}
        />
        {previewUrl && (
          <img src={previewUrl} alt="Answer key preview" className="mt-3 max-h-64 rounded-md border" />
        )}
        <p className="mt-2 text-xs text-gray-500">
          OCR extraction will be added later. For now, type the answers below manually.
        </p>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <h3 className="text-sm font-semibold">Paste answer key</h3>
        <textarea
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          rows={6}
          disabled={locked}
          placeholder={'B\nC\nA\nD\nTrue\nEncapsulation'}
          className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          disabled={locked}
          className="mt-2 rounded-md bg-gray-800 px-4 py-2 text-sm text-white disabled:opacity-50"
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
          Load into table
        </button>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <h3 className="text-sm font-semibold">Answer key</h3>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="pb-2 pr-3">#</th>
              <th className="pb-2 pr-3">Correct answer</th>
              <th className="pb-2 pr-3">Type</th>
              {!locked && <th />}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t">
                <td className="py-1 pr-3 text-gray-500">{row.question_number}</td>
                <td className="py-1 pr-3">
                  <input
                    value={row.correct_answer}
                    disabled={locked}
                    onChange={(e) => updateRow(i, { correct_answer: e.target.value })}
                    placeholder="B"
                    className="w-full rounded border px-2 py-1"
                  />
                </td>
                <td className="py-1 pr-3">
                  <select
                    value={row.question_type}
                    disabled={locked}
                    onChange={(e) => updateRow(i, { question_type: e.target.value })}
                    className="rounded border px-2 py-1"
                  >
                    <option value="multiple_choice">Multiple choice</option>
                    <option value="true_false">True/False</option>
                    <option value="identification">Identification</option>
                    <option value="short_answer">Short answer</option>
                  </select>
                </td>
                {!locked && (
                  <td className="py-1">
                    <button
                      className="text-xs text-red-600"
                      onClick={() => setDraft(rows.filter((_, idx) => idx !== i))}
                    >
                      Remove
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {!locked && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button onClick={addRow} className="rounded-md border px-3 py-1.5 text-sm">
              + Add question
            </button>
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="rounded-md bg-gray-800 px-4 py-1.5 text-sm text-white disabled:opacity-50"
            >
              Save draft
            </button>
            <button
              onClick={() => {
                if (rows.filter((r) => r.correct_answer.trim() !== '').length === 0) {
                  setError('Add at least one answer before confirming.')
                  return
                }
                saveMutation.mutate()
                confirmMutation.mutate()
              }}
              disabled={confirmMutation.isPending}
              className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              Confirm answer key
            </button>
          </div>
        )}

        {locked && <p className="mt-3 text-sm text-green-700">✓ Answer key confirmed and locked.</p>}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    </section>
  )
}
