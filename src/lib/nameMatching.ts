export interface NameMatch {
  studentId: string
  name: string
  confidence: number
}

export function normalizeName(raw: string): string {
  return raw
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Z0-9\s,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0))
  for (let i = 0; i <= a.length; i++) dp[i][0] = i
  for (let j = 0; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[a.length][b.length]
}

function similarity(a: string, b: string): number {
  const max = Math.max(a.length, b.length)
  if (max === 0) return 1
  return 1 - levenshtein(a, b) / max
}

export function matchStudents(
  detectedName: string,
  students: { id: string; name: string }[],
  threshold = 0.6,
): NameMatch[] {
  const target = normalizeName(detectedName)
  if (!target) return []

  return students
    .map((s) => {
      const candidate = normalizeName(s.name)
      // Token-overlap boost: roster names are usually "LASTNAME, FIRSTNAME"
      const targetTokens = new Set(target.replace(/,/g, '').split(' '))
      const candidateTokens = candidate.replace(/,/g, '').split(' ')
      const overlap = candidateTokens.filter((t) => targetTokens.has(t)).length / candidateTokens.length
      return {
        studentId: s.id,
        name: s.name,
        confidence: Math.max(similarity(target, candidate), overlap),
      }
    })
    .filter((m) => m.confidence >= threshold)
    .sort((a, b) => b.confidence - a.confidence)
}
