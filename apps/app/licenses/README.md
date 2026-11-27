# Third-party license sources

`apps/app/scripts/licences.ts` builds `apps/app/public/licenses/third-party-notices.json`
(`[{name, version, license, source, text, flags, obligations?, textSource?}]`) and
`THIRD_PARTY_NOTICES.txt` beside it. Vite copies both into `apps/app/dist/licenses/`, so they
ship in the web bundle and in every APK's `assets/public`.

```sh
pnpm --filter @repo/app licences                         # regenerate notices
pnpm --filter @repo/app licences --check                 # fail if stale or an input is broken
pnpm --filter @repo/app licences --sbom artifacts/sbom/alpha.cdx.json
pnpm --filter @repo/app exec vitest run test/image.test.ts -t "Ship what Alpha is built from"
```

## Policy: licences are included and flagged, never blocking

Owner decision P-09 (2026-10-10): an open-source dependency licence never stops a build and is
never a release blocker. Every licence text and notice still ships, and anything copyleft,
unknown or unverified is flagged with what it obliges. The policy is specified in
`spec/app/image/licences.md` and enforced by `apps/app/scripts/licences.ts`.

- Generation never fails on what an open-source licence is. It exits 0 and prints each flag as
  `LICENCE FLAG <flag>: <package>@<version> (<licence>)` on standard error.
- A package with no licence file gets the canonical text of its declared licence from
  `<SPDX id>.txt` in this directory, `textSource: "spdx-canonical"` and the flag
  `licence-text-missing-from-package`.
- Generation fails only on broken input: a missing dependency, an unreadable `package.json`, a
  pinned OCR binary or licence copy that drifted from its recorded hash, a malformed
  `font-licenses.json` record, or an unrun/unresolved bundled font check.
- A flag is a record of what was found. It is not legal review and not a clearance.

Proprietary fonts are outside the open-source policy. The Denton typeface is recorded in
`font-licenses.json` on the owner's statement and stays flagged
`proprietary-licence-held-outside-repo`.

## Inputs

- Production npm packages resolved from `apps/app` and workspace dependencies (`pnpm-lock.yaml`),
  with licence files read from `node_modules`.
  Optional esbuild, Vite, Rolldown and Lightning CSS packages restricted to macOS, Linux or
  Windows are build-host inputs. The inventory still includes the parent packages and portable
  optional packages.
- `.eliza/LICENSE` at the commit pinned by `eliza.lock.json` (read only).
- `tesseract-core/`: licence copies for the libraries statically linked into the
  `tesseract.js-core` WebAssembly cores in `public/ocr/` (Tesseract, Leptonica, libjpeg, libpng,
  LibTIFF, libwebp, GIFLIB, zlib, OpenLibm), pinned by `tesseract-core/sources.json`, plus
  `tessdata-APACHE-2.0.txt` / `public/ocr/tessdata-LICENSE.txt`.
- `android-runtime-classpath.json`: resolved Android runtime classpath coordinates and their
  Maven library families (including `checker-qual-3.43.0-LICENSE.txt`).
- `font-licenses.json`: bundled font records keyed by SHA-256 against `packages/design-system/fonts`.
- Canonical SPDX texts: `0BSD.txt`, `Apache-2.0.txt`, `BSD-2-Clause.txt`, `BSD-3-Clause.txt`,
  `ISC.txt`, `MIT.txt`, `MPL-2.0.txt`, `Unlicense.txt`, `GPL-2.0.txt`, `GPL-3.0.txt`,
  `LGPL-3.0.txt`, `AGPL-3.0.txt`, `OFL-1.1.txt`, and `ODbL-1.0.txt`.
- Component notices: `Phonon-2-LICENSE-WEIGHTS-CC-BY-4.0.txt`, `Phonon-2-NOTICE.txt`,
  `mediabunny-MPL-2.0.txt`, `tessdata-APACHE-2.0.txt`.
- Governance records: `unverified-allowlist.json` and `packaged-runtime-allowlist.json`.
