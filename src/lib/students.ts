export function parseStudentNames(input: string): string[] {
  const seen = new Set<string>()
  return input
    .split(/\r?\n|,/)
    .map((line) => line.replace(/^\s*\d+[.)-]?\s*/, '').trim())
    .filter((line) => line.length > 0)
    .filter((name) => {
      const key = name.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
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
