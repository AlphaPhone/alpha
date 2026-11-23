# specs/quint/application/CanonicalNotesDraft.qnt
- Lines: 107 | Kind: Quint model (live: listed in specs/quint/application/manifest.json, loaded by scripts/quint-lib.ts / check-quint.ts) | Verdict: KEEP model; PORT harness
- Covers: NotesEditor draft/save protocol (capture, queued save, external revision review, removed note) over the canonical Notes controller. Duplicates: Same campaign runs in the per-model wrapper and in the application aggregate (T4). Callers/importers: `specs/quint/refinement/application/canonical-notes-draft.mjs` (+ `.md`), `test/quint-canonical-notes-draft.test.mjs`, `test/quint-application-refinement.test.mjs` (via `refinement/application/index.mjs`); harness also imported by canonical-notes-mutation.mjs and canonical-notes-view.mjs.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 29-40 | T10 | Harness bundles the real modules with esbuild (good) but an onLoad plugin rewrites the upstream `.eliza/.../notes-editor.ts` at the literal marker `    this.saving = true;` to add `__quintInspectSaved`. | Observe the saved capture through the editor's public callbacks / the controller port instead of injecting; if impossible, ask upstream (D14) for an inspect hook. | Upstream text change breaks harness silently-loud; marker is whitespace-sensitive. |
| 2 | manifest | T4/P1 | Run twice: per-model wrapper and aggregate. | Keep only the per-model wrapper (lead plan §2.4); drop from aggregate. | None. |
| 3 | manifest sources | — | Sources: `prototype/canonical-notes-editor.ts` + three `.eliza/client-features/plugins/plugin-notes` files; all exist. No symbol pins. | None. | — |

## Proposed end state
Model of live product code (canonical Notes is the surviving Notes path after A1/C1 deletes the legacy engine). Keep the .qnt unchanged. Harness keeps the esbuild bundle import but loses the marker injection. One runner (per-model test).
