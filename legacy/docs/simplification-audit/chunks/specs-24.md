# Chunk specs-24

| File | Kind | Verdict | Target |
|---|---|---|---|
| specs/quint/native/manifest.json | Quint manifest (live registry, 85 native models) | KEEP + SIMPLIFY | Delete `ControllerComposition` entry (models the deleted renderer Calendar sync host); drop unread `abstractions`/`stateMapping`/`components`, `symbols` text pins, defaulted `init`/`step`/`invariant`; derive scenario lists from `.qnt`; de-duplicate `vendor/eliza/` sources into `sharedSources`. |

## Coverage at risk if the DELETEs happen
- Deleting `ControllerComposition` removes the only bounded composition check of renderer ConnectionController + VoiceSession account binding together (`VoiceBindingCurrent`, `RendererHasActivatedCredential`). `ApplicationComposition` covers `VoiceAccountBound` and Identity/Voice/Resident/Reset/Inbox/agent Calendar at the model level, but its refinement campaign must be checked to confirm it exercises the renderer voice-binding observation; if not, cut `ControllerComposition` to Identity+Voice instead of deleting it.
- Dropping `symbols` pins removes the load-time drift check for 13 models; drift is then caught only by their refinement harnesses (which execute the code) or not at all for models without one.

## Shared helpers worth keeping
- `scripts/quint-lib.ts` `readModelFamily` / validation: export it once (ci-and-formal §4 row on manifest readers) and have `check-changed-models.ts`, `refinement/application/index.mjs` and `test/quint-native-refinement.test.mjs` use it instead of re-parsing manifests.

## Cross-file actions
- `specs/quint/native/ControllerComposition.qnt`, `specs/quint/refinement/composition/controllers.mjs`, `composition/ports.mjs` (Calendar port), `composition/README.md`, `test/quint-composition-refinement.test.mjs`, `test/quint-native-refinement.test.mjs:15` (hard-coded exclusion list), `browser.yml` production-job composition step: update together with finding #1.
- Manifest schema simplification (#3, #4, #7) is one change across all four families plus `quint-lib.ts`.
- After stage A4, re-check the Hosted* native models for remote/paired delivery modes.

## Owner questions
- Delete `ControllerComposition` outright now that the renderer Calendar sync host is gone, or keep an Identity+Voice-only composition?
- Should model prose (`abstractions`, `stateMapping`) live in the manifest or in the `.qnt` header? (Proposed: `.qnt`.)
