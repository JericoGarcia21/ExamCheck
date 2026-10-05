import { useCallback, useEffect, useRef, useState } from 'react'
import { displayConfidence } from '../lib/confidence'
import { normalizeAnswer, type ScoredAnswer } from '../lib/scoring'
import type { KeyRow } from '../lib/answerKey'

export type ReviewMode = 'none' | 'view' | 'edit'

interface UseAnswerReviewParams {
  rows: KeyRow[]
  /** Current in-memory details, so edits always apply to fresh state. */
  details: ScoredAnswer[]
  updateDetail: (questionNumber: number, patch: Partial<ScoredAnswer>) => void
}

/**
 * Owns the uncertain/essay review flow: which questions are queued, the current
 * position, the editable fields, and applying the teacher's decision.
 */
export function useAnswerReview({ rows, details, updateDetail }: UseAnswerReviewParams) {
  const [mode, setMode] = useState<ReviewMode>('none')
  const [question, setQuestion] = useState<number | null>(null)
  const [studentAnswer, setStudentAnswer] = useState('')
  const [confidence, setConfidence] = useState<number | null>(null)
  const [points, setPoints] = useState('')
  const [feedback, setFeedback] = useState('')
  const [queue, setQueue] = useState<number[]>([])
  const [index, setIndex] = useState(0)

  // Keep the latest rows/details readable inside deferred callbacks without
  // reading refs during render (updated in an effect, not while rendering).
  const rowsRef = useRef(rows)
  const detailsRef = useRef(details)
  useEffect(() => {
    rowsRef.current = rows
    detailsRef.current = details
  }, [rows, details])

  const openAt = useCallback((list: number[], at: number) => {
    const detail = detailsRef.current.find((d) => d.question_number === list[at])
    setIndex(at)
    setQuestion(list[at])
    setStudentAnswer(detail?.student_answer ?? '')
    setConfidence(detail?.confidence ?? null)
    setPoints(String(detail?.points_awarded ?? 0))
    setFeedback(detail?.feedback ?? '')
    setMode('view')
  }, [])

  const open = useCallback(() => {
    const list = detailsRef.current
      .filter((d) => d.needs_review || displayConfidence(d) < 0.7)
      .map((d) => d.question_number)
    if (list.length === 0) return
    setQueue(list)
    openAt(list, 0)
  }, [openAt])

  const submit = useCallback(() => {
    if (question === null) return
    const current = detailsRef.current.find((d) => d.question_number === question)
    if (!current) return
    const keyItem = rowsRef.current.find((r) => r.question_number === question)
    const patch: Partial<ScoredAnswer> = {
      review_status: mode === 'view' ? 'accepted' : 'edited',
    }

    if (mode === 'edit') {
      const ans = studentAnswer.trim()
      patch.student_answer = ans
      const isEssay = current.max_points > 1 || keyItem?.question_type === 'essay'
      if (isEssay) {
        const pts = Math.max(0, Math.min(current.max_points, Number(points) || 0))
        patch.points_awarded = pts
        patch.is_correct = pts >= current.max_points
        patch.feedback = feedback.trim() || undefined
      } else if (keyItem) {
        const correct =
          normalizeAnswer(ans, keyItem.question_type) ===
          normalizeAnswer(keyItem.correct_answer, keyItem.question_type)
        patch.is_correct = correct
        patch.points_awarded = correct ? current.max_points : 0
      }
      patch.needs_review = false
    }
    updateDetail(question, patch)

    const next = index + 1
    if (next < queue.length) {
      // Defer so the edited detail is committed before the next card reads it.
      setTimeout(() => openAt(queue, next), 0)
      return
    }
    setMode('none')
    setQuestion(null)
    setQueue([])
  }, [question, mode, studentAnswer, points, feedback, updateDetail, index, queue, openAt])

  const close = useCallback(() => setMode('none'), [])

  return {
    mode,
    setMode,
    question,
    studentAnswer,
    setStudentAnswer,
    confidence,
    points,
    setPoints,
    feedback,
    setFeedback,
    queue,
    index,
    open,
    submit,
    close,
  }
}
