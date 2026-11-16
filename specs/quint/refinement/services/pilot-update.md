# Pilot APK update

`PilotApkUpdate` models one admitted same-signer replacement. HOME role and resolved
activity, process quiescence, installer response, data verification and agent restart have
separate state. Alpha has no signing-key rotation: a unit signed by the retired version 49
key is wiped and provisioned again, never upgraded in place.

| Model boundary | Executed source |
| --- | --- |
| Device lock | `claimPilotInstall` in `scripts/owner/pilot-install-lock.ts` |
| HOME admission, write/readback, final restore and explicit start | `planHome` and `updateUnit` in `scripts/pilot-update.ts`, with `readHome` and `restoreHome` in `scripts/android-instrumentation.ts` |
| Pre/post readback and admitted replacement verification | `updateUnit`, `packageFacts`, `installedApkSha256` and the pinned shared `apk-release-record.mjs` |

The source witness captures real command order and returned update evidence from
`updateUnit` against a scripted adb port. The device lock runs on an owner-only
temporary filesystem. The same fixture covers normal update, missing legacy export,
partial HOME handoff, unrelated HOME takeover, process-list failure, relaunch during
either readback, modified data, failed cleanup, unknown install response and a verified
install followed by startup refusal. The witness rejects competing device claims.

Run the source campaign with `bun test test/quint-pilot-update-refinement.test.mjs`.
The receipt records all named observations and binds source inputs before execution.
Startup logs and process/HOME replies are controlled inputs. Actual Android process
and RoleManager behavior, signed APK admission, host crash recovery, the full CLI
record-writing path and real agent health remain separate qualification obligations.
