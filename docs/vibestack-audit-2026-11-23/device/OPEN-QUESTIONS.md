# Open questions for the Pixel qualification

These leads come from the November 23, 2026 review of Alpha's Vibestack
port at `7c2338706`, its Eliza pin at `6451775c35a`, legacy Alpha at
`dd63c6bc6` and a read-only v630 device snapshot. Recheck them on the
candidate commit and record what remains open. The [audit register](../REGISTER.md)
has the source findings.

## Build and staging

- Has the exact candidate run the normal release build and APK verifier?
  Confirm the debug and release records in `apk-manifest.json` and retain
  the instrumentation artifact. Check the SDK ancestry guard against the
  correct release line. The older Vibestack pin and the legacy `main`
  pin belonged to different upstream histories.
- The legacy AOSP tree was staged for Bun. The Vibestack launcher uses
  `libeliza_node.so`. Confirm the current Pixel tree meets the pinned
  staging contract and its reviewed Soong and branding inputs before
  bringing the generated vendor add-on into the image.
- The legacy v631 Soong build exited 137 before producing a usable image.
  Check the tree and output directories after the host reboot. Determine
  the build's resource needs and confirm the exact launcher bytes and
  rebuilt libraries in the new image. A prior incremental build's timing
  does not measure a build with changed Soong inputs.
- On a cold cache, verify that the pinned engine and voice inputs can
  be fetched and the Android Node archives meet the runtime lock.
- Compare the built manifest and privileged allow-list to the legacy
  image. Confirm privileged permission enforcement and launcher roles
  after boot.

## Continuity and recovery

- The audit identified unadopted resident state, outstanding Inbox
  sends, stored renderer choices, encrypted drafts and Cloud sign-in
  differences. Check register rows A-001, A-010, A-012, A-013, A-015
  and E-004 again on the current source. Decide with the owner whether
  the observed gaps preclude a retained-data update.
- Verify the running legacy image and its rollback artifact against a
  matching build record. The v630 build version is known, but its
  Alpha source commit was absent from the available build summary.
- Does the legacy launcher read kept data after a rollback from the
  advancing version? The earlier no-wipe image updates do not answer
  this. Treat a rollback with kept data as unqualified until tested.
- Capture baseline observations for the unchecked legacy rows while
  the v630 image is available. The old WebView driver depends on
  selectors that changed in the port. Use the visible controls and
  verify the target of every operation.
- The retired Alpha package and test packages were present in the
  baseline. Record these as context when comparing installed apps and
  roles. Use the phone's time zone for calendar and reminder checks.
