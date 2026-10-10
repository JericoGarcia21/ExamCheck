import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
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
import { Badge } from '../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { Label } from '../components/ui/label'
import { Skeleton } from '../components/ui/skeleton'
import { detectNameColumn, previewRoster, validateRosterFile } from '../lib/rosterImport'
import { Plus } from 'lucide-react'

export default function ClassDetailPage() {
  const { classId } = useParams<{ classId: string }>()
  const queryClient = useQueryClient()
  const [importRows, setImportRows] = useState<unknown[][] | null>(null)
  const [importColumn, setImportColumn] = useState(0)
  const [importHeader, setImportHeader] = useState(true)
  const [importLoading, setImportLoading] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sessionOpen, setSessionOpen] = useState(false)
  const [newSessionName, setNewSessionName] = useState('')

  const { data: classRow, error: classError } = useQuery({
    queryKey: ['class', classId],
    queryFn: () => getClass(classId!),
    enabled: !!classId,
  })

  const { data: students, error: studentsError } = useQuery({
    queryKey: ['students', classId],
    queryFn: () => listStudents(classId!),
    enabled: !!classId,
  })

  const { data: sessions, error: sessionsError } = useQuery({
    queryKey: ['sessions', classId],
    queryFn: () => listSessions(classId!),
    enabled: !!classId,
  })

  const importPreview = useMemo(() => previewRoster(importRows ?? [], importColumn, importHeader, (students ?? []).map((s) => s.name)), [importRows, importColumn, importHeader, students])
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['students', classId] })

  const addMutation = useMutation({
    mutationFn: async (rawNames: string[]) => {
      const startingIndex = students?.length ?? 0
      await addStudents(classId!, buildStudentSeeds(rawNames, startingIndex))
    },
    onSuccess: () => {
      invalidate()
      setImportRows(null)
      setPasteText('')
      setError(null)
    },
    onError: (e) => setError(e.message),
  })

  const deleteMutation = useMutation({ mutationFn: deleteStudent, onSuccess: invalidate, onError: () => setError('Could not delete the student. Please retry.') })
  const deleteAllMutation = useMutation({
    mutationFn: () => deleteAllStudents(classId!),
    onError: () => setError('Could not delete the roster. Please retry.'),
    onSuccess: invalidate,
  })
  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameStudent(id, name),
    onError: () => setError('Could not rename the student. Please retry.'),
    onSuccess: invalidate,
  })

  const sessionMutation = useMutation({
    mutationFn: (name: string) => createSession(classId!, name),
    onError: () => setError('Could not save the session. Please retry.'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', classId] })
      setNewSessionName('')
      setSessionOpen(false)
    },
  })

  const deleteSessionMutation = useMutation({
    mutationFn: deleteSession,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions', classId] }),
  })

  function handlePasteSubmit() {
    const existingNames = new Set((students ?? []).map((s) => s.name.toLowerCase().trim()))
    const names = parseStudentNames(pasteText).filter((n) => !existingNames.has(n.toLowerCase().trim()))
    if (names.length === 0) {
      setError('No new student names found (duplicates are skipped).')
      return
    }
    addMutation.mutate(names)
  }

  async function handleExcel(file: File) {
    setError(null)
    setImportLoading(true)
    try {
      validateRosterFile(file)
      const XLSX = await import('xlsx')
      const workbook = XLSX.read(await file.arrayBuffer())
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      if (!sheet) throw new Error('The workbook has no worksheet.')
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 })
      if (rows.length > 5000) throw new Error('Import up to 5,000 rows at a time.')
      const detected = detectNameColumn(rows)
      setImportColumn(detected.column)
      setImportHeader(detected.hasHeader)
      setImportRows(rows)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read the file.')
    } finally { setImportLoading(false) }
  }

  return (
    <section className="space-y-4">
      {(classError || studentsError || sessionsError) && <p role="alert" className="text-destructive">Could not load the class. Check your connection and reload.</p>}
      <div>
        <Link to="/classes" className="text-sm text-primary">&larr; Back to classes</Link>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">
          {classRow ? `${classRow.block_name} · ${classRow.school_year}` : <Skeleton className="h-8 w-56" />}
        </h2>
        <p className="text-sm text-muted-foreground">{students?.length ?? 0} students</p>
      </div>

      {classRow?.archived_at && <div className="rounded-lg border bg-muted/50 p-4"><p className="text-sm font-medium">This class is archived</p><p className="mt-1 text-sm text-muted-foreground">Its students and exam history are still here. <Link to="/classes" className="font-medium text-primary">Restore it from the Archived tab.</Link></p></div>}

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
                disabled={importLoading || addMutation.isPending}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleExcel(e.target.files[0])}
              />
            </label>
          </div>
          {importLoading && <p role="status">Reading roster…</p>}
          {importRows && (
            <div className="space-y-2 rounded border p-3">
              <Label htmlFor="name-column">Student name column</Label>
              <select id="name-column" className="w-full rounded border p-2" value={importColumn} onChange={(e) => setImportColumn(Number(e.target.value))}>
                {Array.from({ length: Math.max(...importRows.map((r) => r.length), 1) }, (_, i) => <option key={i} value={i}>Column {i + 1}: {String(importRows[0]?.[i] ?? '')}</option>)}
              </select>
              <label className="flex items-center gap-2"><input type="checkbox" checked={importHeader} onChange={(e) => setImportHeader(e.target.checked)} />First row is a header</label>
              <p>{importPreview.names.length} new students · {importPreview.duplicates} duplicates skipped · {importPreview.rejected} invalid rows skipped</p>
              <ul className="max-h-40 overflow-auto text-sm">{importPreview.names.map((n) => <li key={n}>{n}</li>)}</ul>
              <p className="text-xs text-muted-foreground">Names matching the existing roster are skipped. Check students who share a name before importing.</p>
              <Button disabled={addMutation.isPending || importPreview.names.length === 0} onClick={() => addMutation.mutate(importPreview.names)}>Confirm import</Button>
              <Button variant="outline" onClick={() => setImportRows(null)}>Cancel</Button>
            </div>
          )}
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
                  if (window.confirm(`Delete ALL ${students.length} students and their historical grades? This cannot be undone.`)) {
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
          {!students && (
            <div className="divide-y">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                  <Skeleton className="h-4 w-6" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          )}
          {students?.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">No students yet.</p>
          )}
          {students?.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3 px-4 py-2">
              <span className="w-8 text-sm text-muted-foreground">{formatStudentNumber(i)}</span>
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
                  if (window.confirm(`Delete ${s.name} and all their historical grades? This cannot be undone.`)) deleteMutation.mutate(s.id)
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
            {!sessions && (
              <>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                ))}
              </>
            )}
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
                  <Badge variant={s.answer_key_confirmed ? 'default' : 'secondary'}>
                    {s.answer_key_confirmed ? 'Key confirmed ✓' : s.status}
                  </Badge>
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
          className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105"
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
            <Button type="submit" disabled={sessionMutation.isPending} className="w-full">Create session</Button>
            {sessionMutation.error && <p role="alert" className="text-destructive">Could not create the session. Please retry.</p>}
          </form>
        </DialogContent>
      </Dialog>
    </section>
  )
}
