# Chunk specs-46: services Quint refinement harnesses (native-google-host-artifact … scan)

29 files under `specs/quint/refinement/services/`. Every `.mjs` here feeds a model listed in
`specs/quint/services/manifest.json`, so all of them are live. None models a feature that DECISIONS.md deletes. Most
already import and run the real module (scripts, upstream Notes, the Maps relay, Java classes compiled whole). Two
harnesses slice or inject product **text** and need a PORT. The developer launcher family follows the fate of
`scripts/start-reviewed-workflow-agent.ts`.

| File | Kind | Model | Verdict | Target / note |
|---|---|---|---|---|
| native-google-host-artifact.mjs | wrapper, isolated probe spawn | NativeGoogleHostArtifact | KEEP, SIMPLIFY | shared spawn helper; one input list |
| native-google-host-artifact-probe.mjs | driver, real producer/verifier | NativeGoogleHostArtifact | KEEP, SIMPLIFY | error **codes** instead of 18 message regexes |
| notes-store/README.md | doc | CanonicalNotesStore | KEEP (trim) | drop dated verification log and counts |
| notes-store/fixture.mjs | shared support (harness + 3 Notes integration tests) | – | KEEP | optional move to `test/support/notes-source.mjs` |
| notes-store/index.mjs | driver, real upstream Notes | CanonicalNotesStore | KEEP | rename `legacy` → `unversioned` (upstream format, not D1) |
| notes-store/module.mjs | support, esbuild bundle of real Notes | – | KEEP | delete bundle-text `file-type` assertion; shared bundler |
| pdf-platform.mjs | Android stubs in JS strings | – | MERGE | into one shared Android stub tree (6 copies exist) |
| pdf.mjs | JVM wrapper, whole product Java | PdfWorker | KEEP | needs own runner entry |
| personal-assistant-scheduled-task-custody.md | doc | – | KEEP (trim) | move open finding to upstream follow-ups |
| personal-assistant-scheduled-task-custody.mjs | driver, upstream-only via **sliced** upstream wiring (fixture) | PersonalAssistantScheduledTaskCustody | KEEP (upstream lane) | upstream follow-up: export wiring; owner: does Alpha ship it? |
| phone-session-replay.mjs | model replay, real phone adapter | PhoneSession | KEEP, SIMPLIFY | one entry point; drop canary/count pins; port with adapter split |
| pilot-update.md | doc | – | KEEP (trim) | |
| pilot-update.mjs | driver, real `updateUnit` + journal | PilotApkUpdate | KEEP | owner: drop `legacy-export` scenario? |
| plan-admission-grace.mjs | driver over transplant | PlanAdmissionGrace | **PORT** | import extracted `runtime/plan-admission.ts`; delete canaries |
| plan-admission-ports.mjs | **source transplant** of `connection-ui.tsx` in `vm` | – | **PORT** | becomes a ~40-line deps fixture |
| policies.mjs | JVM wrapper | IdentitySession, BrowserSiteState, BrowserDownloads | KEEP | needs own runner entry |
| prepared-source-stamp.mjs | driver, real `prepare-local-agent.ts` child | PreparedSourceStamp | KEEP, SIMPLIFY | refusal codes instead of stderr regexes |
| prepared-workflow-worker.mjs | driver, real ensure/verify | PreparedWorkflowWorker | KEEP | make `waitForPreparedWorkerProducer` private |
| protected-app-update-promotion.mjs | YAML assertions + Python + real `deliver()` | ProtectedAppUpdatePromotion | KEEP, SIMPLIFY | delete `checkWorkflows` (T1); own runner entry |
| protected-app-update-promotion.py | Python campaign, real CI helpers | ProtectedAppUpdatePromotion | KEEP, SIMPLIFY | stop importing `test/qualified-app-update.test.py` as a library |
| reading.mjs | driver, real modules in Chromium | BrowserReadingState | KEEP, SIMPLIFY | JSDOM instead of Chromium; own runner entry |
| resident-java-source-stage.mjs | driver, real staging CLI | ResidentJavaSourceStage | KEEP, SIMPLIFY | refusal codes; delete duplicate host case |
| resident-maps-relay-offer.mjs | model replay, real relay | ResidentMapsRelayOffer | KEEP | one runner; counterfactual scenarios (owner/model) |
| reviewed-workflow-launcher-baseline.md | history record | – | **DELETE** | A8 |
| reviewed-workflow-launcher.md | doc | – | KEEP or DELETE with launcher | |
| reviewed-workflow-launcher.mjs | wrapper | ReviewedWorkflowLauncher | KEEP / DELETE with launcher (owner, D20) | launcher script is MERGE-then-delete in its own report |
| reviewed-workflow-launcher-probe.mjs | driver, real launcher via import hooks | ReviewedWorkflowLauncher | same as wrapper | |
| scan-review-dialogs.mjs | driver with **text injection** into two product files | ScanReviewDialogs | **PORT** | observe DOM/ports instead of closure vars; delete mutant |
| scan.mjs | driver, real UI + IndexedDB in Chromium | ScanDocument | KEEP | absorb `specs/quint/services/scan-source-conformance.mjs` (T4) |

## Text pins these harnesses depend on (for the T10 port)
- `plan-admission-ports.mjs` → `apps/app/src/runtime/connection-ui.tsx`: `'function readPlanAdmission('`→`'/** Notice shown when Cloud inference'`;
  `'function signInClient('`→`'/**\n * A new key was stored'`; lines starting `'function stopEntitlementRefresh('`, `'function detachService('`;
  `'async function admitCloudResident('`→`'/**\n * Reads the account and plan again'`; `'function residentBindingController('`→`'/** The packaged-runtime refusal.'`;
  `'  async residentRedeem('`→`'  /** Checks the plan again'`; plus `^export ` stripping and `stripTypeScriptTypes`. The `vm` box lists ~40
  module-level names these functions read; that list is the dependency interface for the extracted module.
- `scan-review-dialogs.mjs` → `apps/app/src/prototype/scan-review.ts` anchor `'  return dispose;'` (reads closures `closed, attempted, pdfAttempted`)
  and mutant guard `'if(attempted||!field.value.trim())return;'`; `apps/app/src/prototype/scan-searchable-review.ts` anchor
  `'  void(async()=>{for'` (reads `closed, ready, busy, requested`).
- `test/fixtures/lifeops-scheduled-task-route.mjs:61-69` (used by the Personal Assistant harness) → upstream
  `plugins/plugin-personal-assistant/.../scheduled-task/runtime-wiring.ts` anchors `'    prepareMutation: createDossierActivityMutationPolicy({ ownerFacts }),'`
  → `'\n\n    executionBoundary: (task, execute) =>'` and `'export function registerDossierActivityAnchor('` → `'\nfunction resolveRuntimeAnchorRegistry(runtime: IAgentRuntime)'`.
- Import-specifier pins (not text slicing, but rename-sensitive): `'./prepare-client-features.ts'` in `scripts/native-google-host-artifact.ts`;
  `node:fs`/`node:child_process` in `scripts/start-reviewed-workflow-agent.ts`; stub keys in `scan*.mjs` and `phone-session-replay.mjs`
  (`'../runtime/browser-note-documents'`, `'../daily'`, `'runtime/aosp-image$'`, …).
- Error-message pins (T10 on error text): `native-google-host-artifact-probe.mjs:146-162`, `prepared-source-stamp.mjs:108-125`,
  `resident-java-source-stage.mjs:10-18`, `reviewed-workflow-launcher-probe.mjs:87-97`.

## Behaviours that would lose all coverage if the DELETEs happen
- Only `reviewed-workflow-launcher-baseline.md` is deleted outright: no behaviour loses coverage.
- If the owner deletes `scripts/start-reviewed-workflow-agent.ts`, deleting the launcher model and harness loses nothing
  that ships. The shared `launcher-child.ts` supervisor stays covered by `combined-agent-launcher.mjs`.
- **Risk from host-test deletions elsewhere:** `pdf.mjs` (PdfWorker), `policies.mjs` (IdentitySession, BrowserSiteState,
  BrowserDownloads), `reading.mjs` (BrowserReadingState), `scan.mjs` (ScanDocument) and
  `protected-app-update-promotion.mjs` have **no per-model host test**. They run only inside
  `test/quint-services-refinement.test.mjs`, which is DELETE (T4). They must each get an entry in the manifest-driven
  Quint runner in the same change, or these six models stop being checked against code.
- If the `legacy-export` (pilot) and legacy-floor (app update) scenarios are removed on owner confirmation, the matching
  product branches must go in the same commit, so the model, the harness and the code stay in step.

## Shared helpers worth keeping / creating
- `refinement/support.mjs` (one file for services and application): `action`, `deferred`, `until`, `tick`, `call/checkpoint/trace`,
  a `bundleSource({entry, stubs, onLoad, beforeImport})` (replacing `services/support.mjs:sourceModule`, `identity-comms-traces.mjs:sourceModule`,
  `notes-store/module.mjs`, `scan-review-dialogs.mjs:compile`, `plan-admission-ports.mjs`), `runIsolatedProbe(probe, args)`
  (native-google-host, reviewed launcher, combined launcher, cloud-qa), a directory digest walker, sha256 hex.
- One Android framework stub tree for host-JVM harnesses (`pdf-platform.mjs` plus five `native/*-platform.mjs` copies).
- `notes-store/{module,fixture}.mjs`: the single loader for real upstream Notes, shared with `test/integration/notes-store.test.mjs`.
- A Python `test/support/qualified_update_fixture.py` shared by `test/qualified-app-update.test.py` and the promotion campaign.

## Cross-file actions
1. Add per-model runner entries for PdfWorker, IdentitySession, BrowserSiteState, BrowserDownloads, BrowserReadingState,
   ScanDocument and ProtectedAppUpdatePromotion before deleting `test/quint-services-refinement.test.mjs`.
2. Extract `apps/app/src/runtime/plan-admission.ts` from `connection-ui.tsx` (stage F split), then port `plan-admission-*`.
3. Port `scan-review-dialogs.mjs` to DOM and port observations; delete the `notes-unlatch` canary in `test/quint-scan-review-dialogs.test.mjs`.
4. Delete `specs/quint/services/scan-source-conformance.mjs` + `test/quint-scan-conformance.test.mjs` (subsumed by `scan.mjs`).
5. Delete `test/quint-phone-session.test.mjs` and the duplicate host case in `test/quint-resident-java-source-stage.test.mjs`. Keep only the
   forward-replay registrations for PhoneSession and ResidentMapsRelayOffer.
6. Give refusals in `scripts/native-google-host-artifact.ts`, `scripts/prepare-local-agent.ts`/`local-agent-source.ts` and the resident Java
   staging CLI stable codes, then match codes in the harnesses.
7. Remove `checkWorkflows()` and the `yaml` dependency from `protected-app-update-promotion.mjs`.
8. Upstream follow-up (D14): export the Personal Assistant scheduled-task wiring so the lifeops fixture stops slicing.
9. Path filters for the formal lane: each harness lists its inputs already; use them as the path→check map (ci-and-formal §7).

## Owner questions
- Does any installed pilot unit still run an APK without `DataIntegrityProvider` (pilot `legacy-export` scenario)?
- Is the `app-stable` legacy update pointer still read by any installed build, given `updateChannelCheckEnabled = false`? If not, remove the legacy floor from `deliver-app-update.ts` and the model.
- Is `scripts/start-reviewed-workflow-agent.ts` deleted (its script report proposes merging it into `start-local-remote.ts`)? If yes, delete `ReviewedWorkflowLauncher.qnt` and its four harness files with it.
- Does Alpha ship the upstream Personal Assistant scheduled-task plugin? If not, the PersonalAssistantScheduledTaskCustody model belongs upstream.
- Should the two "known gap" promotion schedules (main-push has no signer route; dispatch archive has no attempt pin) stay as passing witnesses, or be fixed?
- Should `ResidentMapsRelayOffer.qnt` keep the counterfactual `unlatchedEnd` scenarios, which the harness has to cut off?
