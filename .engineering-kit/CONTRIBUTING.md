# Contributing

Open a focused issue or change explaining the engineering problem and intended behavior. Preserve proportional workflows and existing user authorization. Keep skill descriptions discriminating, use lowercase hyphenated names, and put substantial conditional guidance in local references.

Run:

```sh
node scripts/validate.mjs
npm test
npm run test:package
```

For integration changes, review official documentation, update [sources](references/sources.md) and [compatibility](docs/agent-compatibility.md), and distinguish documentation verification from runtime testing. Add a regression fixture for validator or installer behavior changes. Never commit credentials or copied proprietary content. Do not submit fabricated agent evaluations or product security claims.

Use [manual scenarios](examples/agent-evaluation.md) for behavioral changes. In a PR state what changed, why, actual validation and remaining gaps. Maintainers choose versioning and release publication; no live publishing occurs automatically.
