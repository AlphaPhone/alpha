# Chunk specs-15: legacy Quint campaigns (files-browser, google-connect, home-layout)

| File | Kind | Verdict | Target / carry |
|---|---|---|---|
| `specs/quint/legacy/files-browser/README.md` | narrative doc | DELETE | — |
| `specs/quint/legacy/files-browser/check-files-browser-refinement.mjs` | historical refinement harness (Vite + Chromium, hashes sources, expected mismatches) | DELETE | carry 2–3 cases to `journeys/files.spec.ts` |
| `specs/quint/legacy/google-connect/check-google-connect-refinement.mjs` | historical refinement harness | DELETE | none (covered by `gmail-grant-recovery`, `one-calendar`, `gmail-mvp-scope` specs) |
| `specs/quint/legacy/home-layout/README.md` | narrative doc | DELETE | — |
| `specs/quint/legacy/home-layout/check-home-layout-refinement.mjs` | historical refinement harness | DELETE | carry 2 cases to `journeys/home-shell.spec.ts` |

All three harnesses compare today's mounted UI with design profiles from source `ef9fbf7cd7`. None is PORT: they do
not slice product text, they mount the real UI, but their output is a trace against a superseded model and most of it
is `assert.rejects(/Source\/model trace mismatch/)`, i.e. they pass only while the code differs from history. They
also hash every file under `apps/app/src` and `.eliza/client-features` and pin 5–8 watched product paths, which breaks
on the stage F file moves. All watched product files still exist today; none of the three covers a feature deleted by
DECISIONS — they are deleted under D11 (retire `specs/quint/legacy`), not D1–D5.

Callers: each harness is imported by `specs/quint/refinement/legacy/index.mjs` (lines 3–5) and by one
`test/quint-legacy-<name>-refinement.test.mjs`. Delete together with `legacy/{FilesBrowser,GoogleConnect,HomeLayout}.qnt`,
`test/fixtures/quint/{FilesBrowser,HomeLayout}Comparison.qnt`, the three test wrappers, their manifest entries and
their `index.mjs` entries.

## Behaviours that would lose all coverage
1. Files: an external removal (another writer trashes and empties) drops the mounted selection and disables Delete
   (`check-files-browser-refinement.mjs:278-304`). Not found in any `test/browser/files-*.spec.ts`.
2. Files: a reviewed move is refused after a same-path rewrite and a fresh review succeeds (`:236-276`). Partly in
   `dev-connection-actions.spec.ts:45` and `test/files-reviewed-proposal.test.mjs` (the latter is a likely T3 delete);
   carry into `journeys/files.spec.ts` driven from the visible proposal.
3. Home: late native-inset arrival (`DailyApps.surfaceInfo` delayed) re-lays out the app grid
   (`check-home-layout-refinement.mjs:228-236`). No spec delays insets.
4. Home: Home reads no mail body, sends no mail, runs no digest (`:327-332`). Explicit zero-body-read assertion not
   found in `home-inbox.spec.ts`.
Lower-confidence: restore-to-original-folder (Files), focused-composer keyboard dock (Home, check
`home-chat-anchor.spec.ts`), preview identity retiring on Back (Files).

## Shared helpers worth keeping
None defined here. Imported helpers all keep other importers: `test/browser/flag-off-android.ts`,
`test/browser/resident-stub.ts`, `test/browser/helpers/{page-modules,one-calendar,home-calendar}.ts`,
`specs/quint/refinement/check-traces.mjs`, `scripts/quint-lib.ts`, `scripts/prepare-client-features.ts`.

## Cross-file actions
- The `attachFixture` init-script collector (`home-layout:27-114`) is a copy of `chat-input:86-109`; both go with the
  legacy tree; the journey harness must own these Capacitor fakes once.
- The `mounted()` Vite+hash+watched-file block is copy-pasted across every legacy UI harness (C5); deleting the tree
  removes all copies.
- Deleting these lowers the `legacy` floor in `test/quint-checker.test.mjs:32`; `quint-model-check.yml:50` compare list
  names `HomeLayout`.

## Owner questions
- None blocking. Confirm the four "lose all coverage" behaviours are wanted as journey cases before the legacy tree goes.
