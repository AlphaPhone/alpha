# android/app/src/main/java/ai/alphacompute/alphaphone/AlphaTelephony.java
- Lines: 34 | Role: Alpha's installed identity for the shared reviewed SMS/MMS core (slots, actions, receiver, capability gate, journal store). | Verdict: SIMPLIFY
- Importers: `AlphaSmsSendReceiver`, `AlphaTelephonyPlugin`, launcher `AlphaSmsRole`. Text/path pins: `specs/quint/native/manifest.json`; `specs/quint/refinement/native/{sms,mms}-dispatch.mjs`; `test/aosp-sms.test.mjs`, `test/aosp-image-capability.test.mjs`; `test/support/feature-parity.mjs` (allowlist path) (renderer files mention the plugin name only)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-9, 23 | A1 | Second constructor arg `"alpha-sms-sends.journal"` is "the plaintext journal it migrates from" (pre-encrypted-ledger SMS sends). Package renamed 2026-11-10 with no data migration. | Owner decision: if no install of `ai.alphacompute.alphaphone` ever wrote the plaintext journal, drop the argument and the migration upstream (`SmsTelephonyConfiguration` + `SmsTelephony` read path), then re-pin. Cannot be removed locally alone (upstream constructor). | medium (in-flight SMS receipts on pilot devices) |
| 2 | 27-33 | C4 | Anonymous `JournalStore` adapter over `AlphaCredentialStore`. | `AlphaCredentialStore.asSlots()` (cross-file). | low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| CONFIGURATION.JournalStore adapter | anon class | 27-33 | AlphaReminders:20-27 etc. | AlphaCredentialStore.asSlots() |

## Proposed end state
Identity constants only; journal store one call; legacy journal argument gone if owner agrees; ~26 lines. Estimated lines after: 26.

## Verification
`test/aosp-sms.test.mjs`; launcher SMS instrumentation on an AOSP image (cannot be proven by host tests).
