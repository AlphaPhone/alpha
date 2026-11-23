# test/qualified-app-update.test.mjs
- Lines: 92 | Kind: tooling wrapper (spawns `test/qualified-app-update.test.py`) + source-text over three release workflows' YAML and `scripts/ci/private-artifact-identity.json` | Verdict: DELETE; the Python suite moves to `test/tooling/python.test.mjs`
- Covers: publication of a qualified app update binds source, private output and reviewed voice evidence without signing keys; release workflows use protected environments, pinned actions, short-lived WIF tokens only in the right jobs. Duplicates: none. Callers/importers: `npm test` glob only. `scripts/ci/private-artifact-identity.json` has no other reader (scripts research: "read only by a test").

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-9 | T9 | One-line wrapper around a Python unittest. | Move into the Python collector. | Low |
| 2 | 11-37 | T1/T5 | Parses `publish-qualified-app-update.yml` and asserts its permissions, step order, regexes over `run:` text, no `secrets.` env, pinned `@<sha>` actions. | Delete. Real policy (pinned actions, no secrets in env) is a repository-wide workflow lint (e.g. `zizmor`/`actionlint` in the CI lane), not a per-file test. | Medium: the release workflows lose a guard against a careless edit; owner decides whether to add a workflow linter. |
| 3 | 39-92 | T1 | Same for `release-cloud-app-signing.yml`, `release-os-ota-signing.yml` and the identity JSON (repository id, owner id, project id literals). | Delete with #2; the identity JSON then has no reader: keep it as documentation under `docs/` or delete (scripts chunk). | Medium |
| 4 | all | owner | Whether the Cloud signing / qualified-update path is still live is an open owner question in other chunks. | If retired, the Python suite and `scripts/ci/qualified-app-update.py` go too. | — |

## Proposed end state
File deleted. `test/qualified-app-update.test.py` runs from `test/tooling/python.test.mjs` as long as
`scripts/ci/qualified-app-update.py` exists. Workflow-text checks are replaced, if the owner wants them, by one workflow linter job.
