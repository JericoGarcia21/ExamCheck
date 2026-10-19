import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { percentageFor, remarkFor } from '../src/lib/grading.ts'
import { buildTableRows } from '../src/lib/export.ts'
import { restoreSavedResult } from '../src/lib/savedResult.ts'
import { needsTeacherReview } from '../src/lib/confidence.ts'
import PaperResultCard from '../src/components/session/PaperResultCard.tsx'
import AnswerKeyPreview from '../src/components/session/AnswerKeyPreview.tsx'
import StudentPicker from '../src/components/session/StudentPicker.tsx'

const rows = [{ question_number: 1, correct_answer: 'Explain', question_type: 'essay', max_points: 10 }]
const answers = [{ question_number: 1, student_answer: 'Response', correct_answer: 'Explain', points_awarded: 8,
  max_points: 10, is_correct: false, confidence: 0.5, review_status: 'accepted', needs_review: false, feedback: 'Teacher feedback' }]

test('pass threshold uses precise grades and exports agree at either side of 75%', () => {
  for (const [score, total, expected] of [[74.5,100,'Failed'],[74.999,100,'Failed'],[75,100,'Passed'],[75.001,100,'Passed'],[2,3,'Failed'],[3,4,'Passed']]) {
    const result = { checked: true, needsReview: false, percentage: percentageFor(score, total), score, studentName: 'Student' }
    assert.equal(remarkFor(result), expected)
    assert.equal(buildTableRows([result])[0].remarks, expected)
  }
  assert.equal(percentageFor(0, 0), 0)
  assert.equal(buildTableRows([{ checked: true, needsReview: false, percentage: percentageFor(74.5,100), score:74.5, studentName:'Student' }])[0].percentage, '74.5%')
})

test('reopening unchanged answers preserves teacher points, review, feedback and final override', () => {
  const restored = restoreSavedResult(rows, answers, {}, 9, 8)
  assert.equal(restored.scoreOverride, '9')
  assert.equal(restored.result.score, 8)
  assert.equal(restored.result.details[0].feedback, 'Teacher feedback')
  assert.equal(restored.result.details[0].confidence, 0.5)
  assert.equal(needsTeacherReview(restored.result.details[0]), false)
  assert.equal(restoreSavedResult(rows, answers, {}, 8, 8).scoreOverride, '')
})

test('editing saved answers retains the final override but requires a fresh review', () => {
  const restored = restoreSavedResult(rows, answers, { 1: 'Changed response' }, 9, 8)
  assert.equal(restored.scoreOverride, '9')
  assert.equal(restored.result.details[0].student_answer, 'Changed response')
  assert.equal(needsTeacherReview(restored.result.details[0]), true)
  assert.equal(restored.result.details[0].review_status, 'pending')
})

test('legacy calculated-score fallback preserves an override including a zero final score', () => {
  assert.equal(restoreSavedResult(rows, answers, {}, 9, null).scoreOverride, '9')
  assert.equal(restoreSavedResult(rows, answers, {}, 0, null).scoreOverride, '0')
  assert.equal(restoreSavedResult(rows, answers, {}, 8, null).scoreOverride, '')
  assert.equal(restoreSavedResult(rows, answers, {}, null, null).scoreOverride, '')
})

test('unassigned rule violations render as advisory while assigned rules retain a penalty action', () => {
  const noop = () => {}
  const props = { saving:false, studentName:'Student', result:{score:8,total:10,details:[]}, effectiveScore:8,
    effectiveDetails:[], appliedViolationNumbers:new Set(), onToggleViolation:noop, scoreOverride:'',
    onScoreOverrideChange:noop, reviewCount:0, onReview:noop, onSave:noop, onUpdateDetail:noop }
  const render = question_number => renderToStaticMarkup(createElement(PaperResultCard, {
    ...props, ruleViolations:[{question_number, violation:'Erasure', confidence:0.8, applied:false}],
  }))
  const advisory = render(null)
  assert.match(advisory, /Advisory — no question identified/)
  assert.doesNotMatch(advisory, /Mark wrong/)
  assert.match(render(1), /Mark wrong/)
})

test('paper review previews the teacher final score and marks out-of-range input invalid', () => {
  const noop = () => {}
  const props = { saving:false, studentName:'Student', result:{score:8,total:10,details:[]}, effectiveScore:8,
    effectiveDetails:[], ruleViolations:[], appliedViolationNumbers:new Set(), onToggleViolation:noop,
    onScoreOverrideChange:noop, reviewCount:0, onReview:noop, onSave:noop, onUpdateDetail:noop }
  const adjusted = renderToStaticMarkup(createElement(PaperResultCard, { ...props, scoreOverride:'9' }))
  assert.match(adjusted, /90%/)
  assert.match(adjusted, /Teacher adjusted/)
  const invalid = renderToStaticMarkup(createElement(PaperResultCard, { ...props, scoreOverride:'11' }))
  assert.match(invalid, /aria-invalid="true"/)
  assert.match(invalid, /Enter a number from 0 to 10/)
  assert.match(invalid, /<button[^>]*disabled=""[^>]*>Save final result<\/button>/)
})

test('student picker exposes search label, selection and roster progress', () => {
  const markup = renderToStaticMarkup(createElement(StudentPicker, {
    students:[{id:'one',name:'Student One'},{id:'two',name:'Student Two'}], search:'',
    onSearchChange:()=>{}, selectedId:'one', doneIds:new Set(['two']), onSelect:()=>{},
  }))
  assert.match(markup, /for="student-search"/)
  assert.match(markup, /aria-pressed="true"/)
  assert.match(markup, /Selected/)
  assert.match(markup, /1 \/ 2 checked/)
})


test('saved draft answer keys expose answer, type, points and rubric editing while confirmed keys are read-only', () => {
  const props = { rows, locked: false, editable: true, rules: null, onUpdate() {} }
  const editable = renderToStaticMarkup(createElement(AnswerKeyPreview, props))
  assert.match(editable, /Correct answer for question 1/)
  assert.match(editable, /Question 1 answer type/)
  assert.match(editable, /Maximum points for question 1/)
  assert.match(editable, /Grading rubric for question 1/)
  const confirmed = renderToStaticMarkup(createElement(AnswerKeyPreview, { ...props, locked: true }))
  assert.doesNotMatch(confirmed, /<textarea/)
  assert.doesNotMatch(confirmed, /<input/)
})
