import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? ''
const GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.8-flash']

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type AnswerKind = 'multiple_choice' | 'true_false' | 'identification' | 'coding' | 'essay'

interface KeyItem {
  question_number: number
  question_type?: string | null
  max_points?: number | null
  rubric?: string | null
}

interface DetectedAnswer {
  question_number?: number
  student_answer?: string
  confidence?: number | string
  points?: number | string
  feedback?: string
}

// Fallback confidence when the model does not provide one.
// Clear multiple-choice / true-false readings are reliable; free text is not.
function defaultConfidence(answerText: string): number {
  const trimmed = answerText.trim()
  if (!trimmed) return 0.1
  if (/^[a-e]$/i.test(trimmed)) return 0.85
  if (/^(true|false|t|f)$/i.test(trimmed)) return 0.85
  return 0.6
}

/** How each answer kind should be read. */
const KIND_RULES: Record<AnswerKind, string> = {
  multiple_choice: 'read a single letter (A, B, C, D or E) only — never a word or code',
  true_false: 'read exactly "True" or "False"',
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
    ? ' Also check the paper against these rules and list any violations you are CONFIDENT about: "' +
      rules +
      '". Put them in a separate array "rule_violations". Only report a violation when you can clearly see it AND you can confidently identify its question_number; otherwise set question_number to null. Include a "confidence" from 0 to 1 for each violation.'
    : ''

  return (
    `This is a handwritten exam answer sheet with ${totalItems} questions. ` +
    typeInstruction +
    ' ' +
    'For each question, estimate a "confidence" number from 0 to 1 for how sure you are the reading is correct — you MUST include one for EVERY answer. ' +
    'Respond ONLY with a JSON object in this exact format, no extra text: ' +
    '{"answers":[{"question_number":1,"student_answer":"B","confidence":0.95}], "rule_violations":[{"question_number":1,"violation":"erasure detected","confidence":0.8}]}. ' +
    'If an answer is unreadable, use an empty string and confidence 0.0.' +
    essayInstruction +
    rubricBlock +
    rulesPrompt
  )
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (!GEMINI_API_KEY) {
      return Response.json({ error: 'GEMINI_API_KEY secret is not set.' }, { status: 500, headers: corsHeaders })
    }

    const { imageBase64, mimeType, totalItems, rules, answerKey } = await req.json()
    if (!imageBase64 || !totalItems) {
      return Response.json({ error: 'imageBase64 and totalItems are required' }, { status: 400, headers: corsHeaders })
    }
    const keys: KeyItem[] = Array.isArray(answerKey) ? answerKey : []

    // One model call per section so each part is read with its own expected type
    // (multiple choice, true/false, identification or coding). This keeps the AI
    // focused and stops a text/coding part from being read as multiple choice.
    const prompt = buildPrompt(totalItems, keys, rules ?? '')

    let response: Response | null = null
    let lastStatus = 0
    for (const model of GEMINI_MODELS) {
      for (let attempt = 0; attempt < 2; attempt++) {
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
          {
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
              generationConfig: { maxOutputTokens: 4096, temperature: 0, responseMimeType: 'application/json' },
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
      console.error('Gemini error:', lastStatus, await response?.text())
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
      const toAnswer = (a: DetectedAnswer) => {
        const answerText = a.student_answer ?? ''
        let confidence: number
        if (typeof a.confidence === 'number' && !Number.isNaN(a.confidence)) {
          confidence = a.confidence
        } else if (typeof a.confidence === 'string') {
          const parsedConfidence = parseFloat(a.confidence)
          confidence = Number.isNaN(parsedConfidence) ? defaultConfidence(answerText) : parsedConfidence
        } else {
          confidence = defaultConfidence(answerText)
        }
        confidence = Math.max(0, Math.min(1, confidence))

        let points: number | undefined
        if (typeof a.points === 'number' && !Number.isNaN(a.points)) points = a.points
        else if (typeof a.points === 'string' && a.points.trim() !== '' && !Number.isNaN(parseFloat(a.points))) {
          points = parseFloat(a.points)
        }

        return {
          question_number: a.question_number,
          student_answer: answerText,
          confidence,
          ...(points !== undefined ? { points } : {}),
          ...(a.feedback ? { feedback: String(a.feedback) } : {}),
        }
      }
      const answers = (Array.isArray(parsed) ? parsed : (parsed.answers ?? [])).map(toAnswer)

      // If the model read nothing usable, fail loudly instead of returning a
      // misleading 0-score result. The teacher should retake the photo.
      const readable = answers.filter((a: DetectedAnswer) => (a.student_answer ?? '').trim() !== '')
      if (answers.length === 0 || readable.length === 0) {
        return Response.json(
          {
            error:
              'No answers could be read from the photo. Make sure the whole answer sheet is in frame, well-lit and in focus, then try again.',
          },
          { status: 422, headers: corsHeaders },
        )
      }

      const ruleViolations = (Array.isArray(parsed) ? [] : (parsed.rule_violations ?? []))
        .map((v: { question_number?: number | null; violation?: string; confidence?: number | string } | string) => {
          if (typeof v === 'string') return { question_number: null, violation: v, confidence: null as number | null }
          let confidence: number | null = null
          if (typeof v.confidence === 'number') confidence = Math.max(0, Math.min(1, v.confidence))
          else if (typeof v.confidence === 'string' && v.confidence.trim() !== '') {
            const p = parseFloat(v.confidence)
            confidence = Number.isNaN(p) ? null : Math.max(0, Math.min(1, p))
          }
          return {
            question_number: v.question_number ?? null,
            violation: v.violation ?? '',
            confidence,
          }
        })
      return Response.json({ answers, rule_violations: ruleViolations }, { headers: corsHeaders })
    } catch {
      console.error('Gemini returned non-JSON:', text)
      return Response.json({ error: 'Could not understand the answer sheet. Please retake the photo.' }, { status: 422, headers: corsHeaders })
    }
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500, headers: corsHeaders })
  }
})
