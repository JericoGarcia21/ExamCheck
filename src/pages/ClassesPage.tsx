import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { createClass, listClasses } from '../services/classService'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent } from '../components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { Skeleton } from '../components/ui/skeleton'

const schema = z.object({
  block_name: z.string().min(1, 'Required'),
  school_year: z.string().min(4, 'Required'),
})

type FormValues = z.infer<typeof schema>

export default function ClassesPage() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const { data: classes, isLoading, error } = useQuery({ queryKey: ['classes'], queryFn: listClasses })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const mutation = useMutation({
    mutationFn: createClass,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] })
      reset()
      setOpen(false)
    },
  })

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold tracking-tight">Classes</h2>

      {isLoading && (
        <div className="space-y-3 md:grid md:grid-cols-3 md:gap-3 md:space-y-0">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-center justify-between py-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error.message}</p>}

      <div className="space-y-3 md:grid md:grid-cols-3 md:gap-3 md:space-y-0">
        {classes?.length === 0 && (
          <p className="text-sm text-muted-foreground">No classes yet. Tap + to create your first one.</p>
        )}
        {classes?.map((c) => (
          <Link key={c.id} to={`/classes/${c.id}`}>
            <Card className="hover:bg-muted/50">
              <CardContent className="flex items-center justify-between py-4">
                <span className="font-medium">{c.block_name}</span>
                <span className="text-sm text-muted-foreground">{c.school_year}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          aria-label="New class"
          className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105"
        >
          <Plus className="h-6 w-6" />
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New class</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-3">
            <div>
              <Label htmlFor="block_name">Block name</Label>
              <Input id="block_name" placeholder="21-ITEW-01" {...register('block_name')} />
              {errors.block_name && <p className="mt-1 text-xs text-destructive">{errors.block_name.message}</p>}
            </div>
            <div>
              <Label htmlFor="school_year">School year</Label>
              <Input id="school_year" placeholder="2026–2027" {...register('school_year')} />
              {errors.school_year && <p className="mt-1 text-xs text-destructive">{errors.school_year.message}</p>}
            </div>
            <Button type="submit" disabled={mutation.isPending} className="w-full">
              Create class
            </Button>
            {mutation.error && <p className="text-sm text-destructive">{mutation.error.message}</p>}
          </form>
        </DialogContent>
      </Dialog>
    </section>
  )
}
