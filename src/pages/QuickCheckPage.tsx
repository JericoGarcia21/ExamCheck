import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import CameraCapture from '../components/CameraCapture'
import PaperResultCard from '../components/session/PaperResultCard'
import AnswerReviewDialog from '../components/session/AnswerReviewDialog'
import { getQuickCheckSettings } from '../services/quickCheckService'
import { Button } from '../components/ui/button'
import { Textarea } from '../components/ui/textarea'
import { parseAnswerKeyText, type KeyRow } from '../lib/answerKey'
import { ANSWER_KINDS, calculateScore, sumPoints, type AnswerKind, type ScoredAnswer, type ScoreResult } from '../lib/scoring'
import { validateQuickKey } from '../../supabase/functions/_shared/quickCheck'
import { needsTeacherReview } from '../lib/confidence'
import { imageFileToJpeg } from '../lib/image'
import { readQuickKey, readQuickSheet } from '../lib/quickCheck'
import { useAnswerReview } from '../hooks/useAnswerReview'
import type { RuleViolation } from '../lib/readPaper'
import { escapeCsvCell } from '../lib/csv'

export default function QuickCheckPage() {
  const [text,setText]=useState('')
  const [kind,setKind]=useState<AnswerKind|'any'>('any')
  const [rows,setRows]=useState<KeyRow[]>([])
  const [confirmed,setConfirmed]=useState(false)
  const [rules,setRules]=useState('')
  const [result,setResult]=useState<ScoreResult|null>(null)
  const [violations,setViolations]=useState<RuleViolation[]>([])
  const [override,setOverride]=useState('')
  const [busy,setBusy]=useState('')
  const [error,setError]=useState('')
  const [sheetPreview,setSheetPreview]=useState('')
  const operation=useRef(0)
  const active=useRef(false)
  const settings=useQuery({queryKey:['quickCheckSettings'],queryFn:getQuickCheckSettings,retry:false,refetchInterval:30_000})
  useEffect(()=>()=>{operation.current++;active.current=false},[])
  const details=result?.details ?? []
  function updateDetail(n: number,patch: Partial<ScoredAnswer>) { setResult(old=>old ? {...old,details:old.details.map(d=>d.question_number===n ? {...d,...patch}:d)} : old) }
  const review=useAnswerReview({rows,rules,details,updateDetail})
  const current=details.find(d=>d.question_number===review.question)
  const reviewCount=details.filter(d=>!d.consideration_reason && needsTeacherReview(d)).length
  const unavailable=settings.isPending || settings.isError || settings.data?.paused || settings.data?.daily_limit===0
  function clearResult() { setResult(null);setViolations([]);setOverride('');setSheetPreview('');review.close() }
  function editKey() { setConfirmed(false);clearResult() }
  async function run(mode:'key'|'sheet',load:()=>Promise<{base64:string;mimeType:string}>) {
    if (active.current || unavailable || (mode==='sheet' && !confirmed)) return
    active.current=true
    const id=++operation.current
    setBusy(mode==='key' ? 'Reading answer key…' : 'Reading answer sheet…');setError('')
    if (mode==='sheet') clearResult()
    try {
      const image=await load()
      if (id!==operation.current) return
      if (mode==='key') {
        const extracted=await readQuickKey(image.base64,image.mimeType)
        if (id!==operation.current) return
        setRows(extracted);setConfirmed(false);clearResult()
      } else {
        setSheetPreview(`data:${image.mimeType};base64,${image.base64}`)
        const parsed=await readQuickSheet(image.base64,image.mimeType,rows,rules)
        if (id!==operation.current) return
        setResult(calculateScore(parsed.answers,rows,rules))
        setViolations(parsed.rule_violations.map(v=>({...v,status:'pending'})))
      }
    } catch(e) { if(id===operation.current) setError(e instanceof Error ? e.message : 'Could not read the image.') }
    finally { if(id===operation.current) {setBusy('');active.current=false} }
  }
  function upload(file:File|undefined,mode:'key'|'sheet') {
    if(file) void run(mode,async()=>({base64:await imageFileToJpeg(file),mimeType:'image/jpeg'}))
  }
  function download() {
    if (!result || details.some(needsTeacherReview) || violations.some(v=>v.status==='pending')) return
    const final=override.trim()==='' ? sumPoints(details) : Number(override)
    if (!Number.isFinite(final) || final<0 || final>result.total) return
    const csv=[['Final score',final,'Total',result.total],['Question','Student answer','Answer key','Points','Max points','RF'],...details.map(d=>[d.question_number,d.student_answer,d.correct_answer,d.points_awarded,d.max_points,`${Math.round((d.confidence??0)*100)}%`])].map(r=>r.map(escapeCsvCell).join(',')).join('\r\n')
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}))
    const a=document.createElement('a');a.href=url;a.download='quick-check-result.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
  }
  return <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
    <nav className="flex items-center justify-between gap-3" aria-label="Quick Check navigation"><Link to="/login" className="font-semibold">ExamCheck.</Link><Link to="/login" className="text-sm underline">Sign in for saved results</Link></nav>
    <header><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">No login needed</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Quick Check</h1><p className="mt-2 text-muted-foreground">Add your key. Capture a paper. Review the result.</p></header>
    <aside className="rounded-lg border bg-secondary p-4 text-sm space-y-2">
      <p>Work stays in this page and is lost on refresh. Download your reviewed result before leaving. Images are sent to our AI provider for reading; this app does not save guest images or results.</p>
      {settings.isPending ? <p role="status">Loading guest allowance…</p> : settings.isError ? <p role="alert">Guest checking is not configured or could not load. <button className="underline" onClick={()=>void settings.refetch()}>Retry</button></p> : <p>{settings.data.daily_limit} scans per network per day, resetting at midnight UTC. Key photos and sheets each use one scan; failed admitted reads also count. Pasted keys are free.{(settings.data.paused || settings.data.daily_limit===0) && ' Guest scans are currently paused.'}</p>}
    </aside>
    <section className="rounded-xl border bg-card p-5 space-y-4" aria-labelledby="quick-key-title">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="quick-key-title" className="text-lg font-semibold">1. Answer key</h2>{confirmed && <span className="text-sm font-medium text-primary">Confirmed · {rows.length} questions</span>}</div>
      {confirmed ? <><p className="text-sm text-muted-foreground">Your key and rules will be reused for each sheet.</p><Button variant="outline" disabled={!!busy} onClick={editKey}>Edit key or rules</Button></> : <>
        <label className="block text-sm font-medium">Upload an answer-key photo<input className="mt-2 block w-full text-sm" type="file" accept="image/jpeg,image/png,image/webp" disabled={!!busy || !!unavailable} onChange={e=>{upload(e.target.files?.[0],'key');e.target.value=''}} /></label>
        <p className="text-xs text-muted-foreground">JPEG, PNG or WebP up to 5 MiB. Review every extracted answer before confirming.</p>
        <label className="block text-sm font-medium">Or paste a key<Textarea className="mt-2" rows={5} placeholder={'1. TRUE\n2. FALSE\n3. B'} value={text} disabled={!!busy} onChange={e=>setText(e.target.value)} /></label>
        <label className="block text-sm">Answer type <select value={kind} disabled={!!busy} onChange={e=>setKind(e.target.value as AnswerKind|'any')} className="ml-2 rounded-md border p-2"><option value="any">Detect from answers</option>{ANSWER_KINDS.map(k=><option key={k.value} value={k.value}>{k.label}</option>)}</select></label>
        <Button variant="outline" disabled={!!busy || !text.trim()} onClick={()=>{setError('');try{setRows(validateQuickKey(parseAnswerKeyText(text,kind)))}catch(e){setError(e instanceof Error?e.message:'Invalid key.')}}}>Preview pasted key</Button>
        {rows.length>0 && <ol className="max-h-96 space-y-3 overflow-y-auto rounded-lg border p-3" aria-label="Review answer key">{rows.map((row,i)=><li key={row.question_number} className="space-y-2 border-b pb-3 last:border-0"><label className="block text-sm">Question {row.question_number}<Textarea value={row.correct_answer} disabled={!!busy} rows={2} onChange={e=>setRows(old=>old.map((r,n)=>n===i?{...r,correct_answer:e.target.value}:r))} /></label><div className="flex flex-wrap gap-3"><label className="text-xs">Type<select className="ml-2 rounded border p-2" value={row.question_type} disabled={!!busy} onChange={e=>setRows(old=>old.map((r,n)=>n===i?{...r,question_type:e.target.value as AnswerKind}:r))}>{ANSWER_KINDS.map(k=><option key={k.value} value={k.value}>{k.label}</option>)}</select></label><label className="text-xs">Points<input className="ml-2 w-20 rounded border p-2" type="number" min={0.01} max={100} step="any" value={row.max_points} disabled={!!busy} onChange={e=>setRows(old=>old.map((r,n)=>n===i?{...r,max_points:Number(e.target.value)}:r))} /></label></div>{row.question_type==='essay' && <label className="block text-xs">Rubric<Textarea value={row.rubric??''} disabled={!!busy} onChange={e=>setRows(old=>old.map((r,n)=>n===i?{...r,rubric:e.target.value}:r))} /></label>}</li>)}</ol>}
        <label className="block text-sm font-medium">Rules (optional)<Textarea className="mt-2" value={rules} maxLength={3000} disabled={!!busy} onChange={e=>setRules(e.target.value)} placeholder="Uppercase letters only" /></label>
        <Button disabled={!!busy || !rows.length} onClick={()=>{try{setRows(validateQuickKey(rows));setConfirmed(true);clearResult();setError('')}catch(e){setError(e instanceof Error?e.message:'Invalid key.')}}}>Confirm answer key</Button>
      </>}
    </section>
    {confirmed && <section className="rounded-xl border bg-card p-5 space-y-4" aria-labelledby="quick-sheet-title"><h2 id="quick-sheet-title" className="text-lg font-semibold">2. Answer sheet</h2><p className="text-sm text-muted-foreground">Use one clear photo per paper. Keep all answers visible and in reading order.</p><CameraCapture disabled={!!busy || !!unavailable} onCapture={(base64,mimeType)=>void run('sheet',async()=>({base64,mimeType}))} /><label className="block text-sm font-medium">Or upload an answer-sheet photo<input className="mt-2 block w-full text-sm" type="file" accept="image/jpeg,image/png,image/webp" disabled={!!busy || !!unavailable} onChange={e=>{upload(e.target.files?.[0],'sheet');e.target.value=''}} /></label></section>}
    {busy && <p role="status" className="rounded-lg border bg-muted p-4">{busy} Keep this page open.</p>}
    {error && <p role="alert" className="rounded-lg border border-destructive p-4 text-sm text-destructive">{error}</p>}
    {sheetPreview && <details className="rounded-lg border bg-card p-4"><summary className="cursor-pointer text-sm font-medium">View answer-sheet photo</summary><img src={sheetPreview} alt="Uploaded answer sheet for comparing detected answers" className="mx-auto mt-4 max-h-[70vh] max-w-full object-contain" /></details>}
    {result && <PaperResultCard saving={false} studentName="Quick Check result" result={result} effectiveScore={sumPoints(details)} effectiveDetails={details} ruleViolations={violations} onSetViolationStatus={(i,status)=>setViolations(old=>old.map((v,n)=>n===i?{...v,status}:v))} scoreOverride={override} onScoreOverrideChange={setOverride} reviewCount={reviewCount} onReview={review.open} onSave={download} onUpdateDetail={updateDetail} onEditAnswer={review.openQuestion} saveLabel="Download reviewed result" />}
    <div className="flex flex-wrap gap-3">{result && <Button variant="outline" disabled={!!busy} onClick={clearResult}>Check another sheet</Button>}<Button variant="ghost" disabled={!!busy} onClick={()=>{operation.current++;setText('');setRows([]);setConfirmed(false);setRules('');setError('');clearResult()}}>Reset Quick Check</Button></div>
    <AnswerReviewDialog allowPoints={rows.find(r=>r.question_number===review.question)?.question_type==='essay'} mode={review.mode} question={review.question} index={review.index} queueLength={review.queue.length} studentAnswer={review.studentAnswer} onStudentAnswerChange={review.setStudentAnswer} confidence={review.confidence} points={review.points} onPointsChange={review.setPoints} feedback={review.feedback} onFeedbackChange={review.setFeedback} maxPoints={current?.max_points??null} suggestedFeedback={current?.feedback} onSetMode={review.setMode} onSubmit={review.submit} onClose={review.close} />
  </main>
}
