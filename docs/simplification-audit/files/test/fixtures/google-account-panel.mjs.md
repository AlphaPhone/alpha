# test/fixtures/google-account-panel.mjs
- Lines: 71 | Kind: transplant (esbuild-transforms `google-connection-ui.tsx` and runs it in vm under jsdom + real React, with 13 module specifiers mapped to fakes; optional source injection at `' async function load(){'`) | Verdict: DELETE as a test fixture; Quint harnesses PORT
- Covers: Google accounts panel in Settings: list/connect/disconnect, Calendar edits and Gmail change toggles with guarded save, consent return on visibility, Cloud account switch aborting in-flight calls. Duplicates: Google connect Playwright specs (`post-sign-in-setup`, `own-provider` pairs in research). Callers/importers: `test/google-calendar-connect.test.mjs` (research: delete, C), live Quint `google-calendar-access-choice.mjs`, `google-consent-admission.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 21-39 | T3/T10 | `require` map keyed by 13 relative specifiers (`'./cloud-protocol'`, `'./google-accounts'`, `'./connection-ui'`, ...); unknown imports throw, so each new import breaks the fixture. | PORT: the panel takes its account/access ports as props or a context; harness renders it with fakes. | High |
| 2 | 41-46 | T10/D7 | Injects `window.quintGoogleConsent` into product source at `' async function load(){'` (present once). | Expose state through the rendered DOM or a dev-only hook. | Medium |
| 3 | 24-25 | A8/A3 | Comments "answers like Codex's proposed host, 'missing' like today's host" and fake `browserCloudResidentEnabled`/`browserResidentCall` (browser Cloud resident stage); line 37 "Like 3800a178e's google-agent-access" is a commit-hash tombstone. Check whether the browser Cloud resident path is D5 dead code. | Drop tombstones; drop the `host` option if browser-cloud-resident is deleted. | Low |
| 4 | 13-14, 67 | - | Overwrites `globalThis.window/document/HTMLElement` and restores on close. | fine in a harness | - |
| 5 | 52-59 | T8 | `tick` = 5 ms timeout, `until` loops 100 `act()`s. | `waitFor`. | Low |

## Proposed end state
Delete with the host test. `journeys/settings.spec.ts` (or `connection-cloud.spec.ts`) on the test-mocks Cloud: connect Google, toggle Calendar edits (guarded save failure shows the refusal), disconnect, Cloud account switch drops the panel's in-flight request. The two Quint drivers render the real panel through the shared loader with injected ports.
