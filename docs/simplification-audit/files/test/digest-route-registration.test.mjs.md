# test/digest-route-registration.test.mjs
- Lines: 59 | Kind: integration of app protocol (records every request path `HostedDigestProtocol` makes) against the pinned agent's route table read with `git show <pin>:` and regex; plus source-text on the app shim and upstream types | Verdict: KEEP test 2 (as an upstream-pin check, MOVE to `test/tooling/upstream-pin.test.mjs`); DELETE test 1
- Covers: every hosted digest route the app calls is registered by the pinned agent (plugin routes or `route-auth-policy` prefixes), including `POST /hosted/dossier`. Duplicates: none; this is the only check that the app and the pinned agent agree on routes. Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 30-40 | T1, T5 | Regexes the app shim's `export *` line and upstream's TypeScript union declarations to prove the enumeration is complete. Tests text, and the client is upstream's own. | Delete. | Low. |
| 2 | 42-59 | T10 | Parses `plugin-routes.ts` with `/type:\s*'(GET|...)',\s*path:\s*'([^']+)'/` and checks a "2000" literal near the dossier route. A real cross-repo contract, but text-anchored; breaks on upstream reformatting. | Keep the "called routes are registered" assertion; drop the body-cap and handler-literal regexes (lines 55-58). Better: import upstream's route table module from `.eliza` and read `path`/`type` fields. | Medium: it caught a real unregistered route (eliza#35906). |
| 3 | 16-28 | T9 | Script-string tsx child to record calls. | Direct import in a tsx-loaded file. | None. |
| 4 | 13 | C3 | Local `git show` helper (17 copies across scripts/tests). | Shared helper. | None. |

## Proposed end state
One case "every digest route the app calls is registered at the pinned commit", importing the route definitions rather
than regexing them, run in the upstream-pin tooling suite that changes only when `upstream.lock.json` or the digest client changes.
