# scripts/test-canonical-notification-navigation.ts
- Lines: 161 | Kind: source transplant (strips imports/exports from `prototype/notifications-adapter.ts`, runs it in `vm` with ~25 stub globals) + source slicing of `main.tsx` install lines and `shade.ts` + a regex-cut `const exactChat=` evaluated alone | Verdict: DELETE; REWRITE kept cases into `test/browser/journeys/notifications.spec.ts`
- Covers: tapping an Android notification opens the right view or restored message for the current owner, acknowledges the tap token once, never interrupts a draft, typing or recording, and a retired mount cannot publish. Duplicates: `test/canonical-notification-security.test.mjs` (owner/token rules). Callers/importers: `test/canonical-notification-navigation.test.mjs` (execFileSync shim).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-17 | T1/T2 | Greps `main.tsx` for two `install...(Component)` lines (asserts exactly 2) and evals them with `shade.ts`. | Delete; production gating belongs in `audit-production-bundle` or a production-project journey. | L |
| 2 | 90-92 | T2 | Regex `const exactChat=\(\)=>[^;]+;` cut from product source and evaluated. | Delete. | L |
| 3 | 6, 64-69 | T2 | Whole adapter transplanted with fake `Component`, `connectionController`, `registerPlugin`. | Delete. | L |
| 4 | 81-160 | D8 | 20 scenario blocks of one-line statement soup. | Journey cases below. | L |

## Proposed end state
`journeys/notifications.spec.ts` (chromium, Android platform flag in the harness, typed `AlphaNotifications.canonicalPending/acknowledgeCanonical` fake): (a) message tap opens the restored conversation and acknowledges; (b) foreign owner tap ignored; (c) tap with a draft open does nothing and keeps the draft; (d) `clock`/`reminders` route opens Calendar; (e) a newer token while the first is loading is the one acknowledged. Script and shim deleted.
