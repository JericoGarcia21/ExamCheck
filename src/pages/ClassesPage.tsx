import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { createClass, listClasses } from '../services/classService'

const schema = z.object({
  block_name: z.string().min(1, 'Required'),
  school_year: z.string().min(4, 'Required'),
})

type FormValues = z.infer<typeof schema>

export default function ClassesPage() {
  const queryClient = useQueryClient()
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
    },
  })

  return (
    <section className="space-y-6">
      <h2 className="text-xl font-semibold">Classes</h2>

      <form
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4"
      >
        <div>
          <label className="mb-1 block text-sm font-medium">Block name</label>
          <input
            placeholder="21-ITEW-01"
            {...register('block_name')}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {errors.block_name && <p className="mt-1 text-xs text-red-600">{errors.block_name.message}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">School year</label>
          <input
            placeholder="2026–2027"
            {...register('school_year')}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {errors.school_year && <p className="mt-1 text-xs text-red-600">{errors.school_year.message}</p>}
        </div>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Create class
        </button>
        {mutation.error && <p className="text-sm text-red-600">{mutation.error.message}</p>}
      </form>

      {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error.message}</p>}

      <ul className="divide-y rounded-lg border bg-white">
        {classes?.map((c) => (
          <li key={c.id}>
            <Link to={`/classes/${c.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
              <span className="font-medium">{c.block_name}</span>
              <span className="text-sm text-gray-500">{c.school_year}</span>
            </Link>
          </li>
        ))}
        {classes?.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-gray-500">No classes yet.</li>
        )}
      </ul>
    </section>
  )
}
