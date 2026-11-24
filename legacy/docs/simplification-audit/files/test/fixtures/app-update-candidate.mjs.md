# test/fixtures/app-update-candidate.mjs
- Lines: 103 | Kind: fixture (tooling: real git repo + synthetic GitHub API/archives for `scripts/app-update-candidate.ts`) | Verdict: KEEP (move with the release-tooling tests)
- Covers: builds a disposable repo, a synthetic release/assets API, manifest reader and a distribution archive (configuration, native-input admission, inputs before/after, apk manifest/verification) so the candidate selector can be run for real. Duplicates: none. Callers/importers: `test/app-update-candidate.test.mjs`, `specs/quint/refinement/services/app-update-candidate.mjs:6,19,23` (live; registered in `services/index.mjs` and `specs/quint/services/manifest.json`), transitively `protected-app-update-promotion.mjs` and `test/quint-app-update-candidate.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9 | C3 | Local `hash` sha256 helper (one of ~40 in scripts/tests). | Import the shared `scripts/lib` hash once it exists. | none |
| 2 | 16-17 | C3 | Local `git()` + `commit()` wrapper; `test/fixtures/git-fixture.mjs` already provides a hermetic `git` (ignores global config, gpgsign, hooks). This one does not set `GIT_CONFIG_GLOBAL=/dev/null`, so a developer's signing/hook config can break it. | Use `git-fixture.mjs`'s `git`. | Low; fixes a latent local flake. |
| 3 | 12, 38-58 | A1? | `legacyManifestUrl` / `LEGACY_APP_UPDATE_TAG` (`app-stable`): pre-rename release tag read for version-code continuity. This is release numbering, not app data, so it is like D17 (devices/images), not D1. | Owner question; keep until answered. | Medium if deleted wrongly: version codes could regress. |
| 4 | 79-80 | B5 | Writes `inputs-before/after.json` evidence because the product script demands it. | Goes away only if `app-update-candidate.ts` drops the receipt check. | - |

## Proposed end state
Keep under the release-tooling tests (e.g. `test/tooling/release/`). Use `git-fixture.mjs` and the shared hash. When the Quint services harness stops importing from `test/fixtures`, it imports this from its new home; nothing else changes.
