# test/voice-in-chat-only.test.mjs
- Lines: 82 | Kind: source-text + transplant (regex on `runtime/voice-entry-policy.ts`, `prototype/template.html`, `development-system-surfaces.html`, `development-rail.html`, `template-source.ts`, `main.tsx`, `always-on-listener.ts`, `settings-adapter.ts`, both `AndroidManifest.xml`; extracts `pDown`/`startVoice` from `prototype/model.js` by regex and runs them in `vm`; slices `stopWakeListenerForChatOnly` out of `always-on-listener.ts` between `export async function stopWakeListenerForChatOnly()` and `\n}\n`; scans every Java file for class names) | Verdict: DELETE
- Covers: with external voice invocation off (D7: planned, dormant), holding the side key never opens the mic, chat mic still works, talk buttons stay behind the gate, startup asks the native listener to turn off and records uncertainty, and no enabled component opens the disabled assistant entries. Duplicates: `scripts/apk.ts:145-169` (verify-apks rejects an enabled Quick Settings tile while `AlphaAssistActivity` is disabled; checked on the built APK), `test/browser/listener-invocation.production.spec.ts:104` (startup calls `turnOff` on the flag-off Android fixture), `test/always-on-listener.test.mjs`. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-37 | T1/T2 | Twelve regexes over product sources plus a `vm` run of a callback cut out of `model.js`; asserts `externalVoiceInvocationEnabled = false` (a constant). | Delete. | Low |
| 2 | 40-66 | T2 | `stopWakeListenerForChatOnly` sliced and evaluated with 10 fake globals. | Delete; `listener-invocation.production.spec.ts` drives the same startup through the page. | Low |
| 3 | 68-82 | T1 | Merges both manifests by regex and greps Java for class names to find "openers". The release rule (tile disabled while the assistant entry is disabled) is already enforced on the built APK in `scripts/apk.ts`. | Delete; if the rule should cover any other opener, extend `validateApk` and add a row to `verify-apks.test.mjs`. | Low |

## Proposed end state
File deleted. The dormant-entry rule lives in the APK audit (`scripts/apk.ts`), the startup `turnOff` in
`journeys/startup-permissions.spec.ts` (from `listener-invocation.production.spec.ts`).
