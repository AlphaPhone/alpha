# specs/quint/native/CanonicalNotificationTap.qnt
- Lines: 152 | Kind: Quint model (live) | Verdict: KEEP model; PORT harness (extracted methods → compile whole class with ports)
- Covers: a canonical notification tap is captured natively, opened only by the current authorized actor for the verified owner, published as one tokenized delivery (chat or notes; unsupported routes dropped), read back only while foreground and unexpired, and cleared exactly once by a matching acknowledgement; a lost reply never restores a consumed token. Duplicates: Android instrumentation around notifications is separate; no other Quint model covers this token. Callers/importers: `quint:check` (6 runs, `bounds` in manifest); `specs/quint/refinement/native/canonical-notification-tap.mjs` + `canonical-tap-platform.mjs` + `CanonicalTapTraces.java`, run from `refinement/native/index.mjs:194`; prose `refinement/native/canonical-notification-tap.md`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness `canonical-tap-platform.mjs:4-6,31,60` | T10 | The harness rebuilds Java from text: `member(source, first, last)` slices between literal markers, `actor.slice(actor.indexOf(' static void captureTap('), actor.lastIndexOf('}'))` cuts `AlphaCanonicalNotifications.java`, and upstream `NativeNotificationRoute.java` is re-packaged by regex (`/^package ai\.elizaos\.app;$/m` → `ai.alphacompute.alphaphone`). `AlphaNotificationsPlugin.java` bridge methods are also extracted. | PORT: compile `AlphaCanonicalNotifications.java` and `AlphaNotificationsPlugin.java` whole in package `ai.alphacompute.alphaphone` with test ports (the `MainActivityPorts.java`/`java.mjs` approach used by `HomeInstanceHandoff`); keep upstream `ForegroundNoticeGate`/`NativeNotificationRoute` compiled from the pinned upstream source as they are, without repackaging (add the upstream package to the javac source path). | Medium: may need small product seams (package-private constructors) in the two Alpha classes. |
| 2 | 1 | A8 (missing) | No header comment, unlike every sibling. | Add one line: what the model is (canonical tap → tokenized delivery → single acknowledgement). | None |
| 3 | 40 | — | `rejectIngress = s' = s` is a named no-op used to document that unverified ingress changes nothing; it is in `step` only. | Keep or drop; no scenario uses it. Prefer drop. | None |
| 4 | 108-125 | D8 | `step` is `any { nondet …; attach(…), nondet …; capture(…), … }` with nondets interleaved between alternatives; legal but hard to read. | Hoist the nondets above `any`. | None |
| 5 | 103-106 | — | `safety` mixes three real invariants with range/type bounds (`captures.in(0.to(4))` …). | Split `TypeOK` from `safety` (style used by siblings). | None |

## Proposed end state
Model unchanged apart from a header, hoisted nondets and a `TypeOK` split. The harness compiles the two Alpha classes
whole with ports and the pinned upstream gate/route untouched; no marker slicing or package rewriting. Same 6
scenarios and the existing ITF campaign.
