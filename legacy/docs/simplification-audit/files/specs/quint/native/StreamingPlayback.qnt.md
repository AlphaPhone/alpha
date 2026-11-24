# specs/quint/native/StreamingPlayback.qnt
- Lines: 127 | Kind: Quint model (live, `native/manifest.json`) | Verdict: KEEP (upstream lane only)
- Covers: one `StreamingSpeechPlayback` writer: bounded queue, partial/zero writes, drain before `ended`, a single terminal callback, audible-timestamp evidence. Duplicates: none in Quint. `test/speech-output-warmup.test.mjs` covers the warmup holder, not this writer. Callers/importers: `quint:check` (manifest), `refinement/native/index.mjs:80` (`PlaybackTraces.java` extra group, aggregate `test/quint-native-refinement.test.mjs`), baseline obligation `index.mjs:240`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest `sources` | P6 / §2.9 upstream modelled in consumer | Every source is `vendor/eliza/**` plus `android/upstream-native-sources.json`. There is no Alpha code in this model. It can only change when `upstream.lock.json` moves, yet it runs on every verify. | Put it (and its `PlaybackTraces.java` group) in an "upstream pin" lane that runs on `upstream.lock.json` / `android/upstream-native-sources.json` changes only. Moving it upstream is an owner/D14 follow-up. | Low |
| 2 | harness | T10 (mild) | `PlaybackTraces.java` reads private fields via `Trace.read(player, "started")` / `"terminal"`, so an upstream field rename breaks the harness. Otherwise it compiles and runs the real class (javac technique, robust). | Ask upstream for a read-only accessor, or accept; no local change. | Low |
| 3 | manifest `abstractions[3]` | B5 | Manifest `abstractions` text names `test/speech-output-warmup.test.mjs`; if that test is deleted in the test cleanup the reference goes stale. | Update the abstraction sentence when the warmup test moves. | Low |
| 4 | 20-110 | – | Model is compact and every action is reached by `step`; scenarios are meaningful. No simplification needed. | None. | – |

## Proposed end state
Unchanged model text. Manifest entry and its Java trace group tagged as upstream-only so the CI path matrix runs
them only when the upstream pin or the native-source catalog changes. Owner question: move model + harness to
`vendor/eliza` upstream (follow-up, not here).
