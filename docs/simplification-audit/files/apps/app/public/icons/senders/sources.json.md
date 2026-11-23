# apps/app/public/icons/senders/sources.json
- Lines: 108 | Role: hand-kept provenance record for the 14 bundled sender favicons (`/icons/senders/<domain>.png`): source URL (Google s2 favicon service), retrieval date, sha256 and byte size per file. | Verdict: SIMPLIFY (data only)
- Importers: none. git grep `sources.json` / `icons/senders`: product reads only the PNGs, via `apps/app/src/runtime/mail-sender-image.ts:10-11` (hard-coded domain list) and `apps/app/src/runtime/connection-ui.css:90` (`google.com.png`); `test/mail-sender-image.test.mjs:5-6` asserts two PNG paths. No test, script or manifest reads this JSON. Verified now: all 14 `sha256` and `bytes` values match the files on disk.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-15 | A7 / A8 | Failed-fetch entry with no asset: `{ "domain": "assetdash.com", "error": "HTTPError" }`. No `assetdash.com.png` exists and `mail-sender-image.ts` does not list the domain. | Delete the entry (4 lines). | None. |
| 2 | 5-106 | C6 | The 14-domain list is duplicated, in a different order, as the literal array in `mail-sender-image.ts:10` (`['turbotax.intuit.com','linkedin.com',…,'openai.com']`). Adding an icon requires editing both by hand; nothing checks they agree. | Keep the TS array as the single runtime source (the renderer must not fetch this JSON). Either accept the twin (provenance file, not code) or have the existing `test/mail-sender-image.test.mjs` iterate the PNG directory instead of a JSON read. Do not add a new test only for this. | Low. |
| 3 | whole file | B5 | Provenance file read by no tool. | Keep as third-party asset provenance (the favicons are third-party marks; the `purpose` line documents they are decorative, never identity proof). Owner may instead move this record into `apps/app/public/licenses/` notices. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| sender-icon domain list | const (data) | 5-106 | `apps/app/src/runtime/mail-sender-image.ts:10` brand array | `mail-sender-image.ts` stays the runtime source |

## Proposed end state
104 lines: the `assetdash.com` error entry removed; everything else unchanged (hashes are correct).

## Verification
`node --test test/mail-sender-image.test.mjs`; nothing reads the JSON, so the edit cannot break a check.
