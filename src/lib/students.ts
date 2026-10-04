export function parseStudentNames(input: string): string[] {
  const seen = new Set<string>()
  const lines = input.split(/\r?\n/)
  const merged: string[] = []

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim()
    if (!line) continue

    // join lines that were split right after a comma (e.g. "GARCIA,\nJERICO B.")
    while (line.endsWith(',') && i + 1 < lines.length && lines[i + 1].trim()) {
      i++
      line = `${line} ${lines[i].trim()}`
    }

    const cleaned = line.replace(/^\s*\d+[.)-]?\s*/, '').trim()
    if (!cleaned) continue

    const key = cleaned.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(cleaned)
  }

  return merged
}

export function sortStudentNames(names: string[]): string[] {
  return [...names].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }))
}

export function formatStudentNumber(index: number): string {
  return String(index + 1).padStart(2, '0')
}

export interface StudentSeed {
  name: string
  sort_name: string
  student_number: string
}

export function buildStudentSeeds(rawNames: string[], startingIndex = 0): StudentSeed[] {
  return sortStudentNames(rawNames).map((name, i) => ({
    name,
    sort_name: name,
    student_number: formatStudentNumber(startingIndex + i),
  }))
}
