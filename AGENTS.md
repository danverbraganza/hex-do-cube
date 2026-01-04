# Guide for Agents working on Hex-do-cube.

## Agent Operating Rules

* Follow repo conventions over personal preference. If instructions conflict, call it out and choose the smallest change that satisfies the request.
* Do not perform drive-by refactors (renames, formatting sweeps, dependency upgrades) unless explicitly requested or required to complete the task.
* If requirements are underspecified, make the smallest reasonable assumption, implement minimally, and document the assumption in the commit message or PR summary.
* Keep diffs small and readable. Avoid unrelated whitespace changes.

## Repository Orientation

* Always read, in order: `README.md` → `AGENTS.md` → `justfile` → `package.json` scripts → `CONTRIBUTING.md` (if present).
* Treat existing config as canonical: `tsconfig*.json`, `vite.config.*`, `eslint*`, `prettier*`.
* Prefer to keep all files in Typescript.

### Technology Choices

* Always add unit tests for the code that you are writing. Implement tests with `bun test`.
* Use vite for serving the development server.
* Use `just` and write a `justfile` for automating development and building commands
* Use the repo's package manager, `bun`. Do not switch package managers.
* Use the Bun version declared in `.bun-version`.

## Definition of Done (Green)

Each commit must be “green” by satisfying all of the following (if the commands exist in this repo):

* `just test` (or equivalent) passes
* `just lint` passes
* `just typecheck` passes
* `just build` passes (only if the change impacts build output or CI requires it)

If a command does not exist yet, add the minimal `justfile` target that forwards to the appropriate `package.json` script.

## Canonical Commands (Prefer `just`)

Use `just` as the primary interface. Maintain or add targets as needed:

* `just dev`      → run local dev server
* `just test`     → run unit tests
* `just lint`     → run lint checks
* `just typecheck`→ run TypeScript type checking
* `just build`    → build production assets
* `just fmt`      → format (only when explicitly requested or required by CI)


## TypeScript Conventions

* Avoid `any`. Use `unknown` and narrow.
* Add explicit types at module boundaries (exported functions, public APIs). Prefer inference internally.
* Throw `Error` objects (never throw strings).
* Prefer `type` aliases by default; use `interface` only when you need declaration merging or `implements` semantics.
* Keep functions small and pure where practical; isolate side-effects.

## Testing Standards (Bun Test)

* Add tests for any new or changed logic that has branching, parsing, calculations, or error paths.
* Prefer table-driven tests for multiple cases.
* Minimize mocking; test pure logic directly. Mock I/O boundaries only.
* Place tests according to repo convention, which is `*.test.ts`.
* Use Bun's built-in test runner (`bun test`) with standard `expect` API.


## Dependency Policy

* Do not add dependencies unless necessary. Prefer existing libraries in the repo.
* If you add a dependency:
  * justify it in the commit message or PR summary
  * update the lockfile
  * avoid large/unused transitive packages when a small alternative exists

## Linting / Formatting Policy

* Do not change ESLint/Prettier configs. If required by task, ask for human intervention.
* Avoid formatting-only diffs. If formatting changes are unavoidable, keep them localized to touched files.

## Commit Discipline

* Use atomic commits: one logical change per commit.
* Each commit must be green (see Definition of Done).
* Prefer clear commit messages, in the format,


## Task Tracking (`bd`)

* Use `bd` for task tracking as the system of record.
* Update task status when you start work and when you finish work (and reference the task id in commit messages when available).

## Project Structure Expectations

* Keep UI components focused on rendering and interactions; place business logic in `src/services/` or `src/models/`
* Avoid cyclic dependencies and cross-layer imports (e.g., low-level utilities should not import UI components).

## Security / Secrets Hygiene

* Never commit secrets or `.env` files. If new environment variables are needed, update `.env.example` and document them in `README.md`.
* Treat user input as untrusted; validate and sanitize where applicable.

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
