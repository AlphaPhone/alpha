# Alpha core launcher and shared Files defaults

This source packet belongs to Alpha's OS image, not per-device customization. It requires the exact frameworks/base revision in SOURCE-INPUTS.json.

- Core-launcher classification hides Alpha from the routine foreground-app manager only while the enabled preinstalled Alpha owns Home. Other apps, a sideloaded impostor, another selected launcher, and unknown identity keep normal controls. Voice Stop/Mute, App Info, ANR handling and renderer recovery are unchanged.
- Native Quick Settings defaults omit unavailable Wallet, Cast, mobile-data and device-control shortcuts. OS resources define both normal and split layouts. Version 2 updates known stock layouts once. Version 3 preserves an owner’s reviewed stock or custom layout. The repository records the version after saving the selected layout, then keeps subsequent owner edits.
- Provisioning and the post-update boot check apply a one-time shared-storage app-op default only to installed enabled system (or updated-system) Alpha for the primary user, outside device-owner or organization-owned managed-profile management and only while the app-op is unconfigured and the one-time marker (`alpha_shared_storage_default_granted`) has not yet been recorded. An existing allow or deny remains untouched and a subsequent `appops reset` will not re-grant. App-private storage permissions are not granted.

Note: `apps/app/scripts/aosp.ts` does not yet wire this branding packet automatically; apply it via `apply.py` on the reviewed `frameworks/base` checkout. There is no phone-side customization step.

Run `python3 prepare.py --fetch` to fetch missing public hash-pinned baseline inputs and reproduce the packet. An existing mismatched baseline fails without replacement. For separate read-only admission use the existing tool:

`python3 ../system-entry/apply.py /path/to/frameworks/base --manifest manifest.json`

The tool is read-only unless explicitly given `--apply`. Build and qualify the signed OS together with the keyboard change before deployment; do not replace the launcher's app data.

The launcher and its tile use `ai.alphacompute.alphaphone`.
