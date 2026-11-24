# test/browser/dev-connected-voice.spec.ts
- Lines: 7 (1 test, 2 loop arms) | Kind: Playwright `chromium`, fixture page; overrides a product controller method in-page | Verdict: **DELETE**
- Covers: with a paired voice binding stubbed on `connectionController`, the Notes recorder still uses the explicit Cloud-only voice policy (no upload, no local/development voice choices). Duplicates: the signed-in Cloud arm is covered by the other `cloud-notes-voice-fixture.ts` users (`browser-speech.spec.ts`, `voice-owned-navigation.spec.ts`, `voice-preparation-ownership.spec.ts`, `responsive-surfaces.spec.ts`). Callers/importers: `chromium` project; imports `cloud-notes-voice-fixture.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4 | P2, D5 | Replaces `connectionController.getPairedVoiceBinding` (research P2 example). Paired voice is in the C4 delete list (`getPairedVoiceBinding`, `runtime/paired-voice.ts`). | Delete with C4. | none |
| 2 | 3 | T4 | The `signed=true` arm repeats what the other cloud-notes-voice specs already check. | Delete. | Low |

## Proposed end state
Deleted. When `getPairedVoiceBinding` goes, the "paired agent alone" arm has nothing to test.
