# Package installation

Requires Node.js 22+ and npm. Works in an existing folder for any programming language or framework, including projects with no package.json. The CLI writes project-local files; it does not install a runtime dependency into your application. Windows, macOS and Linux are intended targets; see [actual verification](validation-results.md) for the environments exercised.

## Install directly from GitHub

After the package changes have been pushed to GitHub, open a terminal in your project folder:

```sh
npx --yes --package=github:JericoGarcia21/fullstack-ai-engineering-kit fullstack-ai-engineering-kit init --agent codex
```

Use claude, cursor, opencode, or portable instead of codex. GitHub package fetching requires Git and network access. For repeatable installation, append a reviewed commit SHA to the GitHub package specification, for example `github:JericoGarcia21/fullstack-ai-engineering-kit#<COMMIT_SHA>` with the placeholder replaced.

The command runs init explicitly, which writes the installation. Preview first by adding `--dry-run`. Choose a different existing directory with `--target "/path/to/project"`; relative paths resolve from your terminal's current directory.

On Windows PowerShell, if script execution policy blocks npx.ps1, use `npx.cmd` with the same arguments. No policy change is needed.

## Install once for repeated use

After pushing the package changes:

```sh
npm install --global github:JericoGarcia21/fullstack-ai-engineering-kit
fullstack-ai-engineering-kit init --agent codex
```

Run the second command from each project directory. Global npm executable paths and permissions depend on your Node installation. On Windows, `npm.cmd` can replace npm when PowerShell blocks npm.ps1.

## Try a local checkout now

Before pushing or publishing, run the CLI directly from another project:

```sh
node /path/to/fullstack-ai-engineering-kit/bin/cli.mjs init --agent codex
```

Alternatively, from the toolkit checkout run `npm pack`, then install the resulting .tgz with `npm install --global /path/to/fullstack-ai-engineering-kit-0.1.0.tgz`. This uses the same package executable without a registry publication. `npm run test:package` exercises an offline tarball installation in temporary directories.

## What init creates

| Mode | Native skill destination | Workflow entry point |
| --- | --- | --- |
| codex | .agents/skills/ | Appends a labeled block to AGENTS.md |
| claude | .claude/skills/ | Appends a labeled block to CLAUDE.md |
| cursor | .cursor/skills/ | Creates .cursor/rules/fullstack-ai-engineering-kit.mdc |
| opencode | .opencode/skills/ | Appends a labeled block to AGENTS.md |
| portable | No native discovery assumed | Provide .engineering-kit/docs/portable-master-instructions.md manually |

All modes copy a self-contained toolkit into .engineering-kit/, including templates, checklists, references, worked examples, all skills, and the MIT license. Native modes additionally copy 17 complete skill folders into the host-specific location. The entry point directs the agent to project planning and evidence requirements without replacing your existing instructions or prescribing the toolkit's test commands for your application.

Existing bundles, skills, or conflicting rules cause an error before normal writes begin. There is no overwrite/force or automatic upgrade option. An unexpected filesystem failure can leave a partial installation; inspect the reported paths before retrying. Symlink/junction destinations are rejected. Avoid concurrent installers in the same project.

Review the generated files and commit them if the team should share the instructions. No project package.json, dependency lockfile, or global agent configuration is modified by init. No install/postinstall lifecycle hook initializes workspaces automatically.

Reload your agent, verify project-discovery is available, and ask:

```text
Follow .engineering-kit/templates/project-initialization.md to plan my project.
Prepare requirements, architecture, security/QA needs and a feature plan.
Present necessary decisions before starting significant implementation.
```

## Publishing to npm later

The package is prepared for npm publication, but it has not been published and registry name availability is unverified. Therefore `npx fullstack-ai-engineering-kit` is not advertised as currently available. GitHub installation does not require npm registry publication.

If you own the package name, review the package contents and publish explicitly:

```sh
npm run validate
npm test
npm run test:package
npm pack --dry-run
npm login
npm publish --access public
```

Publishing requires an npm account, available/owned package name, and the account's authentication requirements. If the unscoped name is unavailable, choose a scope you own and update package.json plus installation examples. After a successful publication, users can run:

```sh
npx fullstack-ai-engineering-kit init --agent codex
```

Other package managers that support npm packages may run this CLI, but their commands and compatibility have not been verified here. No claim of native support for every AI workspace is made; portable mode is a manual fallback.

The package uses npm's documented [bin and files fields](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/), [npm exec](https://docs.npmjs.com/cli/v11/commands/npm-exec/), and [GitHub package specifications](https://docs.npmjs.com/cli/v11/using-npm/package-spec/).
