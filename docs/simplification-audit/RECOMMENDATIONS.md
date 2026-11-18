# Lead review: recommendations and execution plan

This is the second-pass review of the audit: the 1,024 per-file reports in [`files/`](files/), the 44 chunk
summaries in [`chunks/`](chunks/) and the four global ledgers ([`types.md`](types.md), [`helpers.md`](helpers.md),
[`delete-candidates.md`](delete-candidates.md), [`cross-file-actions.md`](cross-file-actions.md)). It records what
the reviewers got right, where I disagree or consolidate, the extra decisions I took, and the order the
implementation follows.

## 1. What the audit establishes

- The reviewers estimate about 28,700 removable lines in the renderer and Android sources alone, before tests.
- Most of the weight is in five places: retired feature paths still compiled in (legacy Notes and Calendar
  authorities, the client-side Calendar sync stack, hosted/paired agents, Wallet, backup/import/export), the
  development simulator living inside product modules, one mechanism re-implemented per feature (dialogs, durable
  slots, staleness fences, journals), copy-pasted micro-helpers and per-call-site plugin interfaces, and a handful
  of files that are too large to own (`model.js`, `connection-ui.tsx`, `agent-adapter.ts`, `main.tsx`,
  `template.html`, `AlphaLocalAgentPlugin`, `MainActivity`).
- The single largest obstacle is not in the product code. About 470 host tests and most Quint refinement harnesses
  read product **source text** (regex, marker slices, transplanted snippets, path and symbol manifests). They do not
  test behaviour, and they make every rename, split and reformat fail. `cross-file-actions.md` §2 lists them.

## 2. Where I change or consolidate the reviewers' proposals

| # | Reviewer proposal | Lead decision | Reason |
|---|---|---|---|
| R1 | Seven-wave plan with "retire text pins" as wave 0 | **Keep the dependency, change the grouping.** Deletions, shared modules and in-file cleanups land first (they do not need files to move). Splits, moves, foldering and the formatter land after the test and harness cleanup, in the same PR. | The owner asked for code first, then tests. Deleting and simplifying inside files is possible while pins exist, as long as each pin that breaks is deleted (source-text tests) or logged for the formal port. Moving files is not. |
| R2 | `lib/` holds everything shared, including `durable-slot`, `observed-document`, `owned-dialog` | `lib/` stays dependency-free (no Capacitor, no DOM, no product imports). Product-aware shared mechanisms go next to their owner: `runtime/storage/durable-slot.ts`, `browser/observed-document.ts`, `ui/owned-dialog.ts`, `runtime/platform.ts`. | A leaf library that imports the connection store is not a leaf, and it would recreate the import cycles the audit complains about. |
| R3 | Java helpers in a `.util` sub-package (cross-file-actions U-L8) vs one `AlphaUtil` in the root package (helpers.md §1.2) | **`AlphaUtil`, `Slots`, `AlphaPlugin` in the root package.** | Most classes are package-private; a sub-package would force them public. The two ledgers disagreed; this settles it. |
| R4 | `storage-keys.ts` with every installed key in one file | Keys stay with their owner module, exported once from it. Only keys shared by two owners move to `lib/storage-keys.ts`. | A global key file becomes a file every feature edits. The duplication problem is two declarations of one key, not the location. |
| R5 | `ShellExtensions` type listing the 241 ad-hoc instance fields | Type `ShellHost`, `ViewApi`, `ViewDefinition` now; do **not** enumerate the 241 fields. Adapters that still attach fields keep a local, narrow interface until the adapter pattern itself is replaced. | Writing a type for the monkey-patched surface blesses it. The real fix (D-pattern D3: adapters become modules with explicit inputs) happens with the `model.js` split. |
| R6 | Move upstream-engine instrumentation tests to `vendor/eliza` now | Not in this change (D14). They stay and are listed as follow-ups. | Never edit the vendor checkout. |
| R7 | Delete P-78 entry points (several Android chunks) | **Not done** (D7). | The PRD still plans them. The image/app mismatch is reported in the PR as an owner question. |
| R8 | Rename journals, keys and wire values that have misleading names | Not done where the name is persisted or crosses a process boundary. In-memory names may change. | G5: persisted identities stay byte-identical. |

## 3. Additional decisions (continue DECISIONS.md)

| # | Question | Decision | Basis |
|---|---|---|---|
| D15 | `test/support/feature-parity.mjs` per-file inventory (Q-TEST-2) | **Delete** the inventory, its test and `scripts/feature-manifest.ts` if nothing else needs it. | It asserts that a list of file names equals the list of files. It checks no behaviour and every change must edit it. |
| D16 | Open product questions (`cross-file-actions.md` §4, status "Open") | **Not implemented.** No visible behaviour, copy, security policy or data format changes without an owner answer. They are listed in the PR description, including the bug-fix candidates the reviewers found. | "Do not turn simulated prototype actions into real side effects"; behaviour changes are the owner's. |
| D17 | Install-base facts behind D1 (Q-LEG-1 … Q-LEG-7) | Renderer and Android legacy **readers and migrations are deleted** as D1 says. Three items are kept because deleting them is not a reader removal: the APK signing-rotation block (Q-LEG-5), the `AlphaQsDefaultsPolicy` OS-image migration (Q-LEG-2) and the admitted-previous-sources record (Q-LEG-3). They concern devices and images, not app data. | A wrong guess there breaks updates on real phones, and no build or test here can show it. |
| D18 | Android half of the Calendar sync deletion (Q-CAL-1) | Kept. Only the renderer stack that production cannot reach is deleted (D4). | The native bridge is production-reachable; whether it is the accepted sync is an owner question. |
| D19 | Dev simulator scope (Q-DEV-1) | Keep what a retained end-to-end spec drives; delete simulators of deleted features (Wallet, personal Cloud, backup). Everything kept moves behind the `dev/` boundary in the structural pass. | D6. |
| D20 | Dev-only code that carries a Lemma proof or Quint model (workflow trigger simulator, `createSessionSaver`) | Keep code and proof together, or delete both together. `createSessionSaver` (never called by the product) is deleted with its proof and model. The workflow simulator stays with its proofs while its specs stay. | D11: every live model passes; a model of deleted code is not live. |
| D21 | Verification limits on this machine | The data volume has under 1 GB free. The renderer build, typecheck, host tests, Playwright, Quint and Lemma run here. A full `android:build:local` for both variants needs several GB and may not fit; if it cannot run, the PR says so and CI is the proof. An APK build is not an emulator, image or device result. | AGENTS.md: never claim one proves another. |

## 4. Execution plan

Each stage ends with `tsc --noEmit`, `vite build` and the production bundle audit green.

**Stage A: deletions (decided retired paths).** Serial for the renderer, because the same large files are touched
by several paths; Android runs alongside on its own files.

| Unit | Scope |
|---|---|
| A1 | Client-side Calendar linked-sync stack (C3) and legacy calendar authority/preservation (C2) |
| A2 | Legacy Notes engine and storage (C1), legacy browser envelopes and "old copy" downloads (C6), remaining renderer legacy readers (U-R4) |
| A3 | Wallet (C8), backup/restore/import/export/password transfer (C9), constant-false switches (C10), Files folder-context (C19), note recorder live transcription only if decided (it is open: skipped), `createSessionSaver` (D20) |
| A4 | Hosted/paired/personal-Cloud product code that no production build reaches (C4), keeping the mock/remote harness the retained specs drive |
| A5 (Android) | Legacy Cloud sign-in recovery (C5), Android legacy readers and their upgrade tests (C7, within D17), Android side of C9, never-run instrumentation (C15), dead Java members and resources (delete-candidates B.1–B.3 marked `no` or decided) |

**Stage B: shared modules** (new files only, so they run alongside stage A): renderer `lib/` (hash, ids, parse,
json, abort, error-text, session-key, civil-date), typed `native/` plugin modules, `prototype/shell-types.ts`, Java
`AlphaUtil`/`Slots`/`AlphaPlugin`.

**Stage C: per-file cleanup, in parallel by file ownership.** Each implementer owns one chunk's files and applies
that chunk's per-file reports: dead exports and branches, defensive code that guards nothing, local helpers replaced
by `lib/`, per-call-site plugin interfaces replaced by `native/`, local type copies replaced by the owner's export,
`any` bags narrowed, comment noise removed. No file moves in this stage.

**Stage D: adversarial review of the whole diff**, then fixes, then the first commit and the draft PR.

**Stage E: tests, scripts, CI and formal** (the owner's second review): per-file review of `scripts/`, `test/`,
`specs/`, `.github/`; delete source-text, transplant and unit tests; consolidate the rest into integration tests and
Playwright journeys on one harness; port Quint harnesses from text slicing to imports; retire `specs/quint/legacy`;
path-scoped CI lanes; delete dead workflows.

**Stage F: structural pass** (unblocked by E): `dev/` boundary, the large-file splits, foldering, `@eliza/*` alias,
then Prettier as one mechanical commit.

**Stage G: full verification**: `npm run verify`, Playwright projects, Quint and Lemma at 100 %, Android build for
both variants where the machine allows, then the PR is marked ready.

## 5. Items reported to the owner, not changed

All "Open" rows of `cross-file-actions.md` §4 (about 110), the upstream follow-ups in §6 (16), and the three
install-base facts in D17. The PR description carries the short list.
