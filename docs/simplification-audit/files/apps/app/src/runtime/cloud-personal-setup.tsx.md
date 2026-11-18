# apps/app/src/runtime/cloud-personal-setup.tsx
- Lines: 14 (3.4 KB; line 13 is 1,573 chars) | Role: `CloudPersonalSetup` review/pending/ready card for Dedicated hosting of the retired personal Cloud agent, plus a re-export of the intent functions. | Verdict: DELETE (A3, with `cloud-personal-protocol.ts`)
- Importers: `connection-ui.tsx:46` (renders at 4063 only when `snapshot.cloudPersonal`, set only via the test-mocks `hosted` path), `browser/development-cloud-ui.tsx:3`.
  Text/path pins: `test/white-label-copy.test.mjs:35` (esbuild-bundles this file to check copy), `test/support/feature-parity.mjs:486`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-14 | A3 | Product build never sets `cloudPersonal`; the component and all its copy ("Start your Dedicated agent", pricing lines) serve the retired hosted agent. | Delete; remove the JSX at `connection-ui.tsx:4062-4063`, the import in `browser/development-cloud-ui.tsx`, and the block in `test/white-label-copy.test.mjs:35`. | Medium (owner sign-off). |
| 2 | 4 | D4 | `export {personalIntent,savePersonalIntent,clearPersonalIntent} from './cloud-personal-intent'` — pass-through re-export. | Goes with #1. | — |
| 3 | 13 | D8 / D9 | 1,573-char JSX line with nested ternaries. | Goes with #1. | — |
| 4 | 5 | C3 | `money` USD formatter; twin of membership `credits` formatting in `cloud-membership-ui.tsx:57`. | Goes with #1. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `PersonalSetupState` | interface | 3 | — | delete |
| `money` | helper | 5 | `cloud-membership-ui.tsx:57` inline `toLocaleString` USD | delete |

## Proposed end state
Deleted (14 lines).

## Verification
Typecheck; `test/white-label-copy.test.mjs` after edit; `npm run verify`.
