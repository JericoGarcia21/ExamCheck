import { validateRecognition } from '../../supabase/functions/_shared/validation'
import { supabase } from './supabase'
import { calculateScore, type ScoreResult } from './scoring'
import type { KeyRow } from './answerKey'

export interface RuleViolation {
  question_number: number | null
  violation: string
  confidence: number | null
  applied: boolean
}

export interface ReadPaperResult {
  result: ScoreResult
  violations: RuleViolation[]
}


/**
 * Sends a captured paper to the read-answers Edge Function and returns the
 * deterministically scored result plus the AI-detected rule violations.
 *
 * Violations start un-applied; the teacher opts in per violation before any
 * answer is marked wrong.
 */
export async function readPaperAnswers(params: {
  sessionId: string
  imageBase64: string
  mimeType: string
  rows: KeyRow[]
}): Promise<ReadPaperResult> {
  const { sessionId, imageBase64, mimeType, rows } = params
  if (rows.length === 0) {
    throw new Error('There is no answer key for this session yet. Confirm the answer key before checking papers.')
  }
  const { data, error } = await supabase.functions.invoke('read-answers', {
    body: {
      sessionId,
      imageBase64,
      mimeType,
    },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)

  const parsed = validateRecognition(data, rows.map((r) => r.question_number))
  const result = calculateScore(parsed.answers, rows)
  const violations: RuleViolation[] = parsed.rule_violations.map((v) => ({ ...v, applied: false }))
  return { result, violations }
}

/**
 * Extracts a readable message from a Supabase functions error, preferring the
 * JSON body the Edge Function returned over the generic transport message.
 * Falls back to friendly text for the common HTTP statuses.
 */
export async function extractFunctionError(e: unknown): Promise<string> {
  let status: number | undefined
  if (e && typeof e === 'object' && 'context' in e) {
    const ctx = (e as { context: Response }).context
    status = ctx?.status
    try {
      const body = await ctx.json()
      if (body?.error) return body.error
    } catch {
      /* no JSON body — fall through */
    }
  }
  if (status === 429) return 'Gemini AI quota reached. Wait for it to reset or check your Google AI plan/billing.'
  if (status === 503) return 'The paper reader is busy right now. Please try again in a moment.'
  if (status === 422) return 'The paper could not be read. Please retake the photo.'
  let message = e instanceof Error ? e.message : String(e)
  if (/failed to send|networkerror|failed to fetch/i.test(message)) {
    message = 'Could not reach the paper reader. Check your internet connection and try again.'
  }
  return message
}
