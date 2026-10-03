import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { getClass } from '../services/classService'
import { addStudents, deleteStudent, listStudents, renameStudent } from '../services/studentService'
import { buildStudentSeeds, formatStudentNumber, parseStudentNames } from '../lib/students'
import {
  createSession,
  deleteSession,
  listSessions,
} from '../services/sessionService'

export default function ClassDetailPage() {
  const { classId } = useParams<{ classId: string }>()
  const queryClient = useQueryClient()
  const [pasteText, setPasteText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data: classRow } = useQuery({
    queryKey: ['class', classId],
    queryFn: () => getClass(classId!),
    enabled: !!classId,
  })

  const { data: students } = useQuery({
    queryKey: ['students', classId],
    queryFn: () => listStudents(classId!),
    enabled: !!classId,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['students', classId] })

  const addMutation = useMutation({
    mutationFn: async (rawNames: string[]) => {
      const startingIndex = students?.length ?? 0
      await addStudents(classId!, buildStudentSeeds(rawNames, startingIndex))
    },
    onSuccess: () => {
      invalidate()
      setPasteText('')
      setError(null)
    },
    onError: (e) => setError(e.message),
  })

  const deleteMutation = useMutation({ mutationFn: deleteStudent, onSuccess: invalidate })
  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameStudent(id, name),
    onSuccess: invalidate,
  })

  const { data: sessions } = useQuery({
    queryKey: ['sessions', classId],
    queryFn: () => listSessions(classId!),
    enabled: !!classId,
  })

  const sessionMutation = useMutation({
    mutationFn: (name: string) => createSession(classId!, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions', classId] }),
  })

  const deleteSessionMutation = useMutation({
    mutationFn: deleteSession,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions', classId] }),
  })

  function handlePasteSubmit() {
    const names = parseStudentNames(pasteText)
    if (names.length === 0) {
      setError('No student names found.')
      return
    }
    addMutation.mutate(names)
  }

  async function handleExcel(file: File) {
    setError(null)
    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer)
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 })
      const names: string[] = []
      for (const row of rows) {
        for (const cell of row) {
          if (typeof cell === 'string' && cell.trim().length > 0) {
            names.push(cell)
            break
          }
        }
      }
      const parsed = parseStudentNames(names.join('\n'))
      if (parsed.length === 0) {
        setError('No student names found in the file.')
        return
      }
      addMutation.mutate(parsed)
    } catch {
      setError('Could not read the Excel file.')
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <Link to="/classes" className="text-sm text-blue-600">&larr; Back to classes</Link>
        <h2 className="mt-1 text-xl font-semibold">
          {classRow ? `${classRow.block_name} · ${classRow.school_year}` : 'Loading…'}
        </h2>
        <p className="text-sm text-gray-500">{students?.length ?? 0} students</p>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <h3 className="text-sm font-semibold">Add students</h3>
        <textarea
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          rows={6}
          placeholder={'GARCIA, JERICO B.\nCRUZ, JUAN D.\nAQUINO, PAOLO R.'}
          className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            onClick={handlePasteSubmit}
            disabled={addMutation.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Add from pasted names
          </button>
          <label className="cursor-pointer rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50">
            Import Excel/CSV
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleExcel(e.target.files[0])}
            />
          </label>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      <ul className="divide-y rounded-lg border bg-white">
        {students?.map((s, i) => (
          <li key={s.id} className="flex items-center gap-3 px-4 py-2">
            <span className="w-8 text-sm text-gray-400">{s.student_number ?? formatStudentNumber(i)}</span>
            <span className="flex-1 text-sm">{s.name}</span>
            <button
              className="text-xs text-blue-600"
              onClick={() => {
                const name = window.prompt('Edit student name', s.name)
                if (name && name.trim() && name !== s.name) renameMutation.mutate({ id: s.id, name: name.trim() })
              }}
            >
              Edit
            </button>
            <button
              className="text-xs text-red-600"
              onClick={() => {
                if (window.confirm(`Delete ${s.name}?`)) deleteMutation.mutate(s.id)
              }}
            >
              Delete
            </button>
          </li>
        ))}
        {students?.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-gray-500">No students yet.</li>
        )}
      </ul>

      <div className="rounded-lg border bg-white p-4">
        <h3 className="text-sm font-semibold">Checking sessions</h3>
        <div className="mt-2 flex items-center gap-3">
          <button
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
            onClick={() => {
              const name = window.prompt('Session name (e.g. Midterm Examination)')
              if (name === null || name.trim() === '') return
              sessionMutation.mutate(name.trim())
            }}
          >
            + New session
          </button>
        </div>
        <ul className="mt-3 divide-y">
          {sessions?.map((s) => (
            <li key={s.id}>
              <Link
                to={`/sessions/${s.id}`}
                className="flex items-center justify-between py-2 text-sm hover:bg-gray-50"
              >
                <span className="font-medium">{s.session_name || 'Untitled session'}</span>
                <span className="flex items-center gap-3">
                  <span className="text-gray-500">{s.answer_key_confirmed ? 'Key confirmed ✓' : s.status}</span>
                  <button
                    className="text-xs text-red-600"
                    onClick={(e) => {
                      e.preventDefault()
                      if (window.confirm(`Delete session "${s.session_name || 'Untitled'}"?`)) {
                        deleteSessionMutation.mutate(s.id)
                      }
                    }}
                  >
                    Delete
                  </button>
                </span>
              </Link>
            </li>
          ))}
          {sessions?.length === 0 && (
            <li className="py-4 text-center text-sm text-gray-500">No sessions yet.</li>
          )}
        </ul>
      </div>
    </section>
  )
}
