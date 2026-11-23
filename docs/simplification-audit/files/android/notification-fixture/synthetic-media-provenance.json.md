# android/notification-fixture/synthetic-media-provenance.json
- Lines: 9 | Role: provenance note (ffmpeg command, sha256) for `src/main/assets/synthetic-blue.mp4` used by `MediaFixtureActivity` | Verdict: DELETE
- Importers: none (grep `synthetic-media-provenance`: 0 hits outside docs/simplification-audit; `synthetic-blue` only in this file and `MediaFixtureActivity.java:40`). Text/path pins: none.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-9 | B5 / A7 | `"generation": "ffmpeg -f lavfi -i color=c=blue…"`, `"sha256": "a6d4…"` — provenance file nothing reads or checks. | Delete. If the asset stays, move the one-line generation command into a comment in `MediaFixtureActivity` (or the asset README). Deleted anyway if MediaFixtureActivity goes. | None |

## Local types and helpers
None.

## Proposed end state
Gone (0 lines).

## Verification
`git grep synthetic-media-provenance` returns nothing; `npm run verify`.
