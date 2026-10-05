import { Input } from '../ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import type { StudentRow } from '../../types'

interface StudentPickerProps {
  students: StudentRow[] | undefined
  search: string
  onSearchChange: (value: string) => void
  selectedId: string | null
  doneIds: Set<string>
  onSelect: (student: StudentRow) => void
}

export default function StudentPicker({
  students,
  search,
  onSearchChange,
  selectedId,
  doneIds,
  onSelect,
}: StudentPickerProps) {
  const filtered = (students ?? []).filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Who are you checking?</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input placeholder="Search student name..." value={search} onChange={(e) => onSearchChange(e.target.value)} />
        <div className="max-h-64 divide-y overflow-y-auto rounded-md border">
          {filtered.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-muted/50 ${
                selectedId === s.id
                  ? 'bg-primary/10 font-medium text-primary'
                  : doneIds.has(s.id)
                    ? 'bg-green-50 text-green-800'
                    : ''
              }`}
              onClick={() => onSelect(s)}
            >
              {s.name}
              {doneIds.has(s.id) && <span className="float-right text-green-600">✓ Checked</span>}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">No students found.</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
