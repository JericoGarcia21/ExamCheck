import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateScore, considerationReason, normalizeCode } from '../src/lib/scoring.ts'
import { parseAnswerKeyText } from '../src/lib/answerKey.ts'
import { needsTeacherReview } from '../src/lib/confidence.ts'
import { detectNameColumn, previewRoster, validateRosterFile } from '../src/lib/rosterImport.ts'
import { escapeCsvCell } from '../src/lib/csv.ts'
import { validateRecognition, validateReadRequest } from '../supabase/functions/_shared/validation.ts'

const key = [{ question_number: 1, correct_answer: 'B', question_type: 'multiple_choice', max_points: 1 }, { question_number: 2, correct_answer: 'True', question_type: 'true_false', max_points: 1 }]
test('all correct, all wrong, partial, and missing answers retain correct totals', () => {
  for (const [answers, expected] of [[[ 'b', 't' ], 2], [['A','False'],0], [['B','False'],1], [[],0]]) {
    const result = calculateScore(answers.map((student_answer,i) => ({ question_number:i+1,student_answer,confidence:0.9 })), key)
    assert.equal(result.score,expected); assert.equal(result.total,2); assert.equal(result.details.length,2)
  }
  assert.equal(calculateScore([],key).details.every(needsTeacherReview),true)
})
test('code grouping and case remain significant', () => {
  const result = calculateScore([{ question_number:1,student_answer:'return (a + b) * c;',confidence:0.99 }], [{question_number:1,correct_answer:'return a + b * c;',question_type:'coding'}])
  assert.equal(result.score,0); assert.equal(result.details[0].needs_review,true)
  assert.notEqual(normalizeCode('Value'),normalizeCode('value'))
  assert.equal(normalizeCode(' x\r\ny '),'x\ny')
})
test('identification variants become teacher considerations without automatic credit', () => {
  const variants = [
    ['workflow dispatch', 'workflow_dispatch'],
    ['IaaS', 'Infrastructure as a Service (IaaS)'],
    ['Hosted Runner', 'GitHub-Hosted Runner'],
  ]
  for (const [student_answer, correct_answer] of variants) {
    const detail = calculateScore(
      [{ question_number: 1, student_answer, confidence: 0.95 }],
      [{ question_number: 1, correct_answer, question_type: 'identification' }],
    ).details[0]
    assert.equal(detail.is_correct, false)
    assert.equal(detail.points_awarded, 0)
    assert.equal(detail.needs_review, true)
    assert.ok(detail.consideration_reason)
  }
  assert.equal(considerationReason('Runner', 'GitHub-Hosted Runner'), undefined)
  assert.equal(considerationReason('cat', 'concatenate'), undefined)
})
test('numeric answers and restarted sections are preserved in reading order', () => {
  assert.deepEqual(parseAnswerKeyText('42\n3.14\n2026').map(r=>r.correct_answer),['42','3.14','2026'])
  assert.deepEqual(parseAnswerKeyText('1. A\n2. B\n1. True\n2. False').map(r=>r.question_number),[1,2,3,4])
  assert.equal(parseAnswerKeyText('# Essay\n1. Explain inheritance')[0].question_type,'essay')
})

test('selected answer types apply to plain lists and tables rather than guessing identification', () => {
  for (const kind of ['multiple_choice', 'true_false', 'identification', 'coding', 'essay']) {
    for (const text of ['1. Custom answer\n2. Another answer', 'No. | Ans.\n1 | Custom answer\n2 | Another answer']) {
      const rows = parseAnswerKeyText(text, kind)
      assert.equal(rows.length, 2)
      assert.equal(rows.every(row => row.question_type === kind), true)
      assert.equal(rows.every(row => row.max_points === (kind === 'essay' ? 10 : 1)), true)
    }
  }
})

test('automatic detection and explicit section headings retain their answer types', () => {
  assert.deepEqual(parseAnswerKeyText('A\nFalse\nEncapsulation', 'any').map(row => row.question_type), ['multiple_choice', 'true_false', 'identification'])
  const mixed = parseAnswerKeyText('return value;\n# Essay\nExplain inheritance\n# True / False\nTrue', 'coding')
  assert.deepEqual(mixed.map(row => row.question_type), ['coding', 'essay', 'true_false'])
  assert.deepEqual(mixed.map(row => row.max_points), [1, 10, 1])
})
test('teacher decisions resolve review without rewriting AI confidence', () => {
  for (const review_status of ['accepted','edited']) assert.equal(needsTeacherReview({student_answer:'B',confidence:0.1,needs_review:true,review_status}),false)
  assert.equal(needsTeacherReview({student_answer:'B',confidence:0.1}),true)
  assert.equal(needsTeacherReview({student_answer:'B'}),true)
  assert.equal(needsTeacherReview({student_answer:'B',confidence:0.9}),false)
})
test('fractional essay scores are retained and always require teacher review', () => {
  const result=calculateScore([{question_number:1,student_answer:'Text',points:2.5,confidence:0.99}],[{question_number:1,correct_answer:'Rubric',question_type:'essay',max_points:10}])
  assert.equal(result.score,2.5);assert.equal(needsTeacherReview(result.details[0]),true)
})
test('roster maps name column, skips headers/duplicates/invalid rows, supports Unicode', () => {
  const rows=[['Student ID','Name'],['ID1','José Cruz'],['ID2','Existing Student'],['ID3','José Cruz'],['ID4',123],['ID5','']]
  assert.deepEqual(detectNameColumn(rows),{column:1,hasHeader:true})
  assert.deepEqual(previewRoster(rows,1,true,['Existing Student']),{names:['José Cruz'],duplicates:2,rejected:2})
  assert.throws(()=>validateRosterFile({name:'names.exe',size:10}))
  assert.throws(()=>validateRosterFile({name:'names.xlsx',size:6*1024*1024}))
})
test('CSV preserves numbers, escapes quotes/CR, and neutralizes formula text', () => {
  assert.equal(escapeCsvCell(2.5),'2.5');assert.equal(escapeCsvCell('=1+1'),"'=1+1")
  assert.equal(escapeCsvCell('  @SUM(A1)'),"'  @SUM(A1)")
  assert.equal(escapeCsvCell('CRUZ, "JUAN"'),'"CRUZ, ""JUAN"""')
  assert.equal(escapeCsvCell('A\rB'),'"A\rB"')
})
test('AI response rejects malformed question IDs, answers, confidence, and points', () => {
  const valid={answers:[{question_number:1,student_answer:'B',confidence:0.9}],rule_violations:[]}
  const result=validateRecognition(valid,[1,2]);assert.equal(result.answers[1].confidence,0)
  assert.equal(validateRecognition({answers:[{question_number:1,student_answer:'B'}]},[1]).answers[0].confidence,0)
  for(const patch of [{question_number:3},{question_number:'1'},{student_answer:42},{confidence:1.2},{points:Infinity}]) assert.throws(()=>validateRecognition({answers:[{...valid.answers[0],...patch}]},[1]))
  assert.throws(()=>validateRecognition({answers:[valid.answers[0],valid.answers[0]]},[1,2]))
  assert.throws(()=>validateRecognition({answers:[{question_number:1,student_answer:''}]},[1]))
  assert.deepEqual(
    validateRecognition({ ...valid, rule_violations:[{violation:'Erasure',confidence:0.8}] },[1]).rule_violations,
    [{violation:'Erasure',confidence:0.8}],
  )
  assert.deepEqual(
    validateRecognition({ ...valid, rule_violations:[{question_number:1,violation:'Legacy erasure',confidence:0.8}] },[1]).rule_violations,
    [{violation:'Legacy erasure',confidence:0.8}],
  )
})
test('reader request validates session, bounded bytes and matching image signature', () => {
  const good={sessionId:'00000000-0000-0000-0000-000000000001',mimeType:'image/jpeg',imageBase64:Buffer.from([255,216,255,0,0,0]).toString('base64')}
  assert.equal(validateReadRequest(good).sessionId,good.sessionId)
  assert.throws(()=>validateReadRequest({...good,mimeType:'image/png'}))
  assert.throws(()=>validateReadRequest({...good,sessionId:'invalid'}))
  assert.throws(()=>validateReadRequest({...good,imageBase64:'a'.repeat(7_000_004)}))
})

test('SheetJS workbook round-trip preserves the selected roster column', async () => {
  const XLSX = await import('xlsx')
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([['ID','Name'],['ABC1','José Cruz']]),'Roster')
  const reopened = XLSX.read(XLSX.write(book,{type:'buffer',bookType:'xlsx'}))
  const rows = XLSX.utils.sheet_to_json(reopened.Sheets[reopened.SheetNames[0]],{header:1})
  const {column,hasHeader} = detectNameColumn(rows)
  assert.deepEqual(previewRoster(rows,column,hasHeader,[]).names,['José Cruz'])
})

test('invalid multiple-choice and true/false readings cannot receive automatic credit',()=>{
  const result=calculateScore([{question_number:1,student_answer:'B1',confidence:0.99},{question_number:2,student_answer:'true?',confidence:0.99}],key)
  assert.equal(result.score,0)
  assert.equal(result.details.every(needsTeacherReview),true)
})

test('answer-key tables preserve answers and sequential numbering across restarted sections', () => {
  const rows = parseAnswerKeyText('No. | Ans. | No. | Ans.\n--- | --- | --- | ---\n1 | A | 2 | B\n# Identification\n1\t42\t2\t3.14\n1. 2026')
  assert.deepEqual(rows.map(row => row.question_number), [1, 2, 3, 4, 5])
  assert.deepEqual(rows.map(row => row.correct_answer), ['A', 'B', '42', '3.14', '2026'])
  assert.equal(rows[2].question_type, 'identification')
})
