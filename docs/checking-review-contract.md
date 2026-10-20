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
- Conservative identification variants create a possible-match consideration with zero points. The teacher must select **Accept as correct** or **Keep wrong** before saving.
- Supported considerations are separator/punctuation variants, acronym or parenthetical forms, and a two-or-more-word phrase with one additional qualifier.
- Overall-paper rules are returned in the existing reader response. They never change an individual answer or score automatically. Each must be confirmed or dismissed; any penalty uses the explicit teacher final-score adjustment.
- No database migration or additional AI request is introduced.

## Verification evidence

- `npm run verify`: passed on 2026-10-20.
- 54 tests passed, including consideration detection, false-positive boundaries, paper-wide rule rendering, authorization/RLS, quota, rollback, and atomic-save coverage.
- Lint, source and bundled Edge Function checks, TypeScript compilation, production build, and PWA generation passed.
- Live authenticated mobile camera and Gemini acceptance remain unverified locally.
