import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateClass } from '../services/classService'
import type { ClassRow } from '../types'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { Input } from './ui/input'
import { Label } from './ui/label'

export default function ClassDetailsEditor({ row }: { row: ClassRow }) {
  const client = useQueryClient()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [year, setYear] = useState('')
  const [notice, setNotice] = useState('')
  const save = useMutation({
    mutationFn: () => updateClass(row.id, { block_name: name, school_year: year }),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['classes'] }),
        client.invalidateQueries({ queryKey: ['class', row.id] }),
        client.invalidateQueries({ queryKey: ['allSessions'] }),
        client.invalidateQueries({ queryKey: ['sessionWithClass'] }),
        client.invalidateQueries({ queryKey: ['sessionResult'] }),
      ])
      setOpen(false); setNotice('Class details saved.')
    },
  })
  return <>
    <Button variant="outline" onClick={() => { setName(row.block_name); setYear(row.school_year); save.reset(); setNotice(''); setOpen(true) }}>Edit class</Button>
    {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
    <Dialog open={open} onOpenChange={value => { if (!save.isPending) setOpen(value) }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit class</DialogTitle><DialogDescription>Update the block and academic year. Students, sessions, and grades stay in this class.</DialogDescription></DialogHeader>
        <form className="space-y-4" onSubmit={e => { e.preventDefault(); if (name.trim() && year.trim() && !save.isPending) save.mutate() }}>
          <div className="space-y-2"><Label htmlFor="edit-block">Block name</Label><Input id="edit-block" required maxLength={200} value={name} disabled={save.isPending} onChange={e => setName(e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="edit-year">Academic year</Label><Input id="edit-year" required maxLength={40} placeholder="2026-2027" value={year} disabled={save.isPending} onChange={e => setYear(e.target.value)} /></div>
          {save.error && <p role="alert" className="text-sm text-destructive">{save.error.message}</p>}
          <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" disabled={save.isPending} onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={save.isPending || !name.trim() || !year.trim()}>{save.isPending ? 'Saving...' : 'Save class'}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  </>
}
