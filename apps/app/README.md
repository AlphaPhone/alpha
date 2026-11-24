# @repo/app

Alpha's page: Home, the built-in apps and Ask Alpha, which Android shows as the launcher. Its requirements are
[`spec/app/`](../../spec/app/index.md), one directory per area; `pnpm check` at the root generates `gen/` here and
checks this package's types, proofs, tests and page (SPEC.md, "One spec tree").

| Piece | Is |
|---|---|
| `src/runtime/` | what every area is built on: `reacting`, `following`, `hearing`, `applying` and the jobs of `reactor.vibe`; `area` of `area.tsx`; Alpha's time and the attempts' keys; each screen contained, and one page per store |
| `src/platform/` | the world as services: eliza's agent and cloud, the phone itself and its secure store, each with the layer a phone runs, which is eliza's own client of its plugin, and the one a browser runs; `plugins.vibe` lists the services of the phone's other plugins |
| `src/areas.ts`, `src/resident.vibe` | every screen and where it is drawn; the machines that live from launch |
| `src/shell/`, `src/ask/` | the shell (Home, the trail, Back) and Ask Alpha, over eliza's turn controller: the areas to read before writing one |
| `test/sample/`, `spec/app/sample/` | the two sample areas, which only their own journeys mount: the reminders (a read, a feed, an undo window, an attempt outside, kept across restarts) and the text size (senders, an opening that asks the phone, the phone's signals, a page-wide effect) |
| `test/fakes/` | the world faked once at each boundary: the agent's and the cloud's routes for a browser's fetch, and `phone.ts`, what Capacitor's runtime calls on a phone, with eliza's plugins behind it, typed by eliza's definitions |
| `test/eliza/` | the world of a journey over eliza's real agent and cloud, and `pnpm eliza:page`; the processes themselves are `@repo/eliza-harness`'s, for the journeys `*.eliza.test.tsx` and `pnpm dev` |
| `aosp/`, `scripts/aosp.ts` | Alpha's image (`spec/app/release/`): the Cuttlefish and Pixel 10a products, the Pixel release descriptor, its one update channel, the key manifest and public certificates, and the branding, power-voice, Sense-policy and build-host patches; `pnpm aosp` stages, signs, records, updates by cable, verifies and enrolls on eliza's image tools (`@elizaos/os/image`) with them. It never flashes a device or publishes an update |
| `licenses/`, `scripts/licences.ts`, `public/licenses/` | what Alpha ships with the licence of each part (`spec/app/release/licences.md`): `pnpm licences` writes the notices the Licences page reads, `--check` says whether they are current, `--sbom FILE` writes a CycloneDX bill of materials |

## eliza's agent and cloud

Alpha's resident agent, its cloud and the phone's plugins are eliza's (`elizaOS/eliza`, branch `develop`, its Vibestack line), pinned in
[`eliza.lock.json`](../../eliza.lock.json). The agent and the cloud run as their own Node 26 processes from a checkout
outside the repository, built once per pinned commit and shared by every worktree. The page imports eliza's clients
(`@elizaos/agent/client`, `@elizaos/cloud/client`, `@elizaos/os/bridges/*`) through `.eliza`, a link to that checkout
which `pnpm install` makes where the checkout is built, on this package's one copy of Effect and of Capacitor.

| Command | Does |
|---|---|
| `pnpm eliza` | once per pin: clones eliza at the pin into `~/.cache/alpha/eliza-vibestack/<commit>` (`ALPHA_ELIZA_DIR` names another place, `ALPHA_ELIZA_SOURCE` a local clone to copy), installs it, builds core, the cloud, the agent, the device package and the agent's device bundle, and links `.eliza`. Worktrees that ask at once wait for the one that builds |
| `pnpm dev` | the page over a local eliza cloud (its own `serve` command, with its staging mailbox) and agent (with its approvals, notifications, schedule and tasks modules): one signed-in, funded owner, a scripted model and a read-only plan catalog, over state of that run alone (`ALPHA_ELIZA_STATE=<dir>` keeps the agent's) |
| `ALPHA_FAKES=1 pnpm dev` | the page over the journeys' fakes, with no eliza: what the explore stage serves. `ALPHA_FAKES=phone` gives the page the fake phone's plugins, as on an Alpha image |
| `pnpm test` | the journeys in Node. `test/<area>.eliza.test.tsx` asks the run's setup for the owner named after its file, on one local cloud, with an agent of their own (`@repo/eliza-harness/owned`); a run with none of them starts nothing |
| `pnpm test:browser` | the journeys that need a real browser, in Chromium |
| `pnpm eliza:page` | `pnpm dev` and one conversation through the page in Chromium |
| `pnpm typecheck`, `pnpm build` | `vibelang --noEmit`; `vite build` to `dist/`, each screen in its own chunk. Both stop with the command to run where eliza is not built |
