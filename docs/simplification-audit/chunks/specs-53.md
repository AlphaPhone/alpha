# Chunk specs-53

| File | Kind | Verdict | Target / notes |
|---|---|---|---|
| `specs/quint/services/manifest.json` | Quint model registry (live; 78 models) | KEEP, SIMPLIFY | Delete `CalendarLinkedSync` (+ `.qnt`, `refinement/services/calendar-linked.mjs`, instance in `native/ControllerComposition.qnt`); MERGE `MapsNavigation` into `MapsNavigationGuidanceReadback`; re-scope/delete `DevelopmentDigestPending`; drop 266 `symbols` pins (90 are local names); move 18 upstream-only models to an upstream-pin lane; remove duplicate `ScanDocument` invariant; drop linked-sync `sharedSources` from `CalendarSync`. |

## Behaviours that would lose coverage
- Deleting `CalendarLinkedSync` removes formal coverage of upstream linked-calendar reconciliation. That code is no
  longer consumed by the renderer after D4, so nothing product-side loses coverage. If the owner keeps the Android
  sync half (Q-CAL-1), `CalendarSync` still covers it through `CalendarSync*.java` sources.
- Merging `MapsNavigation` loses nothing: the readback model repeats its four scenarios and five invariants.
- Dropping `symbols` loses only the "word exists in file" check, which tests no behaviour.

## Shared helpers worth keeping
- `scripts/quint-lib.ts` `readModelFamily`/`loadModels`: the only manifest reader that should remain;
  `specs/quint/refinement/check-traces.mjs` should import it rather than re-parse the JSON three times.
- `scripts/ci/check-changed-models.ts` source→model selection: the basis for path-scoped Quint lanes (P1).

## Cross-file actions
- `CalendarLinkedSync` deletion must edit `specs/quint/native/ControllerComposition.qnt` and
  `specs/quint/refinement/services/index.mjs` in the same commit.
- delete-candidates A84 (`scan-text-layer.ts`), A86 (maps one-line shims), B211 (`phoneRows`), B296/B297 (hosted digest)
  each require manifest `sources`/`symbols` edits in the same commit, or `quint:check` fails at load.
- The working tree already removed 5 calendar-sync renderer sources, 2 `NativeGoogleHostArtifact` sources and the
  `retireSharedMail` pin from this file; those edits are consistent with D4/D1.

## Owner questions
- Does the development digest storage (`hosted-digest-ui.tsx` + `scripts/local-agent-dev-storage.ts`) survive D19? If
  not, delete `DevelopmentDigestPending` with it; if so, shrink it to the current single encoding (B297).
- Should `WorkflowExecution` and `WorkflowExecutionAuditAdmission` (identical sources, five shared scenarios) be merged
  into one model?
- Do workflow "legacy agents" (no submission identity / version fence) still exist as a supported server? If not, the
  legacy branches in `WorkflowExecutionAuditAdmission` are A1 and can go.
- Move the 18 upstream-only models upstream (D14 follow-up), or keep them here behind an upstream-pin lane?
