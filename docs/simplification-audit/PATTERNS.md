# Simplification audit — issue catalogue

This is the master list of problem *patterns* found in the codebase. It was derived from nine area
research reports in [`research/`](research/) (each holds the evidence: `path:line` examples, counts and
delete candidates). Every per-file review in [`files/`](files/) tags its findings with these IDs.

Scale at the time of the audit (excluding `vendor/eliza`): renderer `apps/app` ≈ 80k lines, `android`
≈ 51k, `scripts` ≈ 41k, `specs` ≈ 168k, `test` ≈ 141k (1,004 host test files, 490 Playwright specs).

How to read an entry: **ID — name**: what it looks like → what to do. "Where" points at the research
report with the evidence.

## A. Dead, retired and legacy code

| ID | Pattern | Treatment | Where |
|---|---|---|---|
| A1 | **Legacy readers for data that cannot exist.** Migrate-on-read paths, `legacy*` keys, old storage envelopes (`{version:1,legacy,value}`, `{raw}`), "previous notes" source mode, legacy calendar authority, historical permission-walkthrough versions, `retireSharedMail`, Android `LegacyCloudRecovery`, `migrateLegacyMetadata`, `LEGACY_PREFIX`, plaintext SMS journal. The package was renamed on 2026-11-10 and starts with empty private data; the PRD plans no migration. | Delete reader, key, UI ("Download old copy", "previous notes") and tests together. Keep the *current* persisted formats byte-for-byte. | runtime a–m P5, n–z P4, prototype P10, browser P2, android P5 |
| A2 | **Superseded parallel implementation.** A newer path is live while the old stack is still compiled (client-side Calendar linked-sync stack vs `agent-calendar.ts`; local forks of modules upstream already ships; local `createWorkflowApprovalPoster`). | Delete the old stack; import the live/upstream one. | runtime a–m P11, n–z P2 |
| A3 | **PRD-excluded features still implemented.** Wallet (AP-13 deferred), backup / import / export, password transfer, hosted-agent pairing leftovers. | Delete what no product build can reach. Anything a retained test-mocks harness still drives is listed in DECISIONS.md. | prototype P9, n–z P6, android P15 |
| A4 | **Dormant branches behind constant switches.** `const x = false` flags and the code they guard (`updateChannelCheckEnabled`, `VOICE_SEND_POLICY`, impossible `'agent'` voice route). | Delete the switch and the dead side, unless the PRD names the feature as planned (then keep, marked in DECISIONS.md). | runtime a–m P18, n–z P5, android P14 |
| A5 | **Unreachable prototype code.** Model views whose `render` is completely replaced by an adapter, heads-up banner, dev-rail values computed in production, quick-settings tiles that only render in dev. | Delete, or move behind the dev module boundary. | prototype P8 |
| A6 | **Undo layers.** Production code that neutralises prototype behaviour after the fact (`reply = () => null`, emptying fixture state, label-text "honesty" walk). | Remove the neutralised code at the source, then the undo layer. | prototype P7 |
| A7 | **Unused exports, files, resources, aliases, scripts and workflows.** Symbols with no importer; exports used only by a test; scripts nobody invokes; workflows that never pass or never run; unused Vite/tsconfig aliases; orphan fixtures. | Delete after a whole-repo reference check (apps, android, scripts, test, specs, .github, config). | every report §3 |
| A8 | **Tombstones and changelog comments.** Comments narrating history ("an earlier build…", "#416"), references to documents that do not exist (`PLAN.md`, `CONTRACT.md`), refusal stubs for removed flags (`removed-profile-flags.ts`). | Delete. Comments describe what the code does now and why. | runtime a–m P13, n–z P19, scripts "tombstone" |

## B. Defensive programming

| ID | Pattern | Treatment | Where |
|---|---|---|---|
| B1 | **Swallowed errors.** `catch {}`, `catch { return fallback }`, `.catch(() => {})`, Java empty catches and catch-all-to-fixed-message. | Let it throw, or handle one named failure. Keep a catch only where the fallback is the specified behaviour, with a comment saying so. | a–m P7, n–z P13, android P11 |
| B2 | **Phantom capability detection.** `?.()` and `typeof x === 'function'` on things that always exist; `typeof window/document/localStorage` in browser-only code; "unavailable in this version" guards on native methods that ship in the same APK; optional (`?`) members on our own bridge interfaces. | Make the member required and call it. | a–m P8, prototype P15 |
| B3 | **Re-validating our own values.** Hand-written structural validators for data this module just wrote or received from a typed in-process caller; check-act-check sandwiches; self-validation of a script's own constants. | Validate once at the trust boundary (network, native bridge, storage, CLI). Trust typed values inside. | a–m P9, n–z P14, browser P6/P7, scripts |
| B4 | **Impossible-state guards.** `X = X || …` on freshly-defined constants, `installed` WeakSets and disposers nobody calls, re-ANDing a flag already folded into its operand, `typeof PN !== 'undefined'`. | Delete. | prototype P15, browser P1 |
| B5 | **Evidence ceremony.** Hashing inputs before and after a run, receipts, self-test canaries, exact-count assertions, provenance files nothing reads. | Rely on the tool's exit code; delete receipts with no consumer. | scripts, ci-and-formal |

## C. Duplication

| ID | Pattern | Treatment | Where |
|---|---|---|---|
| C1 | **Local structural types re-declared per file.** `type Bag = Record<string, any>` (60×), `Shell = any`, `State`, `Options`, `Pending`, `Binding`, `Selection`, session/owner request function types. | One exported type per concept (see [`types.md`](types.md)); import it. | a–m §4, n–z P10, prototype P4, browser P11 |
| C2 | **Native plugin interfaces typed at each call site.** `AlphaVoiceCloud` in 16 files, `DailyApps`, `ElizaLocation`. | One typed module per plugin. | n–z P7 |
| C3 | **Copy-pasted micro-helpers.** SHA-256→hex (~28× renderer, ~40× scripts, 10× Java), plain-object guard (~35×), UUID regex, abortable sleep, abort/timeout race, `isAbortError`, canonical JSON, `readJson`, `git()` wrapper (17×), directory walkers (11×), arg parsers (14×), upstream-lock readers (30×), Java stream/digest/ID helpers, 25 thread pools. | One helper per concept in a shared module (`apps/app/src/lib/`, `scripts/lib/`, one Java util class). | every report §4 |
| C4 | **Per-feature re-implementation of one mechanism.** Android-slot/browser-document durable store (8+), observable-document wrapper (8), imperative `<dialog>` lifecycle (21), "owner foreground" check (10 Java), slot-store adapter glue (12 Java), staleness/epoch fences (~30). | Generalise the best existing instance and reuse it. | n–z P3/P11, browser P3/P4, android P7/P8 |
| C5 | **Near-duplicate sibling modules.** Three calendar draft adapters, twelve notes adapters, three workflow adapters, five `start-*` launchers, two image-capability gates, seven notification pipelines, `x.spec.ts` + `x.production.spec.ts` twins, duplicated Quint harness helpers. | Merge into one module (or one parameterised function). | prototype P11, scripts, android P13/P16, tests-browser |
| C6 | **Same literal in many places.** Storage keys (`'alpha.connection.selection.v1'` in 12 files), `"cloud:production"` (32× Java), kind→label maps, status sets. | One exported constant next to its owner. | a–m §4, n–z P17, android P6 |
| C7 | **Two languages / two homes for one job.** Python beside TypeScript in `scripts/ci`, alias maps in three files, three ways of importing upstream code. | One implementation, one mechanism. | scripts, browser P13, n–z P18 |

## D. Structure and over-engineering

| ID | Pattern | Treatment | Where |
|---|---|---|---|
| D1 | **God modules.** `connection-ui.tsx` (4.2k lines, global mutable state), `agent-adapter.ts` (2.1k), `model.js` (5.9k), `AlphaLocalAgentPlugin.java` (1.4k), `AlphaDevicePlugin.java`, `main.tsx` composition sprawl. | Split by responsibility into a folder; state owned by one module with a typed interface. | a–m P2, prototype P23, n–z P16, android P3 |
| D2 | **Monkey-patch chains.** ~53 `install*Adapter(Component, VIEWS)` calls wrap prototype methods and view hooks (`originalSet.call(shell, …)`), order-dependent, with traps to stay outermost. | Ordered hook registry / explicit composition; one owner per view. | prototype P1–P3 |
| D3 | **Ad-hoc integration buses.** 241 untyped fields on the shell instance, module-level "current shell" captures, `window` custom events, static fields on Android plugin classes used as a service locator. | Typed shared state object; explicit parameters; plain classes for process-wide services. | prototype P5/P6, a–m P16, android P2 |
| D4 | **Pass-through shims.** One-line re-export files, alias renames, wrapper classes and facades with one implementation, pass-through plugin methods. | Import the real module; delete the shim. | a–m P10, n–z P1, prototype P14, browser P10, android P17 |
| D5 | **Flag zoo.** ~10 separately derived dev/test flags threaded through production modules; four stacked mechanisms to keep dev code out of production; run-mode explosion (`?mode=`, `?fixture=`, `?tools=`). | All flags in `build-flags.ts`; dev-only modules in one `dev/` folder behind one dynamic import. | a–m P6, browser P1, prototype P19 |
| D6 | **Dev, fixture and generated code inside product folders.** Fixtures and 42 images in `prototype/`, dev simulators in `browser/` and `runtime/`, generated files in `runtime/`, test hooks (`*ForTest`) in main Java source. | Move to `dev/`, `fixtures/`, `generated/`, or the test source set. | prototype P21, a–m P19, android P12 |
| D7 | **Test-shaped production code.** Exports that exist only for tests, `import.meta.env === undefined` shims so Node can import renderer files, marker comments so tests can slice the file, tiny classes kept for host-javac tests. | Remove with the test that needs them (see T2/T3). | a–m P12, n–z P15, android P1 |
| D8 | **Statement soup.** Minified-style lines (hundreds of characters, many statements), no formatter, mixed indentation, 1,000-character Java conditions. | Adopt one formatter for TS/JS/CSS and one for Java; run once, as its own commit. Split dense expressions into named steps when touching code. | a–m P1, n–z P12, prototype P18, android P4 |
| D9 | **High cyclomatic complexity.** Long functions with nested conditionals and boolean chains, 46 comparisons on a connection `kind` union, render functions that start side effects. | Early returns, lookup tables, extract named predicates, split by case. | a–m P2, prototype P17 |
| D10 | **Generic helper shaped around one caller; registry declared but not consulted; label-string-driven behaviour.** | Inline or make truly generic; read the registry; key behaviour on ids. | browser P9/P16, n–z P17 |
| D11 | **Misleading names and misplaced files.** Two `local-speech-playback.ts`, `browser/` modules used on Android, "prototype" that is the production renderer core, misnamed resource files. | Rename / move (with every reference). | n–z P20, browser P18, android §5 |
| D12 | **Mixed UI paradigms and inline styling.** Template engine + React + imperative DOM; 256 KB of inline styles; duplicated icon markup. | Keep one paradigm per surface; move repeated inline styles to CSS classes. | a–m P14/P15, prototype P16 |
| D13 | **Deep relative imports into generated upstream output.** 364 imports like `../../../../.eliza/client-features/plugins/...`. | One `@eliza/*` alias (Vite + tsconfig + test loader). | browser P13, prototype P22 |

## T. Tests

| ID | Pattern | Treatment | Where |
|---|---|---|---|
| T1 | **Source-text assertions.** Tests that `readFileSync` a source/workflow/config file and regex-match it. | Delete. Real release rules move into the build-output audits (`audit-production-bundle`, `verify-apks`). | tests-host A, P2 |
| T2 | **Source transplants.** Tests that slice code out of a file by marker, strip types, rewrite imports and run the fragment with fake globals (268 files; `connection-ui.tsx` sliced by 81). | Delete; cover the behaviour through a real import in an integration test or a Playwright journey. | tests-host C, P1 |
| T3 | **Unit tests with stubs.** One function, everything else faked. | Delete unless it is the only coverage of a risky pure algorithm that an integration test cannot reach; then fold into the area integration file. | tests-host B |
| T4 | **Duplicate coverage.** Quint replays run per-model and again in aggregates; host test + Playwright spec with the same name; `x.spec` + `x.production.spec`; verbatim copies. | Keep one. | tests-host P3/P10, tests-browser |
| T5 | **Tests of the test machinery / of upstream.** Tests of helpers, fixtures, workflows' text, a home-built accessibility checker; re-running `vendor/eliza` suites. | Delete; keep only tests of tooling that gates a release. | tests-host F, P5/P9 |
| T6 | **Unit tests in a browser costume.** Playwright specs that never click or type and only `page.evaluate` module functions; backdoor navigation and state seeding; monkey-patching product classes in-page (849 sites). | Rewrite as user journeys or delete. | tests-browser P1–P3 |
| T7 | **Micro-spec sprawl and helper duplication.** 125 single-test specs, 45 Calendar specs, 57 hand-written Capacitor bridge fakes, 3,316 `window as any`. | ~35 journey specs per product area on one typed `test.extend` harness. | tests-browser |
| T8 | **Flake factories.** Fixed sleeps (294), 120 s+ timeouts (144), fake clocks racing real timers. | Wait on conditions; one clock policy. | tests-browser |
| T9 | **Indirection.** Tests that spawn a script that is the real test; `scripts/test-*.ts` suites outside `test/`; Python tests behind wrappers; env knobs nothing sets; permanently skipped tests. | The test file is the test. Move `scripts/test-*` into `test/`. | tests-host P4/P7/P11, scripts |
| T10 | **Text-anchored formal harnesses.** Quint refinement harnesses and manifests that cut source at literal strings or pin 1,060 symbol names by regex. | Import exported functions; pin files, not text. | ci-and-formal |

## P. Pipeline

| ID | Pattern | Treatment | Where |
|---|---|---|---|
| P1 | **Verify monolith.** Any non-doc change runs ~2 h of serial checks; `scripts/` change = everything. | Path → check matrix; independent parallel lanes. | ci-and-formal §7 |
| P2 | **Run it four times.** PR, main push, sync PR and develop push all verify the same commit. | Gate on PRs; pushes run only what PRs cannot. | ci-and-formal |
| P3 | **Duplicate execution across jobs.** `npm ci` + prepare + build repeated; Dafny proofs, Python suites, digest-restart, Quint composition run in two workflows. | Run once; share via one setup action / artifacts. | ci-and-formal, scripts |
| P4 | **Dead workflows.** Never green, never run, one-off reproductions, unreachable jobs. | Delete. | ci-and-formal |
| P5 | **Copy-paste workflow blocks and package.json hook sprawl.** Eight `pre*` hooks, repeated setup steps. | One composite action; one prepare step. | ci-and-formal, scripts |
| P6 | **Historical model retention.** `specs/quint/legacy` forces a network fetch on each verify; models of upstream-only code; audit twins. | Retire after moving the helpers live harnesses import. | ci-and-formal |
