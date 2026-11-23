# Alpha

A complete mobile agentic operating system, built by
[Alpha Compute](https://alphacompute.ai).

Alpha is a personal AI agent that lives on the phone itself. Tap **Ask
Alpha**, type or talk, and the agent works across mail, calendar, maps,
notes, photos and files, and asks before it does anything that matters. The
agent, its memory and its database run on the device; a cloud account
supplies model inference, speech and Gmail.

## This branch

`vibestack` rebuilds Alpha on the [Vibestack](vibestack/README.md)
toolchain: requirements as stories and rules with their Quint in
[`spec/`](spec/index.md), a generated and proved core, the shell in VibeLang
on Effect, and the interface in React on one design system.

| Path | Holds |
|---|---|
| `spec/` | The one spec tree: the product, and a directory per app or package |
| `apps/app` | The phone's interface: Home, the built-in apps and Ask Alpha |
| `packages/design-system` | Alpha's design tokens, built into Tailwind's theme |
| `packages/ui` | Alpha's shared React components, with generated stories |
| `vibestack/` | The toolchain, with [its guide](vibestack/README.md) |
| `legacy/` | The implementation being replaced, kept as the guide to what each area does and removed area by area as it is rebuilt |

The on-device agent, the Android device package and the hosted services
are the open-source [elizaOS](https://github.com/elizaOS/eliza) packages on
its `vibestack` branch, at a pinned commit.

## Setup and checks

Needs Node 26, pnpm 10.24.0, Dafny 4.11 and `openssl` on the `PATH`.

```sh
pnpm install
pnpm eliza    # once per pinned commit: clone, install and build eliza (a few minutes)
pnpm dev      # Studio, and the app over eliza's agent and cloud, started for this run
pnpm check    # models, proofs, types, tests, traces and each page explored
pnpm verify   # everything CI runs
```

`pnpm eliza` builds the commit `eliza.lock.json` pins outside the repository, in
`~/.cache/alpha/eliza-vibestack/<commit>` (or the directory `ALPHA_ELIZA_DIR`
names), and links it as `.eliza`; every worktree shares that build, and
typecheck, test, build and dev say so where it is missing. `pnpm dev` starts
eliza's cloud command and its agent as processes of that run, with a scripted
model in place of a paid one, and stops them with it. `ALPHA_FAKES=1 pnpm dev`
serves the app over the journeys' fakes instead, and `ALPHA_FAKES=phone` over
the fake phone's plugins.

Agents start with [AGENTS.md](AGENTS.md); the spec format is in
[SPEC.md](SPEC.md) and the repository's map in
[CONTRIBUTING.md](CONTRIBUTING.md).
