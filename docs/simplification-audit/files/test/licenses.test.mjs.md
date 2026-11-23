# test/licenses.test.mjs
- Lines: 247 | Kind: tooling/integration (imports `scripts/generate-licenses.ts`, `scripts/licence-policy.ts`, `scripts/release-blockers.ts`; runs `generate(ROOT)` over the real `node_modules` and `licenses/`, and `collectNotices` over temp roots that symlink the repo) | Verdict: KEEP, SIMPLIFY, MERGE into `test/tooling/apk-verify-audit.test.ts` (with `test/runtime-licenses.test.mjs`)
- Covers: third-party notice generation (policy P-09): every entry has licence/source/text/flags, copyleft/unknown/unverified entries are flagged not fatal, canonical SPDX text supplied when a package ships none, OCR core pins enforced, broken manifests are errors, flags never become release blockers, eSpeak GPL text present, removed speech runtimes absent. Duplicates: `test/runtime-licenses.test.mjs` (301 lines, packaged-runtime notices) shares the generator; test 8 (removed runtimes) overlaps `test/llama-cpp-only.test.mjs` tests 1-3. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12 | T8 | `generate(ROOT)` at module load walks all of `node_modules`; `collectNotices` runs 7 more times over symlinked copies. Notable runtime (seconds to tens of seconds) and runs for every `npm test`. | Keep (it is the real input), but put the file in a tooling lane that runs only when `package-lock.json`, `licenses/**`, `scripts/generate-licenses.ts`/`licence-policy.ts` change. | Low |
| 2 | 31-58 | T1-like, B5 | Pins today's flagged inventory by package name (`pdf.js standard fonts: Liberation`, `mediabunny`, `tr46`, `Denton typeface`) and exact rendered text lines; any dependency bump breaks it. | Keep one structural check (header lists every flagged entry under each of its flags); drop the named-package pins and the verbatim text regexes. | Low |
| 3 | 60-90 | T3 (accepted) | `classifyLicence` expression table and obligation wording. Pure function, but it is the release licence policy. | Keep the expression table; drop the long obligation-text regexes except one per flag kind. | Low |
| 4 | 219-224 | T4 | Removed speech runtimes absent from notices; same rule as `llama-cpp-only.test.mjs`. | Keep here (notices are build output); delete the repo-wide path scan in llama-cpp-only. | Low |
| 5 | 225-230 | T1-like | eSpeak GPL text present: a named-package pin, but it is a legal obligation for a shipped component. | Keep. | Low |
| 6 | 232-247 | C3 | `scratchRoot` symlink helper; `runtime-licenses.test.mjs` likely has a twin. | One fixture helper in the merged file. | Low |

## Proposed end state
`test/tooling/apk-verify-audit.test.ts` "licences" block: completeness of generated notices, policy expression table,
canonical-text fallback cases, OCR pin refusal, broken-input errors, flags never block release, eSpeak text present,
removed runtimes absent. No named-package inventory pins. Run only in the licences/release-tooling lane.
