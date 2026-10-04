import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { getClass } from '../services/classService'
import {
  addStudents,
  deleteAllStudents,
  deleteStudent,
  listStudents,
  renameStudent,
} from '../services/studentService'
import { buildStudentSeeds, formatStudentNumber, parseStudentNames } from '../lib/students'
import { createSession, deleteSession, listSessions } from '../services/sessionService'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { Label } from '../components/ui/label'
import { Plus } from 'lucide-react'

export default function ClassDetailPage() {
  const { classId } = useParams<{ classId: string }>()
  const queryClient = useQueryClient()
  const [pasteText, setPasteText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sessionOpen, setSessionOpen] = useState(false)
  const [newSessionName, setNewSessionName] = useState('')

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

  const { data: sessions } = useQuery({
    queryKey: ['sessions', classId],
    queryFn: () => listSessions(classId!),
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
  const deleteAllMutation = useMutation({
    mutationFn: () => deleteAllStudents(classId!),
    onSuccess: invalidate,
  })
  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameStudent(id, name),
    onSuccess: invalidate,
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
    <section className="space-y-4">
      <div>
        <Link to="/classes" className="text-sm text-primary">&larr; Back to classes</Link>
        <h2 className="mt-1 text-xl font-semibold">
          {classRow ? `${classRow.block_name} · ${classRow.school_year}` : 'Loading…'}
        </h2>
        <p className="text-sm text-muted-foreground">{students?.length ?? 0} students</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add students</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={6}
            className="max-h-60 overflow-y-auto"
            placeholder={'GARCIA, JERICO B.\nCRUZ, JUAN D.\nAQUINO, PAOLO R.'}
          />
          <div className="flex flex-col gap-2">
            <Button onClick={handlePasteSubmit} disabled={addMutation.isPending}>
              Add from pasted names
            </Button>
            <label className="cursor-pointer rounded-md border px-4 py-2 text-center text-sm font-medium hover:bg-muted/50">
              Import Excel/CSV
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleExcel(e.target.files[0])}
              />
            </label>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Students</CardTitle>
            {students && students.length > 0 && (
              <button
                className="text-xs text-destructive"
                onClick={() => {
                  if (window.confirm(`Delete ALL ${students.length} students in this class?`)) {
                    deleteAllMutation.mutate()
                  }
                }}
              >
                Delete all
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="divide-y p-0 max-h-96 overflow-y-auto">
          {students?.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">No students yet.</p>
          )}
          {students?.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3 px-4 py-2">
              <span className="w-8 text-sm text-muted-foreground">{s.student_number ?? formatStudentNumber(i)}</span>
              <span className="flex-1 text-sm">{s.name}</span>
              <button
                className="text-xs text-primary"
                onClick={() => {
                  const name = window.prompt('Edit student name', s.name)
                  if (name && name.trim() && name !== s.name) renameMutation.mutate({ id: s.id, name: name.trim() })
                }}
              >
                Edit
              </button>
              <button
                className="text-xs text-destructive"
                onClick={() => {
                  if (window.confirm(`Delete ${s.name}?`)) deleteMutation.mutate(s.id)
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Checking sessions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="divide-y">
            {sessions?.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">No sessions yet.</p>
            )}
            {sessions?.map((s) => (
              <Link
                key={s.id}
                to={`/sessions/${s.id}`}
                className="flex items-center justify-between py-2 text-sm hover:bg-muted/50"
              >
                <span className="font-medium">{s.session_name || 'Untitled session'}</span>
                <span className="flex items-center gap-3">
                  <span className="text-muted-foreground">{s.answer_key_confirmed ? 'Key confirmed ✓' : s.status}</span>
                  <button
                    className="text-xs text-destructive"
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
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={sessionOpen} onOpenChange={setSessionOpen}>
        <DialogTrigger
          aria-label="New session"
          className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-none bg-primary text-primary-foreground shadow-lg"
        >
          <Plus className="h-6 w-6" />
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New session</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const name = newSessionName.trim()
              if (!name) return
              sessionMutation.mutate(name)
              setNewSessionName('')
              setSessionOpen(false)
            }}
            className="space-y-3"
          >
            <div>
              <Label htmlFor="session_name">Session name</Label>
              <Input
                id="session_name"
                placeholder="e.g. Midterm Examination"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full">Create session</Button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  )
}
