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

test('saved answer edits use answer-key scoring without hidden paper-rule penalties', () => {
  const key = [{ question_number: 1, correct_answer: 'True', question_type: 'true_false', max_points: 1 }]
  const saved = [{ ...answers[0], student_answer: 'TRUE', points_awarded: 1, is_correct: true }]
  assert.equal(restoreSavedResult(key, saved, {1: 'True'}, 1, 1).result.score, 1)
  assert.equal(restoreSavedResult(key, saved, {1: 'true'}, 1, 1).result.details[0].needs_review, true)
  assert.equal(restoreSavedResult(key, saved, {}, 1, 1).result.score, 1)
})

test('paper rules render as overall decisions without question penalty actions', () => {
  const noop = () => {}
  const props = { saving:false, studentName:'Student', result:{score:8,total:10,details:[]}, effectiveScore:8,
    effectiveDetails:[], onSetViolationStatus:noop, scoreOverride:'',
    onScoreOverrideChange:noop, reviewCount:0, onReview:noop, onSave:noop, onUpdateDetail:noop }
  const markup = renderToStaticMarkup(createElement(PaperResultCard, {
    ...props, ruleViolations:[{violation:'Uppercase rule violated in an essay answer', confidence:0.8, status:'pending'}],
  }))
  assert.match(markup, /Overall paper rules/)
  assert.match(markup, /across all answer types/)
  assert.match(markup, /Uppercase rule violated in an essay answer/)
  assert.match(markup, /Confirm violation/)
  assert.match(markup, /Dismiss/)
  assert.doesNotMatch(markup, /Mark wrong/)
  assert.match(markup, /<button[^>]*disabled=""[^>]*>Save final result<\/button>/)
})

test('high-confidence possible matches remain wrong without requiring review', () => {
  const noop = () => {}
  const detail = { question_number:46, student_answer:'workflow dispatch', correct_answer:'workflow_dispatch',
    is_correct:false, confidence:0.95, needs_review:true, points_awarded:0, max_points:1,
    consideration_reason:'The answers differ only by separators.' }
  const markup = renderToStaticMarkup(createElement(PaperResultCard, {
    saving:false, studentName:'Student', result:{score:0,total:1,details:[detail]}, effectiveScore:0,
    effectiveDetails:[detail], ruleViolations:[], onSetViolationStatus:noop, scoreOverride:'',
    onScoreOverrideChange:noop, reviewCount:0, onReview:noop, onSave:noop, onUpdateDetail:noop,
  }))
  assert.doesNotMatch(markup, /Possible answer matches/)
  assert.doesNotMatch(markup, /Needs review<\/span>/)
  assert.match(markup, /workflow_dispatch/)
  assert.match(markup, /No credit/)
  assert.match(markup, />Save final result<\/button>/)
  assert.doesNotMatch(markup, /<button[^>]*disabled=""[^>]*>Save final result<\/button>/)
})

test('paper review previews the teacher final score and marks out-of-range input invalid', () => {
  const noop = () => {}
  const props = { saving:false, studentName:'Student', result:{score:8,total:10,details:[]}, effectiveScore:8,
    effectiveDetails:[], ruleViolations:[], onSetViolationStatus:noop,
    onScoreOverrideChange:noop, reviewCount:0, onReview:noop, onSave:noop, onUpdateDetail:noop }
  const adjusted = renderToStaticMarkup(createElement(PaperResultCard, { ...props, scoreOverride:'9' }))
  assert.match(adjusted, /90%/)
  assert.match(adjusted, /Teacher adjusted/)
  const invalid = renderToStaticMarkup(createElement(PaperResultCard, { ...props, scoreOverride:'11' }))
  assert.match(invalid, /aria-invalid="true"/)
  assert.match(invalid, /Enter a number from 0 to 10/)
  assert.match(invalid, /<button[^>]*disabled=""[^>]*>Save final result<\/button>/)
})

test('checking result exposes answer comparison and accessible filters', () => {
  const noop = () => {}
  const detail = { question_number:1, student_answer:'True', correct_answer:'TRUE',
    is_correct:true, confidence:0.99, points_awarded:1, max_points:1 }
  const markup = renderToStaticMarkup(createElement(PaperResultCard, {
    saving:false, studentName:'Student with a long display name', result:{score:1,total:1,details:[detail]},
    effectiveScore:1, effectiveDetails:[detail], ruleViolations:[], onSetViolationStatus:noop,
    scoreOverride:'', onScoreOverrideChange:noop, reviewCount:0, onReview:noop, onSave:noop, onUpdateDetail:noop,
  }))
  assert.match(markup, /aria-label="Filter answers"/)
  assert.match(markup, /aria-pressed="true"/)
  assert.match(markup, /Answer breakdown/)
  assert.match(markup, /Student answer/)
  assert.match(markup, /Answer key: TRUE/)
  assert.match(markup, /Full credit/)
  assert.match(markup, /not whether the answer is correct/)
  assert.match(markup, /Showing 1 of 1 answers/)
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

test('reselecting a student or the second click of a double-click never resets checking', () => {
  const selected=[]
  const props={students:[{id:'one',name:'Student One'},{id:'two',name:'Student Two'}],search:'',onSearchChange:()=>{},selectedId:'one',doneIds:new Set(),onSelect:student=>selected.push(student.id)}
  function buttons(element) {
    if (!element || typeof element!=='object') return []
    if (Array.isArray(element)) return element.flatMap(buttons)
    return [...(element.type==='button'?[element]:[]),...buttons(element.props?.children)]
  }
  const [same,other]=buttons(StudentPicker(props))
  same.props.onClick({detail:1})
  same.props.onClick({detail:2})
  assert.deepEqual(selected,[])
  other.props.onClick({detail:1})
  other.props.onClick({detail:2})
  assert.deepEqual(selected,['two'])
  other.props.onClick({detail:0})
  assert.deepEqual(selected,['two','two']) // Keyboard selection of a different student is supported.
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
