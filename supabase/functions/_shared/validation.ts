export interface ValidatedAnswer {
  question_number: number
  student_answer: string
  confidence: number
  points?: number
  feedback?: string
}
export interface ValidatedViolation { question_number: number | null; violation: string; confidence: number | null }
const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected an object.')
  return value as Record<string, unknown>
}
export function validateReadRequest(value: unknown) {
  const input = record(value)
  if (typeof input.sessionId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.sessionId)) throw new Error('A valid session is required.')
  if (typeof input.imageBase64 !== 'string' || input.imageBase64.length < 8 || input.imageBase64.length > Math.ceil(5 * 1024 * 1024 / 3) * 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(input.imageBase64) || input.imageBase64.length % 4 !== 0) throw new Error('Choose an image smaller than 5 MB.')
  if (input.mimeType !== 'image/jpeg' && input.mimeType !== 'image/png' && input.mimeType !== 'image/webp') throw new Error('Choose a JPEG, PNG, or WebP image.')
  const prefix = atob(input.imageBase64.slice(0, 32))
  const valid = input.mimeType === 'image/jpeg' ? prefix.startsWith('\xff\xd8\xff') : input.mimeType === 'image/png' ? prefix.startsWith('\x89PNG\r\n\x1a\n') : prefix.startsWith('RIFF') && prefix.slice(8,12) === 'WEBP'
  if (!valid) throw new Error('The image format does not match its file type.')
  return { sessionId: input.sessionId, imageBase64: input.imageBase64, mimeType: input.mimeType }
}
export function validateRecognition(value: unknown, questionNumbers: number[]) {
  const input = record(value)
  if (!Array.isArray(input.answers) || input.answers.length > questionNumbers.length) throw new Error('Invalid answers.')
  const expected = new Set(questionNumbers)
  const seen = new Set<number>()
  const answers: ValidatedAnswer[] = input.answers.map((raw: unknown) => {
    const a = record(raw)
    if (typeof a.question_number !== 'number' || !Number.isInteger(a.question_number) || !expected.has(a.question_number) || seen.has(a.question_number)) throw new Error('Invalid or duplicate question number.')
    seen.add(a.question_number)
    if (typeof a.student_answer !== 'string' || a.student_answer.length > 20000) throw new Error('Invalid answer text.')
    const confidence = a.confidence === undefined || a.confidence === null ? 0 : a.confidence
    if (typeof confidence !== 'number' || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) throw new Error('Invalid confidence.')
    if (a.points !== undefined && (typeof a.points !== 'number' || !Number.isFinite(a.points) || a.points < 0)) throw new Error('Invalid points.')
    if (a.feedback !== undefined && (typeof a.feedback !== 'string' || a.feedback.length > 5000)) throw new Error('Invalid feedback.')
    return { question_number: a.question_number, student_answer: a.student_answer, confidence, ...(typeof a.points === 'number' ? { points: a.points } : {}), ...(typeof a.feedback === 'string' ? { feedback: a.feedback } : {}) }
  })
  if (!answers.some((a) => a.student_answer.trim())) throw new Error('No readable answers.')
  for (const n of expected) if (!seen.has(n)) answers.push({ question_number: n, student_answer: '', confidence: 0 })
  const violations = input.rule_violations ?? []
  if (!Array.isArray(violations) || violations.length > 300) throw new Error('Invalid rule checks.')
  const rule_violations: ValidatedViolation[] = violations.map((raw: unknown) => {
    const v = record(raw)
    if (v.question_number !== null && (typeof v.question_number !== 'number' || !expected.has(v.question_number))) throw new Error('Invalid rule question.')
    if (typeof v.violation !== 'string' || !v.violation.trim() || v.violation.length > 1000) throw new Error('Invalid violation.')
    const confidence = v.confidence ?? null
    if (confidence !== null && (typeof confidence !== 'number' || !Number.isFinite(confidence) || confidence<0 || confidence>1)) throw new Error('Invalid rule confidence.')
    return { question_number: v.question_number as number | null, violation: v.violation, confidence: confidence as number | null }
  })
  return { answers, rule_violations }
}
