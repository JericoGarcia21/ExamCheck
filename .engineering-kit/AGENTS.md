# Engineering toolkit instructions

For a new product, read [the initialization prompt](templates/project-initialization.md) and [workflow](references/workflow.md) before product code. Inspect existing project instructions and preserve functioning behavior. Ask concise questions only when answers change functionality or architecture.

For significant implementation, present requirements, architecture, security/QA needs, and the feature plan first; stop until necessary decisions are approved, unless the user already delegated them. For small fixes, use a short proportional plan. Do not repeatedly seek an approval already granted.

Choose only the relevant skills from [the catalog](docs/skill-catalog.md). Read their SKILL.md and only needed supporting references. Build vertical features and keep UI, server authorization, data, tests, and documentation synchronized. Never hardcode secrets or fabricate evidence.

Run `node scripts/validate.mjs` and `npm test` after toolkit changes. For package or installer changes also run `npm run test:package`. These checks validate packaging, not product security or behavior. Before release, use [release gates](checklists/release-readiness.md). Do not deploy or change live infrastructure without user authorization.

When editing this toolkit, keep canonical skills in skills/. Do not commit installed duplicate copies. Verify integration claims against official documentation and update the source review date.
