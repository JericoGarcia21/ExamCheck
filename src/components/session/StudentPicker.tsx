import { Input } from '../ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Label } from '../ui/label'
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Choose a student</CardTitle>
          <span className="text-sm text-muted-foreground">{(students ?? []).filter(s => doneIds.has(s.id)).length} / {students?.length ?? 0} checked</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Label htmlFor="student-search">Search the class roster</Label>
        <Input id="student-search" placeholder="Type a student’s name" value={search} onChange={(e) => onSearchChange(e.target.value)} />
        <div className="max-h-64 divide-y overflow-y-auto rounded-md border">
          {filtered.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={selectedId === s.id}
              className={`flex min-h-12 w-full items-center justify-between gap-3 px-3 py-3 text-left text-sm hover:bg-muted/50 ${
                selectedId === s.id
                  ? 'bg-primary/10 font-medium text-primary'
                  : doneIds.has(s.id)
                    ? 'bg-green-50 text-green-800'
                    : ''
              }`}
              onClick={(event) => {
                // A second click must not clear an already opened paper.
                // Keyboard activation has detail 0 and remains supported.
                if (selectedId !== s.id && event.detail < 2) onSelect(s)
              }}
            >
              <span className="min-w-0 break-words">{s.name}</span>
              <span className="shrink-0 text-xs font-medium">{selectedId === s.id ? 'Selected' : doneIds.has(s.id) ? 'Checked' : 'Not checked'}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p role="status" className="px-3 py-4 text-center text-sm text-muted-foreground">{search ? 'No matching students. Try another name.' : 'No students yet. Add a roster from your class page.'}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
