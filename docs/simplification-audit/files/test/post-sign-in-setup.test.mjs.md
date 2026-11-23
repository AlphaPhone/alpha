# test/post-sign-in-setup.test.mjs
- Lines: 227 | Kind: transplant (slices `residentSignedIn`, `signedIn`, `showPostSignInSetup`, `work` out of `connection-ui.tsx` and evals them in `vm` with ~20 fakes) + source-text (`main.tsx` JSX expression, `settings-adapter.ts` Status rows, agent-panel JSX regex) | Verdict: DELETE; carry 4 cases to `journeys/connection-cloud.spec.ts` / `journeys/startup-permissions.spec.ts`
- Covers: after a verified email code, access setup opens as soon as the account is admitted while the agent restarts behind it; refused keys are removed; replaced keys stop the flow. Duplicates: `test/browser/post-sign-in-setup.spec.ts` (5 tests) and `post-sign-in-setup.production.spec.ts` (3 tests) drive the same flow end to end. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-36 | T2 | Marker slices of `connection-ui.tsx` (`'/** The key is stored;'`, `'/** The development hosted-agent client.'`, `'/**\n * A verified sign-in on the resident flow'`) evaluated with a 20-key fake box. Breaks on any comment move; the D1 split of `connection-ui.tsx` will break it. | Delete. | Medium (see #3) |
| 2 | 39-58, 116-124 | T4 | Happy path (setup opens once, agent restarts behind it) is the subject of `post-sign-in-setup.spec.ts:86` and `.production.spec.ts:82`. | Covered; delete. | Low |
| 3 | 81-114, 126-137 | T2 | Refused key removed / outage key kept / replaced key stops sign-in / cancelled admission (P-43). Only covered here. | Carry "refused key is removed and setup never opens" and "a key replaced during admission stops sign-in" into `journeys/connection-cloud.spec.ts` with the Cloud mock answering 401 / swapping the stored key. | Medium |
| 4 | 139-153 | T2 | Slices `work(` to check setup never blinks between busy and starting. | Delete; the browser spec's screenshot/assertions on the setup page cover blinking. | Low |
| 5 | 155-176 | T1 | Regex-extracts the `<StartupPermissions active={...}/>` expression from `main.tsx` and evaluates it with `new Function`. | Delete; carry "background rebind keeps setup visible" to `journeys/startup-permissions.spec.ts` only if the owner wants it. | Low |
| 6 | 178-195 | T1 | Regex-extracts three `const` lines from `settings-adapter.ts` and evaluates them to check the Status page rows. | Delete; one Settings Status assertion in `journeys/settings.spec.ts` (Running / Eliza Cloud). | Low |
| 7 | 197-205 | T1 | Regex over JSX text of the agent panel. | Delete. | Low |
| 8 | 207-227 | T3 | Imports `lateReadyNotice` and upstream `showWalkthroughCompletion` (`.eliza/...permission-walkthrough.ts`); half upstream. | Delete; spec F04 belongs to the startup-permissions journey. | Low |

## Proposed end state
File deleted. The journeys keep: verified code opens setup with the agent restarting (already in the two browser specs);
a Cloud-refused key is removed and setup stays closed; a key replaced during admission stops sign-in without
tearing anything down; Settings Status shows Running/Eliza Cloud. These four need the shared Cloud mock fixture
(`test/browser/support` cloud mock) in the journey harness.
