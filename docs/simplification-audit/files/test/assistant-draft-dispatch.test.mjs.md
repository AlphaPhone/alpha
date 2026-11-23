# test/assistant-draft-dispatch.test.mjs
- Lines: 207 | Kind: mixed: source-text (2 cases), transplant (1 case), unit tests of the upstream `DurableDraftController` loaded by stripping `.eliza/client-features/.../durable-draft-controller.ts` and `durable-draft.ts` into data URLs (about 20 cases) | Verdict: DELETE
- Covers: the composer's durable draft keeps unsent text through a send, a refusal, a connection change, a restart during a send, and races between typing, restore and commit. Duplicates: `test/browser/assistant-draft-recovery.spec.ts`, `assistant-draft-review.spec.ts`, `assistant-draft-storage.spec.ts`, `composer-dispatch.spec.ts`, `composer-send-focus.spec.ts`; the controller itself is upstream code (`.eliza` is generated from `vendor/eliza`). Callers/importers: `npm test`; imports `test/support/strip-types.mjs` and `test/support/attachment-restoration.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-9 | T1 | Regex-matches `assistant-draft-controller.ts`, a one-line re-export that is itself a D4 shim. | Delete. | — |
| 2 | 12-65 | T2 | Slices `agent-adapter.ts` between `this.connectionUnsubscribe = connectionController.subscribe(` and `// Canonical is the default;`, then runs it with `new Function` and nine fake ports. | Delete. Carry "a connection change never opens the new owner's draft over the old owner's text" into `journeys/chat.spec.ts`. | Med |
| 3 | 102-105 | T1 | `alphaComposer` slices one line of `agent-adapter.ts` and regex-matches `{notSent:''}`. | Delete. Carry "a refused send puts the text back with no notice line, and the next Send sends it once" into `journeys/chat.spec.ts`. | Low |
| 4 | 5-6, 66-207 | T5, T3 | About 20 cases unit-test the upstream controller with fake stores. These belong in `vendor/eliza` (D14: list as an upstream follow-up, do not edit the vendor checkout). | Delete here. Carry two journeys: "restart during a send offers the message for review, not as a draft" and "typing during a send is kept after a failed dispatch". | Med |
| 5 | 2 | — | `test/support/attachment-restoration.mjs` importers: this file and `test/notes-owner-retirement.test.mjs`. It survives only while the second one exists. | Check with that file's reviewer. | — |

## Proposed end state
File deleted. Four journey cases in `journeys/chat.spec.ts` (draft per owner on account switch, refused send restores text silently, restart during a send asks for review, typing during a failed send is kept), on the shared Playwright harness. Controller unit coverage is an upstream follow-up.
