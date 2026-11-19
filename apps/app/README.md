# @repo/app

Hello world: a page that greets a name, typed or carried by a link, says hello and counts the greetings. It is small
on purpose, and it uses one of each thing Vibestack offers, so that every stage of `pnpm check` has something to
check. Start a new application by replacing it.

Its requirements are [`spec/app/`](../../spec/app/index.md), in the one spec tree at the repository root.
`pnpm check` there generates `gen/app.ts`, `gen/app.effect.vibe` and `gen/app.react.ts` here, one module per spec it
imports beside them, and checks this package's types, proofs, tests and traces (SPEC.md, "One spec tree").

| Piece | Shows | Checked by |
|---|---|---|
| `spec/app/index.md` | a story; a state, `initial`, a guarded transition that returns `{ state, out }`, a sender `by`, `nameValues`, an `always`, two `step` rules (one on `out`), a `sometimes` rule, a law, and `refinesT` | `model`, `always`, `sometimes`, `replay`, `proof` |
| `spec/app/tally.md` | a machine imported under a name (`T`), which the greeter refines | `always`, `proof` |
| `spec/app/words.md` | a library imported with `.*`: the effect the greeter outputs | `model`, `proof` |
| `spec/app/echo.md`, `echo.proof.dfy` | a model no shell runs: `std/net` imported, a `Secret` type and its `declassify`, an opaque `const` and its law, `weight_`, `iValues`, a `leadsTo` rule with its `fair_` events, and a proof file for what Dafny cannot see alone | `model`, `always`, `sometimes`, `replay`, `proof` |
| `src/greeter.vibe` | the VibeLang shell: the generated `stored("greeter")` layer, and the sender of each input from where the page read it | `types`, `traces`, `tests` |
| `src/link.ts`, `link.contract.ts` | a link that greets a name, and the contract that it carries any name back | the property test `pnpm test` derives from the contract |
| `src/greeting.ts`, `greeting.proof.dfy` | hand-written verified logic: a `//@` contract and the lemma that proves it | `proof`, `review` |
| `src/App.tsx` | React over the generated `useMachine`: Greet is offered exactly when `can` allows it, each `out` is said to a screen reader, on `@repo/ui` and the design tokens | `types`, lint, `test:browser` |
| `test/drivers/app.ts` | the conformance driver: the shell against the spec, its store and its effects, by journeys, malformed inputs and random walks | `traces` |
| `test/traces/app.jsonl` | a trace recorded from the shell, replayed against the spec | `traces` |
| `test/app.test.vibe` | the journey the driver cannot see: the greeter read back from its store, and a store that holds no greeter | `tests` |
| `test/app.browser.test.tsx` | what only a browser shows: a link opened twice, focus after greeting, and a full localStorage | `pnpm test:browser` |

| Command | Does |
|---|---|
| `pnpm dev` | the app, with Vite |
| `pnpm typecheck`, `pnpm build` | `vibelang --noEmit`; `vite build` to `dist/` |
| `pnpm test`, `pnpm test:browser` | the tests in Node, with the derived property tests; the browser tests in Chromium |

## eliza's agent and cloud

Alpha's resident agent and its cloud are eliza's (`elizaOS/eliza`, branch `vibestack`), pinned in
[`eliza.lock.json`](../../eliza.lock.json). They run as their own Node 26 processes from a checkout outside the
repository, built once per pinned commit and shared by every worktree; the page imports only eliza's agent client and
its reply types (`src/platform/agent.vibe`), through `.eliza`, a link to that checkout.

| Command | Does |
|---|---|
| `pnpm eliza` | once after cloning, and after the pin moves: clones eliza at the pin into `~/.cache/alpha/eliza-vibestack/<commit>` (`ALPHA_ELIZA_DIR` names another place, `ALPHA_ELIZA_SOURCE` a local clone to copy), installs it, builds core, the agent, the agent's device bundle and the cloud Worker, and links `.eliza` |
| `pnpm dev` | the page over a local eliza cloud and agent: one signed-in, funded owner, a scripted model, state kept in `.cache/eliza` |
| `ALPHA_FAKES=1 pnpm dev` | the page over the journeys' fakes, with no eliza: what the explore stage serves |
| `pnpm test` | the journeys; `test/*.eliza.test.tsx` start the real cloud and agent on free ports over their own state (`test/eliza/services.ts`) |
| `pnpm eliza:page` | `pnpm dev` and one conversation through the page in Chromium |
