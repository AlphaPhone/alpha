# scripts/upstream-native-source.ts
- Lines: 68 | Kind: script module (reads files of the pinned `vendor/eliza` commit through `git ls-tree`/`cat-file --batch` and checks the working tree matches) | Verdict: KEEP, light SIMPLIFY
- Covers: every build step that copies upstream native/client-feature sources reads exactly the pinned bytes and refuses a dirty or drifted checkout. Duplicates: `sha` (line 5) is a C3 twin (exported and re-imported as `hash` by `prepare-client-features.ts:2`); upstream-lock reading duplicated ~30× (research). Callers/importers: `aosp-listener-systemui.ts`, `build-pinned-voice.ts`, `native-google-host-artifact.ts`, `prepare-client-features.ts`, `prepare-patched-native.ts`, `test-maps-device-navigation.ts`, `ci/calendar-bridge.py` (comment/path), `quint-lib.ts`, `source-snapshot.ts`, 30+ Quint refinement harnesses (`specs/quint/refinement/native/*.mjs`, `application/os-*.mjs`, `services/*.mjs`), 15 tests (incl. `upstream-native-source.test.mjs`, `fixtures/native-source.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5 | C3 | `sha` exported from here and used by 3 other modules as a general hash. | `scripts/lib/hash.ts`; keep a re-export only if refinement harnesses import it from here (check and update them instead). | Low |
| 2 | 34–35 | C3 | Reads and validates `upstream.lock.json` inline. | `scripts/lib/pin.ts readUpstreamPin()`. | Low |
| 3 | 37 | C3 | Local `git()` wrapper (17 twins). | `scripts/lib/git.ts`. | Low |
| 4 | 14–32 | B3 | `parseNativeBlobBatch` validates git's own `cat-file --batch` framing byte by byte (header ≤100 bytes, ASCII-only, size bounds). The trust boundary is a local git binary on our own repo. | Keep the identity/size/terminator checks (they catch a mis-parse); drop the ASCII-only and header-length checks. | Low |
| 5 | 59–62 | — | Reads every blob from git **and** the same file from the working tree and compares bytes, plus walks each path for symlinks; `git status --porcelain` (line 39) already refuses a dirty tree. The extra read catches skip-worktree/assume-unchanged tricks. | Keep (cheap relative to builds) but note it doubles I/O on large prefixes. | — |
| 6 | 40–66 | D8 | Nested `read` closure inside the factory. | Fine as is; optional extraction. | None |

## Proposed end state
Same reader, ~55 lines, using shared `hash`, `git` and `pin` helpers. It is the model for "import upstream through the pin"; other ad-hoc upstream readers should converge on it (C7 "three ways of importing upstream code").
