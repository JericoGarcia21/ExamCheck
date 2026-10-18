# Validation results

Generation environment: Windows PowerShell, 2026-10-18. Commands ran from the toolkit root.

| Command | Actual result |
| --- | --- |
| `node scripts/tree.mjs --write` | Exit 0; complete tree printed and saved to docs/repository-tree.txt |
| `node scripts/validate.mjs` | Exit 0; 17 skills, 76 Markdown files, 0 errors |
| `node --test scripts/validate.test.mjs scripts/install.test.mjs` | Exit 0; 12 tests passed, 0 failed, 0 skipped |

The tests exercised all four agent installation layouts in temporary directories, dry-run behavior, copies with local references, overwrite/conflict prevention, invalid target/agent rejection, malformed metadata, missing required files, broken Markdown targets, heading fragments, and code-block exclusion.

Official public documentation was accessible and reviewed; see [sources](../references/sources.md). Native discovery inside the actual Codex, Claude Code, Cursor, and OpenCode clients remains NOT VERIFIED. Buff and Free Buff native compatibility remains unverified and receives only a portable fallback.

No browser, product security audit, deployment, or remote GitHub CI result is claimed. The scripts verify this instruction repository and its installation packaging only. Python was unavailable, so the bundled Python skill-creator validator could not run; the repository's Node.js metadata and packaging checks ran instead. Manual behavioral agent scenarios remain pending.

## npm-compatible workspace installer

Verified locally on Windows with Node.js v24.14.1. PowerShell blocks npm.ps1 in this environment; npm.cmd was used without changing execution policy.

| Command | Actual result |
| --- | --- |
| `npm.cmd run validate` | Exit 0; 17 skills, 77 Markdown files, 0 errors |
| `npm.cmd test` | Exit 0; 22 tests passed, 0 failed, 0 skipped |
| `npm.cmd run test:package` | Exit 0; npm pack, offline tarball installation, npm executable resolution, and all 5 workspace modes passed |

New regression cases cover a project without package.json, existing instruction preservation, portable-only installation, conflicts before writing, junction rejection, CLI arguments, and paths with spaces. The artifact check used npm to execute the installed command for codex, claude, cursor, opencode and portable in isolated temporary directories.

GitHub downloading, public npm registry installation, actual agent-client discovery, macOS/Linux runtime execution, and remote CI remain NOT VERIFIED. The npm registry package has not been published. Package-manager installation verifies file placement and executable behavior, not agent compliance with instructions.
