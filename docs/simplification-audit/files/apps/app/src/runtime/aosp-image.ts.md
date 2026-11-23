# apps/app/src/runtime/aosp-image.ts
- Lines: 36 | Role: decides at load whether the renderer runs on the Alpha AOSP image (native registered the `AlphaTelephony` plugin) and which image-only views are admitted | Verdict: SIMPLIFY (minor)
- Importers: `aospImage` in main.tsx, native.ts, prototype/agent-adapter.ts, mvp-features.ts, phone-adapter.ts, settings-adapter.ts, sms-adapter.ts, telephony-attention.ts, runtime/connection-ui.tsx, runtime/phone-context.ts; `admittedAospViews` in prototype/mvp-features.ts. Text/path pins: `test/aosp-image-capability.test.mjs:8,36` (imports `detectAospImage`, `admittedAospViews`, `AOSP_IMAGE_VIEWS`, `ADMITTED_AOSP_VIEW_ADAPTERS`; reads source text); `test/aosp-sms.test.mjs:255`; `test/wallet-disabled.test.mjs:22-27` rewrites the import path; esbuild stubs keyed on the path `runtime/aosp-image` in `test/image-sms.test.mjs`, `test/phone-adapter.test.mjs`, `test/quint-phone-recents.test.mjs`, `test/quint-view-admission.test.mjs`, `test/sms-incomplete-rows.test.mjs`, `test/telephony-attention-lifecycle.test.mjs`, `specs/quint/refinement/services/{contacts-session,mms-compose,phone-session,sms-send}-replay.mjs`; manifest symbol pins `AOSP_IMAGE_VIEWS` (application) and `ADMITTED_AOSP_VIEW_ADAPTERS` (services); feature-parity inventory.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-13, 17-22 | A8 | 11-line comment with "owner decision P-36, issue #420" and a list of what an ordinary install cannot do. | Two lines: what decides it (native plugin registration) and that it is read once. | None. |
| 2 | 26-28 | D4 | `detectAospImage(platform, headers)` is a one-line pass-through to upstream `detectTelephonyProfile(platform, headers, 'AlphaTelephony')`; used in-file and by one test. | Inline at L36; test calls upstream with the plugin name. | Low. |
| 3 | 30 | D7 | `admittedAospViews(image, admitted = ADMITTED_AOSP_VIEW_ADAPTERS)` — the second parameter exists for tests. | Drop the parameter. | Low. |
| 4 | 14 | A7 | `AOSP_TELEPHONY_PLUGIN` exported, 0 external importers. | Unexport. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `'AlphaTelephony'` plugin name | const | 14 | `AlphaTelephonyPlugin.java`, `MainActivity.java` registration, aosp-telephony.ts | keep |
| `AOSP_IMAGE_VIEWS` / `ADMITTED_AOSP_VIEW_ADAPTERS` | const | 16, 23 | `mvp-features.ts` view lists | keep (manifest-pinned names) |

## Proposed end state
~22 lines: two constants, `admittedAospViews(image)`, `aospImage` computed inline from upstream `detectTelephonyProfile`. Behaviour identical.

## Verification
`test/aosp-image-capability.test.mjs`, `test/aosp-sms.test.mjs`, `test/quint-view-admission.test.mjs`, `test/wallet-disabled.test.mjs`; quint services replays; AOSP image boot for the true branch (APK/emulator runs only prove the false branch).
