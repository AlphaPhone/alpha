# @repo/app

Alpha's page: Home, the built-in apps and Ask Alpha, which Android shows as the launcher. Its requirements are
[`spec/app/`](../../spec/app/index.md), one directory per area; `pnpm check` at the root generates `gen/` here and
checks this package's types, proofs, tests and page (SPEC.md, "One spec tree").

| Piece | Is |
|---|---|
| `src/runtime/` | what every area is built on: `reacting`, `following`, `hearing`, `applying` and the jobs of `reactor.vibe`; `area` of `area.tsx`; Alpha's time and the attempts' keys; each screen contained, and one page per store |
| `src/platform/` | the world as services: eliza's agent and cloud, the phone itself and its secure store, each with the layer a phone runs, which is eliza's own client of its plugin, and the one a browser runs; `plugins.vibe` lists the services of the phone's other plugins, and `adoption.vibe` moves what the earlier Alpha kept into the new stores |
| `src/areas.ts`, `src/resident.vibe` | every screen and where it is drawn; the machines that live from launch |
| `src/shell/`, `src/ask/` | the shell (Home, the trail, Back) and Ask Alpha, over eliza's turn controller: the areas to read before writing one |
| `test/sample/`, `spec/app/sample/` | the two sample areas, which only their own journeys mount: the reminders (a read, a feed, an undo window, an attempt outside, kept across restarts) and the text size (senders, an opening that asks the phone, the phone's signals, a page-wide effect) |
| `test/fakes/` | the world faked once at each boundary: the agent's and the cloud's routes for a browser's fetch, and `phone.ts`, what Capacitor's runtime calls on a phone, with eliza's plugins behind it, typed by eliza's definitions |
| `test/eliza/` | the world of a journey over eliza's real agent and cloud, and `pnpm eliza:page`; the processes themselves are `@repo/eliza-harness`'s, for the journeys `*.eliza.test.tsx` and `pnpm dev` |
| `aosp/`, `scripts/aosp.ts` | Alpha's image (`spec/app/image/`): the Cuttlefish and Pixel 10a products, the Pixel release descriptor, its one update channel, the key manifest and public certificates, and the branding, power-voice, Sense-policy and build-host patches; `pnpm aosp` stages, signs, records, updates by cable, verifies and enrolls on eliza's image tools (`@elizaos/os/image`) with them. It never flashes a device or publishes an update |
| `android/`, `capacitor.config.ts`, `scripts/android.ts` | Alpha's Android host: `android/host.json`, the profile eliza's consumer-host generator (`@elizaos/os/build`) writes the Gradle build from, in place beside Alpha's own manifests, plugin Java (`AlphaDevice`, `AlphaCarrierSetup`, `AlphaCallState`, `AlphaOngoingCall`, the Browser's native tab host `AlphaBrowser` on eliza's `browser-surface` module, and the subclasses of eliza's plugins the page registers by their eliza names) and resources under `android/app/`; `capacitor.config.ts` holds the identity `ai.alphacompute.alphaphone`, the sign-in registration and the cloud route table from `packages/deployment`. `pnpm android build --release` (with `ELIZAOS_VERSION_CODE=N`, release signing unset) checks the inputs and the eliza pin (eliza `develop`, `eliza.lock.json`), builds the agent pack (`apps/agent`), stages its runtime payload (`libeliza_node.so` per ABI, `agent.mjs`, `manifest.json`, `inventory.json`) into `android/runtime/`, builds and audits the page with the test mocks off, generates the host and builds both distributions of the launcher with eliza's `build-consumer.mjs` into `artifacts/`: `launcher-debug.apk`, `launcher-release-unsigned.apk`, `instrumentation/launcher-androidTest.apk`, `mapping/`, `build-config.json` and `sbom/`. `pnpm android verify` checks both APKs again and writes `artifacts/apk-manifest.json`, one debug and one release row; `pnpm android inputs` lists what is missing with the command that supplies it. It never signs a release, installs or flashes |
| `licenses/`, `scripts/licences.ts`, `public/licenses/` | what Alpha ships with the licence of each part (`spec/app/image/licences.md`): `pnpm licences` writes the notices the Licences page reads, `--check` says whether they are current, `--sbom FILE` writes a CycloneDX bill of materials |

## What one area offers another

An area never holds another's service in a cell to be filled once that area is built. What it offers is one of
three things, and the area that offers it owns it:

| Offered | As | Read by |
|---|---|---|
| a fact or a request another area acts on (a draft to open in Inbox, an alarm a workflow sets in Clock, a place to show in Maps, a file to share) | a resident machine of the offering area in `src/resident.vibe`, which the other area follows or tells (`following`, `tell` of `reactor.vibe`) | the machine's events and state, through the rules of both specs |
| something drawn inside another area's screen (a Maps or Calendar card in Ask Alpha, a share sheet, a notice) | a place `<area>/<name>` in `src/areas.ts`, drawn with `alpha.slot` | the screen of the area that draws it |
| what the phone, the agent or the cloud says (what this phone admits, the agent's live feed of a screen, the device headers a request names) | a service of `src/platform/` | every area |

Each port the earlier line late-filled between areas is one of those three, owned by the area that offers it:

| Earlier port | Offered by | As | Read by |
|---|---|---|---|
| Files' share targets: an email, a text, Ask Alpha | Inbox, Messages, Ask Alpha | a resident machine of each (Inbox's `mailbox`, Messages' `messages`, Ask Alpha's conversation) that Files tells with the files chosen; the sheet is the place `files/share` | Files |
| Browser's page mail | Inbox | Inbox's resident `mailbox`, told to open a draft | Browser |
| Calendar's Maps (an event's place) | Maps | a resident machine of Maps, told to show a place | Calendar |
| Workflows' Clock (prepare, confirm, retire an alarm) | Clock | a resident machine of Clock, told the alarm a workflow suggests | Workflows |
| the assistant's email (send, the account's address) | Inbox | Inbox's resident `operations`, told to send; the address followed from `mailbox` | Ask Alpha |
| Clock's own notices (current, consume) | the shell | the shell's resident `notices`, followed and told | Ask Alpha |
| Maps' chat cards | Maps | the place `maps/card` drawn in Ask Alpha's conversation | Ask Alpha |
| Camera's composer (a scan request) | Camera | a resident machine of Camera, told the request | Ask Alpha |
| Maps' relay of a conversation, Maps' and Browser's views | the agent | `Agent.feed("view", clientId)` of `src/platform/agent.vibe`, read by the screen that shows the view | Maps, Browser |
| Workflows' reply changes | Workflows | a resident machine of Workflows, followed | Ask Alpha |
| Browser's page for a turn | Browser | a resident machine of Browser holding the selected page, followed | Ask Alpha |
| the device's capabilities and the enrolled device's headers | the phone | `Device` and the headers a request names (`spec/app/platform/index.md`) | every area |
| the idle facts (a call, account work, the sign-in card) | Telephony, Account | Telephony's resident `callBar` and Account's resident machine, followed | Settings' `updating` |


## eliza's agent and cloud

Alpha's resident agent, its cloud and the phone's plugins are eliza's (`elizaOS/eliza`, branch `develop`, its Vibestack line), pinned in
[`eliza.lock.json`](../../eliza.lock.json). The agent and the cloud run as their own Node 26 processes from a checkout
outside the repository, built once per pinned commit and shared by every worktree. The page imports eliza's clients
(`@elizaos/agent/client`, `@elizaos/cloud/client`, `@elizaos/os/bridges/*`) through `.eliza`, a link to that checkout
which `pnpm install` makes where the checkout is built, on this package's one copy of Effect and of Capacitor.

| Command | Does |
|---|---|
| `pnpm eliza` | once per pin: clones eliza at the pin into `~/.cache/alpha/eliza-vibestack/<commit>` (`ALPHA_ELIZA_DIR` names another place, `ALPHA_ELIZA_SOURCE` a local clone to copy), installs it, builds core, the cloud, the agent, the device package and the agent's device bundle, and links `.eliza`. Worktrees that ask at once wait for the one that builds |
| `pnpm dev` | the page over a local eliza cloud (its own `serve` command, with its staging mailbox) and the agent pack the phone ships (`@repo/agent`'s build, with every plugin and action its policy allows): one signed-in, funded owner, a scripted model (or `ALPHA_DEV_MODEL=cerebras`) and a read-only plan catalog, over state of that run alone (`ALPHA_ELIZA_STATE=<dir>` keeps the agent's) |
| `ALPHA_FAKES=1 pnpm dev` | the page over the journeys' fakes, with no eliza: what the explore stage serves. `ALPHA_FAKES=phone` gives the page the fake phone's plugins, as on an Alpha image |
| `pnpm test` | the journeys in Node. `test/<area>.eliza.test.tsx` asks the run's setup for the owner named after its file, on one local cloud, with an agent of their own (`@repo/eliza-harness/owned`); a run with none of them starts nothing |
| `pnpm test:browser` | the journeys that need a real browser, in Chromium |
| `pnpm eliza:page` | `pnpm dev` and one conversation through the page in Chromium |
| `pnpm typecheck`, `pnpm build` | `vibelang --noEmit`; `vite build` to `dist/`, each screen in its own chunk. Both stop with the command to run where eliza is not built |
