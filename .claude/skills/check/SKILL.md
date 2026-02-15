---
name: check
description: Run all project quality checks — lint, typecheck, content validation, term validation, and markdown lint. Use after making code or content changes to verify everything is correct.
allowed-tools: Bash
---

Run all quality checks for the project sequentially. Stop and report on the first failure, or report success if all pass.

Run these checks **in order**:

1. **Lint** — `pnpm lint`
2. **Typecheck** — `pnpm typecheck`
3. **Validate content** — `pnpm validate`
4. **Validate terms** — `pnpm validate:terms`
5. **Markdown lint** — `npx markdownlint-cli2 "content/**/*.md"`
6. **Unused code** — `pnpm knip`

## Rules

- Run each check one at a time so failures are easy to isolate
- If a check fails, report the errors clearly and suggest fixes — do NOT continue to the next check
- If all checks pass, report a brief summary: which checks ran and that all passed
- Do NOT auto-fix anything unless the user explicitly asks
