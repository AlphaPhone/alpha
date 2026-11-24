# Pixel qualification for the Vibestack cutover

This plan was prepared from the November 23, 2026 audit and a read-only
look at the Pixel running legacy v630. It records the evidence to gather
for the first Vibestack image.

## Build and stage the candidate

1. Record the Alpha commit, the Eliza pin and the launcher versionCode.
   Use a clean checkout with the pinned submodule and the toolchain from
   the [developer guide](../../development.md). Keep the release build
   inputs and outputs tied to this checkout.
2. Run the normal Android build and verifier.

   ```sh
   pnpm android:build:inputs
   pnpm android:build:local -- --release
   pnpm android:verify
   ```

   Retain the APK manifest, R8 mapping and build record. The debug and
   instrumentation APKs are test artifacts. The one launcher release APK
   is the candidate for image staging. Verify that it packages the
   resident runtime and on-device voice and passes the production bundle
   audit.
3. Use the signing and [Pixel 10a staging path](../../development.md#device-and-image-tooling)
   for the intended image. Owner development images with telephony use the
   documented `--development --owner-telephony` path and need a
   non-debuggable, locally signed launcher. A production image needs the
   admitted signed release APK and reviewed descriptor. Compare the
   package, signer and requested permissions with the intended baseline.
   Resolve source or patch mismatches through the reviewed staging
   contract before attempting a build.
4. Build from the staged product with the approved AOSP image producer.
   Save its source and build record, exact image digest, fingerprint,
   and the digest of the installed-from-image launcher. Verify the
   image's native libraries and permissions against the staging output.
   A clean build may need extra time and memory when Soong inputs change.

## Capture baseline and rollback evidence

On the target Pixel, capture the v630 observations requested in the
[device checklist](DEVICE-CHECKS.md) while the legacy image is available.
Use the explicitly selected adb serial for every read. Record the image
fingerprint, slot, launcher version and installed path, launcher digest,
HOME, DIALER and SMS role holders, image capability and package grants.
Check whether a user-installed update shadows the system APK. Store only
the evidence needed for each check and redact private content.

The operator verifies that the rollback image and launcher digests match
a build record for the image on the device. Keep those artifacts and the
last-known-good staging inputs. A system-partition rollback that keeps
`/data` does not restore Alpha's data to its pre-update state. Resolve
the retained-state concerns in [open questions](OPEN-QUESTIONS.md) before
changing the device.

## Qualify the booted image

After the owner authorizes the specific device and image, the operator
uses the reviewed Pixel update procedure. On boot, repeat the baseline
reads and confirm the expected new fingerprint, advancing launcher
version, exact installed APK digest, system package location, signer,
privileged permissions and roles. Check the crash buffer and any
SELinux denials connected to Alpha. Record boot and role evidence
separately from app behavior.

Work through the [device checklist](DEVICE-CHECKS.md) with the owner.
Report the APK build, AOSP boot, real integrations and owner acceptance
separately. If a check cannot be observed or safely exercised, record
it as pending.
