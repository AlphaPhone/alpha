# Decisions taken for this cleanup

The research raised questions that are really product or owner decisions. The cleanup had to proceed
without pausing, so each one was decided here from the owner's brief ("delete all legacy code paths",
"no unit tests, only e2e and integration") and from `docs/prd.md` / `README.md`. Every decision is
reversible through git; anything the owner disagrees with can be restored by reverting the commit named
in the PR description.

| # | Question | Decision | Basis |
|---|---|---|---|
| D1 | Legacy data readers, migrate-on-read paths, "previous notes"/legacy calendar authority, legacy storage envelopes, Android legacy readers and their upgrade tests | **Preserve existing Notes access.** Restore the existing readers, entry point, and upgrade tests where users of the current package can have retained notes or drafts. Keep current persisted formats and key names byte-identical. | The separate-package installation in the PRD leaves current-package upgrades and their stored data in scope. |
| D2 | Wallet (AP-13) code: views, fixtures, simulated app, tests | **Delete.** | PRD: deferred, removed from MVP. Restorable from git when scheduled. |
| D3 | Backup export, password import/export, native recovery backup (test-mocks only) | **Preserve Notes recovery and its verification.** Restore the existing recovery behavior for retained Notes data. Keep the old-copy download under its existing test-mock gate. | Notes recovery and cross-package backup or transfer serve different purposes. |
| D4 | Client-side Calendar linked-sync stack reachable only from tests | **Delete** the renderer stack; the agent-side sync in `agent-calendar.ts` is the product path. | Superseded implementation (A2). |
| D5 | Hosted-agent pairing / remote / personal-Cloud agent paths | **Delete product-side code no production build can reach.** The mock/remote harness that the retained e2e suite drives stays until the e2e harness no longer needs it; what stays is listed in the PR as follow-up. | PRD: "No hosted-agent pairing". Keeping e2e coverage takes priority over deleting its harness in the same change. |
| D6 | Development simulator and test-mocks surfaces (`ELIZA_DEV_ALLOW_TEST_MOCKS=1`) | **Keep the capability** (AGENTS.md defines it), but behind one gating mechanism and one `dev/` module boundary; delete simulators of deleted features (Wallet). | AGENTS.md. |
| D7 | Dormant features the PRD still names as planned: always-on listening, hardware/Power invocation (AP-06, P-61), Clef end-of-turn (P-60) | **Keep**, untouched apart from dead helpers. | PRD lists them as MVP/AOSP gates. |
| D8 | Constant-false switches with no PRD requirement (`updateChannelCheckEnabled`, test-only send-policy override, impossible `'agent'` voice route) | **Delete** switch and dead branch. | A4. |
| D9 | Formatter | **Adopt Prettier for TS/JS/CSS/JSON**, run once as its own mechanical commit after text-pinned tests and harnesses are gone. Java is reformatted only where files are touched (no Java formatter dependency added in this change). | D8 "statement soup"; a separate commit keeps the diff reviewable and lets in-flight branches re-run the same command. |
| D10 | Source-text tests, source transplants, stub unit tests | **Delete** (T1–T3). Behaviour worth keeping is covered by an integration test or a Playwright journey; real release rules move into the build-output audits. | Owner brief. |
| D11 | Formal models | **Keep every live model passing.** Retire `specs/quint/legacy` once live harnesses no longer import from it; port text-anchored harnesses to imports. | Owner brief: Quint and LemmaScript at 100%. |
| D12 | Required-check ruleset, branch topology (main ↔ develop sync) | **Not changed here** beyond workflow files: repository settings are the owner's. Workflows are restructured so PRs run only the lanes their paths affect. | Outward-facing repository configuration. |
| D13 | The audit report folder itself | **Committed** under `docs/simplification-audit/` as requested; it is documentation only and can be dropped in a follow-up once consumed. | Owner brief. |
| D14 | Upstream (`vendor/eliza`) fixes the audit suggests | **Not done here.** Listed in `cross-file-actions.md` as upstream follow-ups. | AGENTS.md: never edit the vendor checkout. |
