import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Archive, RotateCcw, ChevronRight } from 'lucide-react'
import { createClass, listClasses, setClassArchived } from '../services/classService'
import type { ClassRow } from '../types'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '../components/ui/dialog'
import { Skeleton } from '../components/ui/skeleton'

const schema = z.object({ block_name: z.string().trim().min(1, 'Required'), school_year: z.string().trim().min(4, 'Required') })
type FormValues = z.infer<typeof schema>

export default function ClassesPage() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [archived, setArchived] = useState(false)
  const [archiveTarget, setArchiveTarget] = useState<ClassRow | null>(null)
  const [notice, setNotice] = useState('')
  const { data: classes, isLoading, error } = useQuery({ queryKey: ['classes', archived ? 'archived' : 'active'], queryFn: () => listClasses(archived) })
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) })
  const mutation = useMutation({
    mutationFn: createClass,
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['classes'] }); reset(); setOpen(false); setArchived(false); setNotice('Class created.') },
  })
  const archiveMutation = useMutation({
    mutationFn: ({ id, archive }: { id: string; archive: boolean }) => setClassArchived(id, archive),
    onSuccess: (row, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['classes'] })
      void queryClient.invalidateQueries({ queryKey: ['class', row.id] })
      void queryClient.invalidateQueries({ queryKey: ['allSessions'] })
      setArchiveTarget(null)
      setNotice(variables.archive ? row.block_name + ' archived. You can restore it from Archived.' : row.block_name + ' restored to Active classes.')
    },
  })

  return (
    <section className="space-y-6">
      <div className="page-heading">
        <div><h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Classes</h2><p className="mt-2 text-sm text-muted-foreground">Your class rosters and checking sessions.</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className="inline-flex min-h-11 w-fit items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"><Plus className="size-4" /> New class</DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New class</DialogTitle><DialogDescription>Create a class to organize students and exam sessions.</DialogDescription></DialogHeader>
            <form onSubmit={handleSubmit(values => mutation.mutate(values))} className="space-y-4">
              <div className="space-y-2"><Label htmlFor="block_name">Block name</Label><Input id="block_name" placeholder="21-ITEW-01" {...register('block_name')} />{errors.block_name && <p className="text-xs text-destructive">{errors.block_name.message}</p>}</div>
              <div className="space-y-2"><Label htmlFor="school_year">School year</Label><Input id="school_year" placeholder="2026–2027" {...register('school_year')} />{errors.school_year && <p className="text-xs text-destructive">{errors.school_year.message}</p>}</div>
              <Button type="submit" disabled={mutation.isPending} className="w-full">{mutation.isPending ? 'Creating…' : 'Create class'}</Button>
              {mutation.error && <p role="alert" className="text-sm text-destructive">{mutation.error.message}</p>}
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-6 border-b" role="group" aria-label="Class view">
        {[false, true].map(value => <button key={String(value)} type="button" aria-pressed={archived === value} onClick={() => { setArchived(value); archiveMutation.reset(); setNotice('') }} className={'inline-flex min-h-11 items-center gap-2 border-b-2 px-0.5 text-sm ' + (archived === value ? 'border-primary font-medium text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>{value && <Archive className="size-4" />}{value ? 'Archived' : 'Active classes'}</button>)}
      </div>
      {notice && <p role="status" className="text-sm text-foreground">{notice}</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error.message}</p>}
      {archiveMutation.error && !archiveTarget && <p role="alert" className="text-sm text-destructive">Could not restore the class. {archiveMutation.error.message}</p>}
      {archived && <p className="text-sm leading-relaxed text-muted-foreground">Archived classes keep their students, sessions, and grades. Restore a class whenever you need it again.</p>}

      {isLoading ? <div className="session-list" aria-busy="true" aria-label="Loading classes">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="space-y-3 border-b p-5 last:border-0"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-24" /></div>)}</div> : !error && classes?.length === 0 ? <div className="rounded-lg border border-dashed px-5 py-10"><h3 className="text-sm font-semibold">{archived ? 'No archived classes' : 'No classes yet'}</h3><p className="mt-2 text-sm text-muted-foreground">{archived ? 'Classes you archive will be kept here.' : 'Create your first class, then add your student roster.'}</p></div> : !error && (
        <div className="session-list">
          {classes?.map(row => <div key={row.id} className="flex flex-wrap items-center gap-x-4 border-b px-4 py-3 last:border-0 md:px-6">
            <Link to={'/classes/' + row.id} className="group flex min-w-0 flex-1 items-center gap-3 rounded-md py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"><div className="min-w-0 flex-1"><h3 className="break-words text-[15px] font-semibold group-hover:text-primary">{row.block_name}</h3><p className="mt-1 text-sm text-muted-foreground">{row.school_year}</p>{row.archived_at && <p className="mt-1 text-xs text-muted-foreground">Archived {new Date(row.archived_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</p>}</div><ChevronRight className="size-4 shrink-0 text-muted-foreground" /></Link>
            <button type="button" disabled={archiveMutation.isPending} aria-label={(archived ? 'Restore ' : 'Archive ') + row.block_name} onClick={() => { archiveMutation.reset(); setNotice(''); if (archived) archiveMutation.mutate({ id: row.id, archive: false }); else setArchiveTarget(row) }} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50">{archived ? <RotateCcw className="size-3.5" /> : <Archive className="size-3.5" />}{archiveMutation.isPending && archiveMutation.variables?.id === row.id ? 'Saving…' : archived ? 'Restore' : 'Archive'}</button>
          </div>)}
        </div>
      )}

      <Dialog open={!!archiveTarget} onOpenChange={value => { if (!value && !archiveMutation.isPending) { setArchiveTarget(null); archiveMutation.reset() } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Archive {archiveTarget?.block_name}?</DialogTitle><DialogDescription>This moves the class out of your active lists. Students, checking sessions, and grades are kept. You can restore it from the Archived tab.</DialogDescription></DialogHeader>
          {archiveMutation.error && <p role="alert" className="text-sm text-destructive">Could not archive the class. {archiveMutation.error.message}</p>}
          <div className="flex justify-end gap-2"><Button variant="outline" disabled={archiveMutation.isPending} onClick={() => setArchiveTarget(null)}>Cancel</Button><Button disabled={archiveMutation.isPending} onClick={() => archiveTarget && archiveMutation.mutate({ id: archiveTarget.id, archive: true })}>{archiveMutation.isPending ? 'Archiving…' : 'Archive class'}</Button></div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
