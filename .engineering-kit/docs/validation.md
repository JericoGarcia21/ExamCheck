# Validation scope

Run `node scripts/validate.mjs` from any directory; the default root is resolved from the script location. An optional directory argument validates another checkout or test fixture. Run `npm test` for validator, skills-only installer, workspace initialization, and CLI regression tests. Run `npm run test:package` to pack, install the tarball offline, resolve the npm executable, and initialize all five workspace modes in temporary directories.

The validator checks the required 17 skills, supported frontmatter subset, required docs/resources, relative Markdown file links (inline and reference style), local heading anchors, and generated tree freshness. It ignores fenced code, external URLs, and inline code. It is a lightweight repository validator, not a general Markdown or YAML parser: this kit permits only top-level name, description, and license scalar fields. Standard skills can support additional metadata; extending this kit's schema requires extending its validator. HTML links and dynamically constructed references are outside scope. External URL reachability is not tested in CI.

The installer tests copy self-contained references, dry-run behavior, conflict prevention, and invalid-agent/target rejection. No global configuration or actual client process is changed by the tests. CI is configured for Windows and Linux; local results do not prove remote CI succeeded.

Source checkout validation checks tree freshness. Runtime installation skips only that tree comparison because npm packages have a different root directory name and omit repository-only files. Required resources, metadata, and links are still checked. npm-generated tarballs and installed .engineering-kit bundles are excluded from the source tree. Package smoke tests need npm itself but no network or third-party dependencies.

[Validation results](validation-results.md) records commands actually executed in this generation session. Re-run checks after edits. Use `node scripts/tree.mjs --write` to refresh the complete tree; `node scripts/tree.mjs` prints it.
