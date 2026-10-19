import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { listClasses } from '../services/classService'
import { copySession, updateSession } from '../services/sessionService'
import type { SessionRow } from '../types'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { Input } from './ui/input'
import { Label } from './ui/label'

export default function SessionActions({ session }: { session: SessionRow }) {
  const client = useQueryClient()
  const [mode, setMode] = useState<'copy' | 'edit' | null>(null)
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [classId, setClassId] = useState('')
  const [copyId, setCopyId] = useState('')
  const [notice, setNotice] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const classes = useQuery({ queryKey: ['classes', 'active'], queryFn: () => listClasses(), enabled: mode === 'copy' })
  const save = useMutation({
    mutationFn: async () => mode === 'copy'
      ? copySession({ sourceId: session.id, classId, name, copyId })
      : (await updateSession(session.id, { session_name: name.trim(), session_date: date })).id,
    onSuccess: async id => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['sessions'] }),
        client.invalidateQueries({ queryKey: ['allSessions'] }),
        client.invalidateQueries({ queryKey: ['session', session.id] }),
        client.invalidateQueries({ queryKey: ['sessionWithClass'] }),
        client.invalidateQueries({ queryKey: ['sessionResult'] }),
      ])
      setNotice(mode === 'copy' ? 'Session copied as an editable draft. The destination roster is unchanged.' : 'Session details saved.')
      setCopiedId(mode === 'copy' ? id : null); setMode(null)
    },
  })
  function open(value: 'copy' | 'edit') {
    save.reset(); setNotice(''); setCopiedId(null)
    setName(session.session_name ?? 'Untitled session'); setDate(session.session_date)
    setClassId(session.class_id); setCopyId(crypto.randomUUID()); setMode(value)
  }
  return <div className="space-y-2">
    <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => open('edit')}>Edit session</Button><Button variant="outline" onClick={() => open('copy')}>Copy to class</Button></div>
    {notice && <p role="status" className="text-sm text-muted-foreground">{notice} {copiedId && <Link className="font-medium text-primary underline" to={'/sessions/' + copiedId}>Open copied session</Link>}</p>}
    <Dialog open={mode !== null} onOpenChange={value => { if (!value && !save.isPending) setMode(null) }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{mode === 'copy' ? 'Copy session to a class' : 'Edit session details'}</DialogTitle><DialogDescription>{mode === 'copy' ? 'Copies the saved answer key, question types, points, rubrics, and rules into a new draft. Review and confirm it before checking. Students and grades are not copied. Save any answer-key changes first.' : 'Change the session name and exam date. The answer key and saved grades stay unchanged.'}</DialogDescription></DialogHeader>
        <form className="space-y-4" onSubmit={e => { e.preventDefault(); if (!save.isPending && name.trim()) save.mutate() }}>
          {mode === 'copy' && <div className="space-y-2"><Label htmlFor="copy-destination">Destination class</Label><select id="copy-destination" required disabled={save.isPending || !classes.data} value={classId} onChange={e => { setClassId(e.target.value); setCopyId(crypto.randomUUID()) }} className="min-h-11 w-full rounded-md border border-input bg-card px-3 text-sm"><option value="">Choose a class</option>{classes.data?.map(row => <option key={row.id} value={row.id}>{row.block_name} - {row.school_year}</option>)}</select>{classes.isPending && <p role="status" className="text-sm">Loading classes...</p>}{classes.isError && <div role="alert"><p>Could not load classes.</p><Button type="button" variant="outline" onClick={() => void classes.refetch()}>Retry</Button></div>}{classes.data?.length === 0 && <p className="text-sm">Create or restore a class before copying.</p>}</div>}
          <div className="space-y-2"><Label htmlFor="edit-session-name">Session name</Label><Input id="edit-session-name" required maxLength={200} value={name} disabled={save.isPending} onChange={e => { setName(e.target.value); setCopyId(crypto.randomUUID()) }} /></div>
          {mode === 'edit' && <div className="space-y-2"><Label htmlFor="edit-session-date">Exam date</Label><Input id="edit-session-date" type="date" required value={date} disabled={save.isPending} onChange={e => setDate(e.target.value)} /></div>}
          {save.error && <p role="alert" className="text-sm text-destructive">{save.error.message}</p>}
          <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" disabled={save.isPending} onClick={() => setMode(null)}>Cancel</Button><Button type="submit" disabled={save.isPending || !name.trim() || (mode === 'copy' ? !classes.data?.some(row => row.id === classId) : !date)}>{save.isPending ? 'Saving...' : mode === 'copy' ? 'Copy as draft' : 'Save session'}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  </div>
}
