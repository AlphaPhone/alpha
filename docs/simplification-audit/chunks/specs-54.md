# Chunk specs-54

| File | Lines | Kind | Verdict | Target / note |
|---|---|---|---|---|
| specs/quint/services/scan-source-conformance.mjs | 112 | stubbed JSDOM harness of `openScanDocument` (no Quint model tie) | DELETE | Duplicate of `specs/quint/refinement/services/scan.mjs` (real Chromium + IndexedDB, ScanDocument trace replay). Delete wrapper `test/quint-scan-conformance.test.mjs` and README block too. |
| specs/quint/tlc.json | 5 | checker config | KEEP | Used by `scripts/check-quint.ts` verify and `scripts/ci/check-changed-models.ts`. |
| specs/quint/ui-return-review-20261109.md | 20 | historical review note | DELETE | Also remove the two manifest `abstractions` strings citing it (application :3496, services :2271). |
| specs/quint/verification.md | 206 | historical verification record | DELETE | Drop pointer in `specs/quint/README.md:111-113`. Contains a now-false claim that the scan draft defect is present. |

## Coverage lost by the DELETEs
None. Explicit-save-survives-export is asserted by `specs/quint/refinement/services/scan.mjs` (modes explicit,
explicit-then-autosave, unverified, automatic) and draft save/load by `test/browser/scan-draft.spec.ts`. The two
Markdown files carry no executable coverage.

## Shared helpers worth keeping
None in this chunk. (`tlc.json` stays as the single TLC config.)

## Cross-file actions
- Delete `test/quint-scan-conformance.test.mjs` with `scan-source-conformance.mjs`; remove `specs/quint/services/README.md` ~158-170.
- Remove "Source review recorded in specs/quint/ui-return-review-20261109.md." from `specs/quint/application/manifest.json:3496` and `specs/quint/services/manifest.json:2271`.
- Replace the "Verification record" paragraph in `specs/quint/README.md:109-113`.
- When `specs/quint/legacy` is retired, `tlc.json` loses its legacy callers but stays for `check-quint.ts`.
- When porting `refinement/services/scan.mjs` (T10), keep its explicit-save-then-export mode: it becomes the only coverage of that invariant.

## Owner questions
None.
