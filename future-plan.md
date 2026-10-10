# ExamCheck future plan

## Ollama AI support

Status: planned only; no provider changes implemented. Start with Ollama Cloud; local inference is a separate later milestone. Confirm the desired scope before implementation.

### Phase 1 — feasibility and model evaluation

- Verify a currently available cloud model supports image input; benchmark handwriting, multiple choice, code, essays, faint photos and unreadable answers against Gemini with synthetic or authorized sample papers.
- Measure accuracy, latency, usage limits and cost. Do not choose a model solely because it can return text.
- Ollama Cloud processes requests remotely and needs internet. Local Ollama runs on a computer; it does not make Supabase authentication or saving offline.

### Phase 2 — cloud provider integration

- Keep the existing frontend → authenticated Supabase read-answers → AI provider flow.
- Add server-only AI_PROVIDER, OLLAMA_API_KEY and OLLAMA_MODEL configuration. Keep Gemini available and provider selection explicit; do not silently send photos to another provider on failure.
- Use Ollama's native chat API with base64 images and non-streaming responses. Reuse the authorized stored key, prompt rules and recognition validator.
- As of the documentation review on 2026-10-10, Ollama Cloud does not support enforced structured outputs. Request JSON, validate every response and reject malformed data; do not depend on schema enforcement.
- Preserve RLS, quota checks, bounded images, timeouts, deterministic scoring, fractional essay points and teacher review. Do not persist exam photos or log answers/API keys.

### Phase 3 — verification and rollout

- Test image requests, successful recognition, malformed JSON, missing answers/confidence, invalid IDs, excessive points, authentication, timeouts and provider quota failures.
- Benchmark sample papers with teacher review before choosing the default provider.
- Regenerate the self-contained Supabase dashboard deployment file, run npm run verify and document secrets, model selection and rollback to Gemini.

### Phase 4 — optional local Ollama

- Design an authenticated gateway reachable from the hosted app. A Supabase cloud function's localhost is not the teacher's computer.
- Decide between a secured remote gateway and a desktop/local deployment; avoid exposing Ollama's unauthenticated port publicly.
- Validate hardware capacity, vision model compatibility, network reachability from phones and offline expectations before implementation.

### References

- [Ollama Cloud](https://docs.ollama.com/cloud)
- [Vision inputs](https://docs.ollama.com/capabilities/vision)
- [Structured outputs and current cloud limitation](https://docs.ollama.com/capabilities/structured-outputs)
