# @repo/app

Alpha's page: Home, the built-in apps and Ask Alpha, which Android shows as the launcher. Its requirements are
[`spec/app/`](../../spec/app/index.md), one directory per area; `pnpm check` at the root generates `gen/` here and
checks this package's types, proofs, tests and page (SPEC.md, "One spec tree").

| Piece | Is |
|---|---|
| `src/runtime/` | what every area is built on: `reacting`, `following` and the jobs of `reactor.vibe`; `area` of `area.tsx`; Alpha's time and the attempts' keys |
| `src/platform/` | the world as services: eliza's agent and cloud, the phone's bridge, device and secure store, each with the layer a phone runs and the one a browser runs |
| `src/areas.ts`, `src/resident.vibe` | every screen and where it is drawn; the machines that live from launch |
| `src/shell/`, `src/ask/` | the shell (Home, the trail, Back) and Ask Alpha: the areas to read before writing one |
| `test/sample/`, `spec/app/sample/` | the sample area, which only its own journeys mount: a read, a feed, an undo window, an attempt outside, kept across restarts |
| `test/fakes/` | the world faked once at each boundary: the agent's and the cloud's routes for a browser's fetch, and `phone.ts`, the plugins Android gives the page |
| `test/eliza/` | eliza's real agent and cloud as local processes, for the journeys `*.eliza.test.tsx`, `pnpm dev` and `pnpm eliza:page` |

## eliza's agent and cloud

Alpha's resident agent and its cloud are eliza's (`elizaOS/eliza`, branch `vibestack`), pinned in
[`eliza.lock.json`](../../eliza.lock.json). They run as their own Node 26 processes from a checkout outside the
repository, built once per pinned commit and shared by every worktree; the page imports only eliza's agent client and
its wire types (`src/platform/agent.vibe`), through `.eliza`, a link to that checkout which `pnpm install` makes
where the checkout is built.

| Command | Does |
|---|---|
| `pnpm eliza` | once per pin: clones eliza at the pin into `~/.cache/alpha/eliza-vibestack/<commit>` (`ALPHA_ELIZA_DIR` names another place, `ALPHA_ELIZA_SOURCE` a local clone to copy), installs it, builds core, the agent, the agent's device bundle and the cloud Worker, and links `.eliza`. Worktrees that ask at once wait for the one that builds |
| `pnpm dev` | the page over a local eliza cloud and agent: one signed-in, funded owner and a scripted model, over state of that run alone (`ALPHA_ELIZA_STATE=<dir>` keeps it) |
| `ALPHA_FAKES=1 pnpm dev` | the page over the journeys' fakes, with no eliza: what the explore stage serves |
| `pnpm test` | the journeys in Node. `*.eliza.test.tsx` ask the run's setup for an owner of their own on one local cloud, with an agent of their own (`test/eliza/owned.ts`); a run with none of them starts nothing |
| `pnpm test:browser` | the journeys that need a real browser, in Chromium |
| `pnpm eliza:page` | `pnpm dev` and one conversation through the page in Chromium |
| `pnpm typecheck`, `pnpm build` | `vibelang --noEmit`; `vite build` to `dist/`, each screen in its own chunk |
