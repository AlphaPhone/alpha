# scripts/aosp-listener.ts
- Lines: 19 | Kind: script helper (AOSP staging/APK verification binding of upstream `sense-listener.mjs`) | Verdict: KEEP, SIMPLIFY
- Covers: `stageListener` reads the Pixel 10a composition and voice-host record and calls upstream `stageSenseListener`; re-exports 14 upstream symbols. Duplicates: none. Callers/importers: `scripts/stage-aosp.ts:75` (`VOICE_HOST_RECORD`, `checkListenerDescriptor`, `checkListenerSpeechBundle`, `checkListenerSpeechNatives`, `stageListener`), `scripts/verify-apks.ts:54` (`apkPermissions`, `checkListenerPermissions`, `checkListenerSpeechBundle`, `listenerPackage`), `scripts/verify-aosp-listener.ts:9` (`verifyAospListener`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7 | A7 | `FORBIDDEN`, `INDICATOR_EXEMPT_ROLES`, `UNPRIVILEGED`, `LISTENER_BUNDLE_MANIFEST`, `checkListenerOverlay`, `privappPermissions` are re-exported but imported by no script, test or spec (git grep). | Drop them from the re-export list (or have callers import upstream directly and keep only `stageListener` here). | None |
| 2 | 16 | C3 | Inline SHA-256 over `unzip -p` output. | Shared hash helper. | None |
| 3 | 15-16 | — | Two `unzip` spawns per entry read; fine for the few entries upstream asks for. | Keep. | — |

## Proposed end state
`stageListener` only (~14 lines); callers import the check functions from upstream.
