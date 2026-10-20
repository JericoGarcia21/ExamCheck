import { validateReadRequest, validateRecognition } from '../_shared/validation.ts'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? ''
const GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.8-flash']

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type AnswerKind = 'multiple_choice' | 'true_false' | 'identification' | 'coding' | 'essay'

interface KeyItem {
  question_number: number
  question_type?: string | null
  max_points?: number | null
  rubric?: string | null
}

/** How each answer kind should be read. */
const KIND_RULES: Record<AnswerKind, string> = {
  multiple_choice: 'read a single letter (A, B, C, D or E) only — never a word or code',
  true_false: 'read the written True/False or T/F answer VERBATIM, preserving its exact letter case; never change "TRUE" to "True" or expand "T" to "True"',
  identification: 'read the written word or short phrase',
  coding: 'read the code VERBATIM, including punctuation and any error text; do not fix or simplify it',
  essay: 'read the full written response',
}

function kindOf(item: KeyItem): AnswerKind {
  const t = item.question_type
  if (t === 'multiple_choice' || t === 'true_false' || t === 'identification' || t === 'coding' || t === 'essay') {
    return t
  }
  return 'identification'
}

/**
 * Build a compact description of the expected answer type per question.
 * Consecutive questions of the same kind are grouped into a range so the model
 * gets a clear "Part" structure and never guesses the type.
 */
function describeKey(keys: KeyItem[]): string {
  if (keys.length === 0) return ''
  const sorted = [...keys].sort((a, b) => a.question_number - b.question_number)
  const ranges: { from: number; to: number; kind: AnswerKind }[] = []
  for (const k of sorted) {
    const kind = kindOf(k)
    const last = ranges[ranges.length - 1]
    if (last && last.kind === kind && k.question_number === last.to + 1) {
      last.to = k.question_number
    } else {
      ranges.push({ from: k.question_number, to: k.question_number, kind })
    }
  }
  return ranges
    .map((r) => {
      const label = r.from === r.to ? `Q${r.from}` : `Q${r.from}–${r.to}`
      return `- ${label}: ${KIND_RULES[r.kind]}`
    })
    .join('\n')
}

function buildPrompt(totalItems: number, keys: KeyItem[], rules: string): string {
  const keyDescription = describeKey(keys)
  const hasEssays = keys.some((k) => kindOf(k) === 'essay')

  const typeInstruction = keyDescription
    ? 'The expected answer type for each question is below. Follow it exactly and IGNORE the numbers printed on the paper — they may restart in each section. Assign the answers in reading order (top to bottom):\n' +
      keyDescription
    : `Read the student's answers for the ${totalItems} questions, in order from top to bottom.`

  const essayInstruction = hasEssays
    ? ' For essay questions, grade against the rubric provided below each question. Return "points" (a number) and a short "feedback" string for each essay answer.'
    : ''

  let rubricBlock = ''
  const essayKeys = keys.filter((k) => kindOf(k) === 'essay')
  if (essayKeys.length > 0) {
    rubricBlock =
      ' Essay rubrics:\n' +
      essayKeys
        .map(
          (k) =>
            `Q${k.question_number} (max ${k.max_points ?? 10} points): ${(k.rubric ?? '').trim() || 'No rubric provided — award points based on overall correctness.'}`,
        )
        .join('\n')
  }

  const rulesPrompt = rules
    ? ' Also check the WHOLE PAPER against these overall rules and list any violations you are CONFIDENT about: "' +
      rules +
      '". Check uppercase-only instructions strictly against the actual written letter case, including True/False answers. The application enforces uppercase-only answer scoring separately. Report overall paper violations in a separate array "rule_violations" and include a "confidence" from 0 to 1 for each violation. Do not include a question_number.'
    : ''

  return (
    `This is a handwritten exam answer sheet with ${totalItems} questions. ` +
    typeInstruction +
    ' ' +
    'Preserve the exact written letter case for EVERY answer. Never capitalize, lowercase, correct, or rewrite an answer to satisfy the rules. ' +
    'For each question, estimate a "confidence" number from 0 to 1 for how sure you are the reading is correct — you MUST include one for EVERY answer. ' +
    'Respond ONLY with a JSON object in this exact format, no extra text: ' +
    '{"answers":[{"question_number":1,"student_answer":"B","confidence":0.95}], "rule_violations":[{"violation":"erasure detected","confidence":0.8}]}. ' +
    'If an answer is unreadable, use an empty string and confidence 0.0.' +
    essayInstruction +
    rubricBlock +
    rulesPrompt
  )
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  if (req.method !== 'POST') return Response.json({ error: 'Use POST.' }, { status: 405, headers: corsHeaders })
  const fail = (error: string, status: number) => Response.json({ error }, { status, headers: corsHeaders })
  const authHeader = req.headers.get('authorization') ?? ''
  if (!/^Bearer \S+$/i.test(authHeader)) return fail('Please sign in to check papers.', 401)
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const headers = { Authorization: authHeader, apikey: anonKey, 'Content-Type': 'application/json' }
  const requestDeadline = AbortSignal.timeout(90_000)
  const api = (path: string, init?: RequestInit) => fetch(supabaseUrl + path, { ...init, headers, signal: requestDeadline })
  try {
    const userResponse = await api('/auth/v1/user')
    if (!userResponse.ok) return fail('Please sign in again to check papers.', 401)
    const user = await userResponse.json()
    if (!user.id) return fail('Please sign in again to check papers.', 401)
    if (!GEMINI_API_KEY) {
      return Response.json({ error: 'The paper reader is not configured. Contact your administrator.' }, { status: 500, headers: corsHeaders })
    }

    let input: ReturnType<typeof validateReadRequest>
    try {
      if (Number(req.headers.get('content-length') ?? 0) > 7_100_000) return fail('The image is too large.', 413)
      const reader = req.body?.getReader()
      if (!reader) return fail('An image is required.', 400)
      const chunks: Uint8Array[] = []
      let bytes = 0
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        bytes += value.byteLength
        if (bytes > 7_100_000) { await reader.cancel(); return fail('The image is too large.', 413) }
        chunks.push(value)
      }
      const body = new Uint8Array(bytes)
      let offset = 0
      for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.length }
      input = validateReadRequest(JSON.parse(new TextDecoder().decode(body)))
    } catch { return fail('Choose a valid JPEG, PNG, or WebP image smaller than 5 MB.', 400) }
    const { imageBase64, mimeType, sessionId } = input
    const sessionResponse = await api('/rest/v1/checking_sessions?id=eq.' + sessionId + '&select=answer_key_confirmed,rules')
    if (!sessionResponse.ok) return fail('Could not load the checking session.', 503)
    const sessions = await sessionResponse.json()
    if (!sessions[0]?.answer_key_confirmed) return fail('Confirm an authorized answer key before checking papers.', 403)
    const keyResponse = await api('/rest/v1/answer_keys?checking_session_id=eq.' + sessionId + '&select=question_number,question_type,max_points,rubric&order=question_number')
    if (!keyResponse.ok) return fail('Could not load the answer key.', 503)
    const keys: KeyItem[] = await keyResponse.json()
    const totalItems = keys.length
    const rules: string = sessions[0].rules ?? ''
    if (totalItems < 1 || totalItems > 300) return fail('The answer key must contain 1 to 300 questions.', 400)
    const quotaResponse = await api('/rest/v1/rpc/consume_reader_quota', { method: 'POST', body: '{}' })
    if (!quotaResponse.ok) return fail('Could not verify paper-reader usage. Please retry.', 503)
    if (await quotaResponse.json() !== true) return fail('Your paper-reader limit has been reached. Please try again later.', 429)

    // Use the stored, authorized key rather than caller-provided grading instructions.
    const prompt = buildPrompt(totalItems, keys, rules ?? '')

    let response: Response | null = null
    let lastStatus = 0
    for (const model of GEMINI_MODELS) {
      for (let attempt = 0; attempt < 2; attempt++) {
        // Recheck before every provider attempt, including retries/fallbacks.
        const accessResponse = await api('/rest/v1/rpc/teacher_enabled', { method: 'POST', body: '{}' })
        if (!accessResponse.ok) return fail('Could not verify app access. Please retry.', 503)
        if (await accessResponse.json() !== true) return fail('The app or your account is paused. Contact your administrator.', 403)
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
          {
            signal: requestDeadline,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: prompt },
                    { inline_data: { mime_type: mimeType ?? 'image/jpeg', data: imageBase64 } },
                  ],
                },
              ],
              generationConfig: { maxOutputTokens: 16384, temperature: 0, responseMimeType: 'application/json' },
            }),
          },
        )
        lastStatus = response.status
        if (response.ok) break
        if (response.status === 404) break
        if (response.status === 503) {
          await new Promise((r) => setTimeout(r, 1500))
          continue
        }
        break
      }
      if (response?.ok) break
    }

    if (!response || !response.ok) {
      console.error('Paper reader provider status:', lastStatus)
      return Response.json(
        {
          error: lastStatus === 429
            ? 'You have used up your Gemini API quota. Check your Google AI plan/billing, or try again later.'
            : lastStatus === 503
              ? 'The paper reader is busy. Please try again.'
              : 'The paper reader is unavailable right now.',
        },
        { status: lastStatus === 429 ? 429 : 503, headers: corsHeaders },
      )
    }

    const data = await response.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    try {
      const match = text.match(/\{[\s\S]*\}/)
      const parsed = JSON.parse(match ? match[0] : text)
      const validated = validateRecognition(parsed, keys.map((k) => k.question_number))
      for (const answer of validated.answers) {
        const key = keys.find((k) => k.question_number === answer.question_number)
        if (answer.points !== undefined && answer.points > (key?.max_points ?? 1)) throw new Error('Points exceed maximum.')
      }
      return Response.json(validated, { headers: corsHeaders })
    } catch {
      console.error('Paper reader returned an invalid response')
      return Response.json({ error: 'Could not understand the answer sheet. Please retake the photo.' }, { status: 422, headers: corsHeaders })
    }
  } catch (e) {
    console.error('Paper reader request failed:', e instanceof Error ? e.name : 'unknown')
    return fail('The paper reader could not complete this request. Check your connection and try again.', 503)
  }
})
