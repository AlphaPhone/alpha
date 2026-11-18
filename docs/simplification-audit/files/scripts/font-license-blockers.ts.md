# scripts/font-license-blockers.ts
- Lines: 150 | Kind: release tooling (proprietary-font licence check of a built web payload) | Verdict: KEEP, SIMPLIFY
- Covers: sorts every proprietary font in `web-dist` or an APK's `assets/public` into "resolved by owner statement" or "unresolved", by file hash and by the payload's own notices; prints LICENCE FLAG or RELEASE BLOCKER lines. Duplicates: font metadata and hashing also happen in `scripts/generate-licenses.ts` (`fontEntries`) and `scripts/generate-sbom.ts` (`fontComponents`), but on source fonts, not on a built payload. Callers/importers: `scripts/audit-production-bundle.ts` (`fontLicenceLine`), `scripts/verify-apks.ts` (`fontLicenceCheck`, `fontLicenceLine`), `test/font-license.test.mjs`, `test/pilot-units.test.mjs`; `licenses/unverified-allowlist.json` names it in text.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 129-132 | A7 | `fontLicenseBlockers` ("in the shape callers have always used") has no caller except `test/font-license.test.mjs`. | Delete it and the test cases that only call it. | L |
| 2 | 38,57,65,36-37 | A7 | `FONT_BLOCKER_REFERENCE` has no importer; `readUnverifiedFontHashes`, `readOwnerStatedFontHashes`, `FONT_HELD_FLAG`, `RESOLVED_BY_OWNER_STATEMENT` are exported only for the test. | Unexport `FONT_BLOCKER_REFERENCE`; keep the others only if the release-tooling test still needs them. | L |
| 3 | 12-13, 104 | A1 | Unresolved also when a typeface notice's `license === UNVERIFIED` ("the earlier 'license unverified' marking"). `generate-licenses.ts:fontEntries` never writes `UNVERIFIED` for a typeface any more (only `NO_FONT_LICENCE`, `COMMERCIAL_FONT` or `OFL-1.1`), and the payloads checked are built from the same commit. | Delete the `UNVERIFIED` branch and its doc sentence. | M (an old APK checked with a new script would lose one signal; nothing does that) |
| 4 | 100 | B1 | `try { notices = JSON.parse(...) } catch {}` swallows every error. The comment states the intended fallback (no notices file: judge by bytes), which is specified behaviour, but a malformed file is swallowed too. | Catch only `ENOENT`; let a malformed notices file throw. | M |
| 5 | 59,67 | B1 | `if (!fs.existsSync(file)) return []` for the two committed licence records; both files are committed and required by `generate-licenses.ts`. | Read unconditionally. | L |
| 6 | 90 | C3 | Inline `createHash('sha256')...digest('hex')`. | Use the shared `scripts/lib/hash.ts` sha256 (helpers.md). | L |
| 7 | 139-141 | A8 | JSDoc `@param` block repeats the TypeScript signature. | Delete. | L |
| 8 | 110-111,117 | D8/D9 | Two dense one-line branches with nested loops. | Split into named steps (`resolveHeld`, `resolveUnrecorded`). | L |

## Proposed end state
About 120 lines: `fontLicenceFindings`, `fontLicenceCheck`, `fontLicenceLine` and the two record readers. No test-only exports, no
legacy `UNVERIFIED` typeface branch, one narrow catch for a missing notices file, shared sha256 and file walker (`regular-files.ts`
merges into `scripts/lib/fs.ts`). `test/font-license.test.mjs` stays as the release-tooling test (it builds real payload directories).
