# Checking review contract

## Reader API

- Method/path: `POST /functions/v1/read-answers`
- Authentication: required bearer session. The Edge Function resolves the signed-in user and loads the checking session and confirmed answer key through owner-scoped RLS.
- Request: `{ sessionId: UUID, imageBase64: string, mimeType: "image/jpeg" | "image/png" | "image/webp" }`.
- Limits: decoded image at most 5 MB, 1–300 answer-key questions, authenticated hourly/daily reader quotas, and a 90-second request deadline.
- Success response: `{ answers: ValidatedAnswer[], rule_violations: { violation: string, confidence: number | null }[] }`.
- Compatibility: legacy provider rule objects may include `question_number`; it is validated when present and discarded because rules apply to the whole paper.
- Errors: existing safe 400, 401, 403, 405, 413, 422, 429, 500, and 503 responses remain unchanged. Responses do not expose provider keys, tokens, SQL, or stack traces.
- Retry/idempotency: reading is non-persistent, but every admitted request consumes quota, including failed provider attempts. Final result saves continue through the existing idempotent atomic submission RPC.

## Review behavior

- Exact answers receive deterministic credit as before.
- Conservative identification variants create an advisory possible-match hint with zero points. Only low reading confidence requires teacher review.
- Supported considerations are separator/punctuation variants, acronym or parenthetical forms, and a two-or-more-word phrase with one additional qualifier.
- Every configured rule is checked against the whole paper across every question and answer type. Uppercase is not a special scoring rule: like erasures, tampering, and other instructions, a detected violation requires teacher confirmation or dismissal. Rules never silently change an individual answer score; the teacher uses the explicit final-score adjustment for any penalty.
- No database migration or additional AI request is introduced.

### Screenshot regression fixes (2026-10-21)

- Reordered complete parenthetical forms, such as `IaaS (Infrastructure as a Service)` versus `Infrastructure as a Service (IaaS)`, retain an advisory possible-match hint.
- A deployment strategy with the trailing word `Deployment` omitted, such as `Recreate`, is an advisory possible match to verify against the question.
- Possible `I / l / 1` and `O / 0` reading confusions retain advisory hints; only low reader confidence requires review. Readings are preserved and no credit is awarded automatically. Coding comparisons retain their existing semantics.
- Identification hints remain independent of paper-wide rules. Uppercase-only violations use the same paper-wide confirmation and final-score adjustment as other rules.
- Different concepts such as `Continuous Monitoring` and `Performance Monitoring` are not treated as formatting variants.

## Verification evidence

- `npm run verify`: passed on 2026-10-20.
- The current verification result is recorded in the implementation handoff; live provider behavior still requires acceptance testing with representative papers.
- Lint, source and bundled Edge Function checks, TypeScript compilation, production build, and PWA generation passed.
- Live authenticated mobile camera and Gemini acceptance remain unverified locally.
