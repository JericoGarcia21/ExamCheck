# Sources and attribution

Reviewed official public pages on 2026-10-18. Pages were accessible in this session; this is a point-in-time documentation review, not runtime certification. Integration claims depend on host version, local policy and environment. No agent clients were launched for integration testing. Recheck official docs before publishing compatibility claims after updates. All toolkit instructions and examples are original; no proprietary book content or third-party code is bundled.

| Primary source | How it informs this toolkit / verification limit |
| --- | --- |
| [Agent Skills specification](https://agentskills.io/specification) | SKILL.md frontmatter, names and progressive disclosure; schema subset validated locally |
| [OpenAI Codex skills](https://developers.openai.com/codex/skills/) | Local skill paths, linked folders, explicit invocation and automatic discovery/restart fallback; reviewed 2026-10-18 at https://learn.chatgpt.com/docs/build-skills |
| [Codex AGENTS.md](https://developers.openai.com/codex/guides/agents-md/) | Repository instruction entry point |
| [Claude Code skills](https://code.claude.com/docs/en/skills) | Project/personal paths and skill commands |
| [Claude Code memory](https://code.claude.com/docs/en/memory) | CLAUDE.md project instructions |
| [Cursor skills](https://cursor.com/docs/skills) | Skill discovery paths and local/remote limitations |
| [Cursor rules](https://cursor.com/docs/rules) | .cursor/rules/*.mdc entry point |
| [OpenCode skills](https://opencode.ai/docs/skills/) | Native and compatible skill directories |
| [OpenCode rules](https://opencode.ai/docs/rules/) | AGENTS.md project instruction convention |
| [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/) | Risk-based verification requirements; choose and record a version per product, no compliance claim |
| [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) | Control guidance on validation, identity, sessions and data handling |
| [OWASP API Security](https://owasp.org/API-Security/) | Object authorization and API abuse threat categories |
| [NIST SSDF](https://csrc.nist.gov/Projects/ssdf) | Secure development lifecycle, evidence and remediation; no certification claim |
| [W3C WCAG overview](https://www.w3.org/WAI/standards-guidelines/wcag/) | Accessibility target selection and manual verification needs |
| [web.dev](https://web.dev/) | User-centered web quality and performance measurement |
| [Refactoring UI](https://www.refactoringui.com/) | Public product overview only; paid book not accessed or reproduced |
| [shadcn/ui](https://ui.shadcn.com/) | Component/design-system reference, not a mandated dependency |
| [Playwright](https://playwright.dev/) | Browser workflow testing reference; not installed or executed for this instruction-only repository |
| [GitHub Actions](https://docs.github.com/en/actions) | Repository validation workflow; remote CI not run in this session |
| [npm package.json](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/) | Package bin, file inclusion and metadata for the workspace CLI |
| [npm exec](https://docs.npmjs.com/cli/v11/commands/npm-exec/) | Explicit package execution and CLI argument handling |
| [npm package specifications](https://docs.npmjs.com/cli/v11/using-npm/package-spec/) | Direct GitHub installation without npm registry publication |
| [Twelve-Factor App](https://12factor.net/) | Configuration and operational separation as context-dependent design principles |

Buff and Free Buff: no authoritative native skill mechanism verified. They receive a portable manual fallback only. Other unknown hosts receive the same fallback. References remain subject to their respective owners' terms and licenses; the toolkit MIT license does not relicense external resources.

The public overview pages establish reference areas, not a complete standard-by-standard implementation. For product audits, consult and cite exact controls and versions at execution time.
