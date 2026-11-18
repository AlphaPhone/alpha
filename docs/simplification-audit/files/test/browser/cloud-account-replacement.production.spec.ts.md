# test/browser/cloud-account-replacement.production.spec.ts
- Lines: 146 | Kind: Playwright journey, `production` project (flag-off bundle + `flag-off-android.ts`/`resident-stub.ts` bridge) | Verdict: **MERGE** into `journeys/connection-cloud.spec.ts` (production project)
- Covers: replacing Eliza Cloud account A with account B stops the resident's Cloud provider before A's key is revoked and removed, binds B only after it is stored, and leaves no request carrying A's key; a second sign-in over an expired saved key revokes the old key only after the new one is stored. Duplicates: partly `connection-boundaries.production.spec.ts` (sign-out revocation ordering, single-account case); none for the A→B ordering. Callers/importers: none (spec). 2 tests, each `setTimeout(150_000)`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15, 28-33, 89-95, 100 | A3 / P3 (T6) | Seeds a personal-Cloud setup intent (`alpha.cloud.personal-setup.v1:`) and monkey-patches `Storage.prototype.getItem` to prove it is never read. The personal-Cloud setup is deleted product code (delete-candidates C4, D5). | Drop the seed, the `getItem` patch and the three assertions about `personalReads`/`personal-a` when C4 lands. | Low: the assertion guards a path that will no longer exist. |
| 2 | 18, 41, 85, 104 | P2 / T6 | `window.dispatchEvent(new Event('launcher-home'))` reaches Home through an internal event instead of the HOME control. | Use the harness `nav.goHome()` (visible Home/back control). | Low. |
| 3 | 24, 114, 44, 50, 55, 87, 106, 121, 124, 131, 133, 136 | T8 (P11) | 150 s test timeouts and many 30 s waits. | Rely on harness boot + default timeouts; keep explicit waits only where the stub polls. | Low. |
| 4 | 128 | P2 | Mutates `window.residentStub` internals (`accounts[0].userStatus=401`, `persist()`) to expire A's key. | Expose `cloud.expireKey(account)` on the typed harness. | Low. |
| 5 | 3-8 | P13 | Evidence-boundary disclaimer restating `flag-off-android.ts`. | Delete. | none |
| 6 | 146 | P13 | `test.beforeEach(seedCompletedAccessSetup)` declared after the tests. | Fixture option `app({accessSetup:'completed'})`. | none |
| 7 | 58-76, 138-142 | — | The ordering assertions over `stub.order` (`Agent.stop` before `revoke`, `revoke` before `remove`, `remove` before `store B`, provider configured before restart, one revoke only) are the valuable part. | Carry unchanged into the journey; the harness keeps the ordered call log. | Medium if the call log is not kept in the new harness. |

## Proposed end state
Two cases in `journeys/connection-cloud.spec.ts` (production project): "replace account A with B" (ordering, Inbox uses B's key, A's key never sent again, conversation survives the switch, no development surface) and "second sign-in over an expired key revokes the old key after storing the new one". Both use `app({build:'production', connection:'resident', accessSetup:'completed'})`, `cloud.accounts([A,B])` and `nav.goHome()`. No personal-setup seed, no prototype patches, default timeouts.
