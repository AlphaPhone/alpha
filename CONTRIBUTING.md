# Contributing

Read [README.md](README.md), [docs/development.md](docs/development.md) and [AGENTS.md](AGENTS.md) first.

## Engineering rules

1. Update the existing code. Do not patch over legacy behaviour or add a new version beside the old one.
2. Do not add a flag to introduce a change. Change the underlying code to be the new thing.
3. Env vars and flags are only for values that are really configurable: secrets, machine paths,
   and settings a person changes between runs.
4. Add a test only when it tests new features or functionality.
5. Add a script only when it does something no existing script does.
6. Deduplicate, consolidate and clean up as you go.
7. Change existing code rather than adding a new conditional path, unless there is a strong
   reason for the branch; state that reason in the change.

## Android packaging

Alpha has one launcher product/flavor. Every APK packages the resident runtime,
on-device voice and local embeddings. Run `pnpm android:build:local` (debug and
instrumentation APKs; add `-- --release` for the release APK, as CI does) and
`pnpm android:verify`; retain debug, release and instrumentation evidence
separately. Browser test mocks do not define another APK lane.

## Formal models

The app's behaviour is specified in `apps/app/spec/**/*.md`: each rule carries its Quint model, and
a Dafny proof sits beside the spec where Dafny cannot discharge an obligation alone. `pnpm check`
(the vibestack spec check, part of `pnpm verify`) typechecks and simulates every model, replays the
generated machines, runs the proofs and explores the stories in Chromium. It needs Dafny 4.11.0 on
`PATH` (`scripts/ci/prepare-dafny.sh` in CI) and a Playwright Chromium
(`scripts/ci/install-playwright-browser.sh chromium`). The legacy `specs/quint` and `specs/lemma`
trees and the `test/quint-*` refinement tests are retired in favour of it; `test/root-tests.json`
lists them with where each one's behaviour moved.

## Browser tests

Run `pnpm test:browser` (the Vitest browser project) and `pnpm test:browser:production` locally
before finalising a PR, and state in the PR description that they were run and are final. PR CI runs
only `pnpm verify` and, when build inputs change, the Android build; the browser tests run in CI
only when `develop` is promoted to `main`. The CI lanes are listed in
[docs/development.md](docs/development.md).
Locally both lanes use 4 workers (`ALPHA_BROWSER_WORKERS` overrides). Projected (not yet measured
as full runs): roughly 75 minutes for `test:browser` and 10 for `test:browser:production` on a quiet machine; on a shared
workstation run them under `systemd-run --user -p MemoryMax=10G`. Failure traces omit DOM
snapshots and the network log unless `ALPHA_TRACE=1`.
See [Browser test runs](docs/development.md#browser-test-runs).
