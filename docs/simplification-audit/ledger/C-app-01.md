# C-app-01 — root identity, HTML entry and public data files

## Done
- `apps/app/public/delegation-return.html` (D9/B4): validation chain reduced to one duplicate-key check
  (`new Set(keys).size!==keys.length`), unknown-key check, state regex, `!code===!error`, code size and description
  rule; dropped the redundant `!state||`, `(…||'')` and four `getAll().length` checks. `keys` and `description` read
  once. Copy, link format, single inline `<script>`, CSP shape unchanged; CSP `script-src` hash recomputed
  (`sha256-CevgHjIAnUlvqpdMwFiAcgDWpaK8xpNTHEQU0yVrPEE=`). 2,014 B -> 1,912 B.
- `apps/app/public/icons/senders/sources.json` (A7/A8): removed the failed-fetch `assetdash.com` entry (no PNG on disk,
  domain not in `mail-sender-image.ts`, file read by nothing).
- `app.config.json`, `apps/app/index.html`, `apps/app/public/icons/lucide/LICENSE.txt`: no in-file findings (KEEP).
- `apps/app/public/icons/lucide/source.json`: no change in this stage (A3 already removed the Wallet icon rows).

## Deleted tests and formal artefacts
- None.

## Pins left broken
- None. `portable.mjs callbackLanding` and `test/quint-conformance.test.mjs` eval the script textContent and pass;
  `specs/quint/application/manifest.json` lists only the path (no digest).

## Skipped
- Delete the CallbackLanding block in `test/quint-conformance.test.mjs`: Open (Q-FORMAL-4).
- `sourceFiles` block in `lucide/source.json`, notices for vendored Lucide 1.18.0, moving `senders/sources.json` out of
  `public/`: Open (Q-BUILD-8).
- Collapsing the 4-line viewport meta in `index.html` and unminifying delegation-return.html: formatter-only (D9
  pass), no standalone change.
- Consumer-side items (new `scripts/lib/app-identity.ts`, 31 readers, package-id literals, three self-asserts,
  dead tablet branch in `scripts/prepare-ci-emulator.ts`): those files are owned by other units; `app.config.json`
  itself stays byte-identical.

## Verification
- Exhaustive old-vs-new comparison in JSDOM (scratchpad `eq.mjs`): 2,250 query combinations (state x code x error x
  error_description x one appended duplicate/unknown key) plus the empty query; message text, link hidden state,
  href and scrubbed URL identical in every case (0 diffs).
- `node scripts/test-cloud-delegation-return.ts` (real headless Chromium, CSP enforced): PASS.
- `node --test --test-name-pattern='delegation return page' test/quint-conformance.test.mjs`: 1 pass, 0 fail.
  Full file run: the BrowserSession test (`quint-conformance.test.mjs:99`, vendor browsing-session module) failed with
  `actual null, expected 0`; unrelated to these files.
- `callbackLanding()` from `specs/quint/refinement/application/portable.mjs` run directly: completed without assertion
  failure.
- `node --test test/mail-sender-image.test.mjs`: 3 pass, 0 fail. sources.json parses as JSON.
- `npx tsc --noEmit`: not run (no TS files owned). No build run.
