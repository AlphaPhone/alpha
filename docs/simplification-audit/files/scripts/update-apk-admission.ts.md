# scripts/update-apk-admission.ts
- Lines: 119 | Kind: release script module (update APK identity/signing admission) | Verdict: KEEP, light SIMPLIFY
- Covers: before publishing an update manifest, inspects the exact APK bytes (aapt badging/xmltree, `owner/InspectUpdateApk.java` via apksigner) and admits it only if the release signer, package, versionCode, HOME/flavor markers, compiled public update channel and any signing rotation match. Duplicates: channel parsing reuses `update-channel.ts` (good). Callers/importers: `scripts/publish-update-manifest.ts`; listed in `scripts/quint-lib.ts:37` (source enumeration); `test/update-apk-admission.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 71, 73, 76 | B2/B4 | `signing?.verified`, `archive?.packageName`, `signing.activeSignerSha256 ?? ''` optional chains on required, typed parameters. | Plain property access; the HEX tests stay (they are the boundary check on Java output). | Low |
| 2 | 58 | B3 | `typeof publicUrl === 'string'` on a typed `string` parameter. | Keep only the non-empty check. | Low |
| 3 | 61, 117 | C3 | Inline `createHash('sha256')…hex` and `updateArtifactDigest` for one file. | `scripts/lib/hash.ts` (`sha256Hex`, `sha256File`). | Low |
| 4 | 115 | C3 | Inline `JSON.parse(readFileSync('../app.config.json'))`; same read exists in ~20 scripts. | `readAppConfig()` in `scripts/lib/`. | Low |
| 5 | 111–117 | — | Reads the file size, inspects, then re-hashes to detect change during admission. This is a real TOCTOU guard on a release input; keep. | — | — |
| 6 | 29–36 | — | `Rotation` optional fields mirror `release-signer.json`; the type is also declared in `build-android.ts` (`ReleaseSigner`). | Import the rotation type from the owner of `release-signer.json` instead of re-declaring (C1). | Low |

## Proposed end state
Same behaviour; ~105 lines; optional chains on typed values removed; hashing and app-config reads from `scripts/lib/`; rotation type imported. The admission rules (signer, rotation lineage, HOME marker, public channel) are untouched — they gate real phones (D17).
