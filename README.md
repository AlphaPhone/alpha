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

Needs Node 26, pnpm 10.24.0 and Dafny 4.11 on the `PATH`.

```sh
pnpm install
pnpm dev      # Studio, and every app's development server
pnpm check    # models, proofs, types, tests, traces and each page explored
pnpm verify   # everything CI runs
```

Agents start with [AGENTS.md](AGENTS.md); the spec format is in
[SPEC.md](SPEC.md) and the repository's map in
[CONTRIBUTING.md](CONTRIBUTING.md).
