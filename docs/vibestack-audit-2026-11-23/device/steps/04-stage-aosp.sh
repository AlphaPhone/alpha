#!/usr/bin/env bash
# 04-stage-aosp.sh: put the signed launcher into the AOSP tree's vendor/alphaphone.
# Backs up the current vendor/alphaphone first. Changes ONLY launcher-owned files there:
#   Launcher.apk, launcher.json, native-arm64/, native-libraries.json, config.fs, Android.bp
# and leaves product.mk, branding, the telephony role override (provisioning/alpha-telephony-components.xml),
# the capability overlay (image-capabilities/), sepolicy, default/privapp permission XML and the rest as they are.
#
#   ALPHA_DIR=/path/to/alpha VERSION_CODE=632 ./04-stage-aosp.sh
# STAGE_MODE (default: launcher)
#   launcher  the checkout's own launcher-overlay and native stagers into a scratch directory, no AOSP source
#             contract, then transplant. Expected path for Vibestack. UNTESTED (see RUNBOOK step 4).
#   official  the full `aosp:stage --target pixel10a --development --owner-telephony` into a scratch directory,
#             then the same transplant. Expected to be REFUSED on this tree (RUNBOOK step 4); try it when the
#             launcher mode is in doubt. Reads the whole AOSP tree: heavy.
#   swap      the legacy ~/.cache/alpha-v612/image/swap.py. Only valid when the APK's arm64 library set equals
#             the staged one; refused otherwise (Vibestack changes the set).
set -euo pipefail
STEPS=$(cd "$(dirname "$0")" && pwd)
. "$STEPS/env.sh"
MODE=${STAGE_MODE:-launcher}
APK=$WORK/Launcher$VERSION_CODE.apk
OUT=$WORK/stage-out
need "$APK"; need "$VENDOR/launcher.json"; need "$VENDOR/native-libraries.json"; need "$VENDOR/provisioning/alpha-telephony-components.xml"
if pgrep -af 'soong_ui|build-image' | grep -v pgrep; then die "an image build is running: do not change vendor/alphaphone under it"; fi
HASH=$(sha256_of "$APK")
CERT=$("$BT/apksigner" verify --print-certs "$APK" | sed -n 's/^Signer #1 certificate SHA-256 digest: //p' | head -1)
[ "$CERT" = "$EXPECT_CERT" ] || die "APK signer $CERT is not the debug key"

say "Checking that every telephony role handler the image override enables exists in this APK"
"$BT/aapt2" dump xmltree --file AndroidManifest.xml "$APK" > "$WORK/manifest.tree.txt"
MISSING=0
for cls in $(sed -n 's/.*<component class="\([^"]*\)".*/\1/p' "$VENDOR/provisioning/alpha-telephony-components.xml"); do
  grep -q "\"$cls\"" "$WORK/manifest.tree.txt" && echo "ok:   $cls" || { echo "MISSING in APK manifest: $cls"; MISSING=$((MISSING + 1)); }
done
[ "$MISSING" = 0 ] || die "$MISSING role handler(s) named by the staged telephony override are not in this APK: the override must be regenerated (STAGE_MODE=official) before an image is built"
# The capability overlay (image-capabilities/) targets the launcher's AlphaImageProvisioning overlayable.
OVERLAYABLE=$("$BT/aapt2" dump overlayable "$APK" 2>/dev/null || true)
grep -q 'AlphaImageProvisioning' <<<"$OVERLAYABLE" && echo "ok:   AlphaImageProvisioning overlayable present" \
  || echo "WARN: could not confirm the AlphaImageProvisioning overlayable with aapt2; without it the capability overlay targets nothing and Phone/SMS stay off (check android/app/src/main/res in the checkout)"

say "Backing up the current vendor/alphaphone (once per VERSION_CODE)"
BK=$ROLLBACK_DIR/vendor-alphaphone-before-v$VERSION_CODE
mkdir -p "$ROLLBACK_DIR"
if [ -e "$BK" ]; then echo "backup already exists: $BK"; else cp -a --reflink=auto "$VENDOR" "$BK"; echo "backup: $BK (launcher $(python3 -I -c 'import json,sys;print(json.load(open(sys.argv[1]))["apkSha256"])' "$BK/launcher.json"))"; fi

transplant() { # $1 = a stage output holding Launcher.apk, launcher.json, native-arm64, native-libraries.json, config.fs, Android.bp
  local from=$1 f
  for f in Launcher.apk launcher.json native-libraries.json config.fs Android.bp native-arm64; do need "$from/$f"; done
  [ "$(sha256_of "$from/Launcher.apk")" = "$HASH" ] || die "staged Launcher.apk differs from the signed APK"
  grep -q 'prebuilt_priv_app_native' "$from/Android.bp" || die "generated Android.bp has no prebuilt_priv_app_native modules (launcher not staged as a priv-app, or natives not finalized for Soong)"
  for f in '"AlphaPhone"' '"AlphaPhoneDefaultPermissions"' '"AlphaPhonePrivappPermissions"'; do
    grep -q "name: $f" "$from/Android.bp" || die "generated Android.bp does not define $f, which vendor/alphaphone/product.mk installs"
  done
  say "For the record: generated product.mk and permission XML against the tree's (the tree's are kept)"
  for f in product.mk default-permissions.xml privapp-permissions.xml; do [ -f "$from/$f" ] && { diff "$from/$f" "$VENDOR/$f" > "$WORK/diff.$f.txt" || true; echo "$f: $(wc -l < "$WORK/diff.$f.txt") diff lines -> $WORK/diff.$f.txt"; }; done
  if [ -f "$from/provisioning/alpha-telephony-components.xml" ]; then
    diff "$from/provisioning/alpha-telephony-components.xml" "$VENDOR/provisioning/alpha-telephony-components.xml" && echo "telephony override: identical to the tree's" \
      || { [ "${TAKE_TELEPHONY_OVERRIDE:-no}" = yes ] && cp "$from/provisioning/alpha-telephony-components.xml" "$VENDOR/provisioning/" && echo "telephony override: replaced from the stage" \
           || die "the stage wrote a different telephony override (diff above). Review it, then rerun with TAKE_TELEPHONY_OVERRIDE=yes"; }
  fi
  say "Replacing launcher-owned files in $VENDOR"
  rm -rf "$VENDOR/native-arm64"
  cp -a "$from/native-arm64" "$VENDOR/native-arm64"
  cp "$from/native-libraries.json" "$from/config.fs" "$from/Android.bp" "$from/launcher.json" "$VENDOR/"
  cp --reflink=auto "$from/Launcher.apk" "$VENDOR/Launcher.apk"
}

case "$MODE" in
swap)
  say "Legacy swap: checking the library sets match"
  python3 -I - "$APK" "$VENDOR" <<'PY' || die "library sets differ: swap.py cannot be used (it reads each listed apkEntry and would stop on the first missing one). Use STAGE_MODE=launcher"
import json, os, sys, zipfile
apk, v = sys.argv[1], sys.argv[2]
listed = {l['apkEntry'] for l in json.load(open(os.path.join(v, 'native-libraries.json')))['libraries']}
packed = {n for n in zipfile.ZipFile(apk).namelist() if n.startswith('lib/arm64-v8a/')}
print('only in tree list:', sorted(listed - packed)); print('only in APK:', sorted(packed - listed))
sys.exit(0 if listed == packed else 1)
PY
  say "Running the legacy swap.py"
  python3 -I "$LEGACY_IMAGE_DIR/swap.py" "$APK" "$VENDOR" | tee "$WORK/stage.sum"
  ;;
launcher)
  [ ! -e "$OUT" ] || die "$OUT already exists: the stager needs a new directory (move it aside)"
  say "Writing the launcher descriptor (permission lists from the tree's launcher.json; privileged = READ_PRIVILEGED_PHONE_STATE only)"
  python3 -I - "$VENDOR/launcher.json" "$WORK/launcher-descriptor.json" "$HASH" "$EXPECT_CERT" <<'PY'
import json, sys
src, dst, apk_hash, cert = sys.argv[1:5]
old = json.load(open(src))
new = {"schemaVersion": 1, "brand": old["brand"], "moduleName": old["moduleName"], "packageName": old["packageName"],
       "apkSha256": apk_hash, "certificateSha256": cert, "defaultPermissions": old["defaultPermissions"],
       "privilegedPermissions": ["android.permission.READ_PRIVILEGED_PHONE_STATE"]}
open(dst, "w").write(json.dumps(new, indent=2) + "\n"); print(json.dumps(new, indent=2))
PY
  say "Upstream launcher overlay stager (development) -> $OUT"
  ( cd "$ALPHA_DIR" && env "${BUILD_ENV[@]}" node vendor/eliza/packages/os/aosp/stage-launcher-overlay.ts \
      --descriptor "$WORK/launcher-descriptor.json" --apk "$APK" --output "$OUT" --aapt "$BT/aapt" --apksigner "$BT/apksigner" --development )
  say "Checkout's own Pixel native staging (verifies the packaged runtime against the pin; writes native-arm64, config.fs, Soong Android.bp)"
  ( cd "$ALPHA_DIR" && env "${BUILD_ENV[@]}" node --conditions=eliza-source --import vibelang/register "$STEPS/lib/stage-natives.mjs" \
      "$ALPHA_DIR" "$APK" "$OUT" "$WORK/launcher-descriptor.json" ) | tee "$WORK/stage-natives.json"
  transplant "$OUT"
  ;;
official)
  [ ! -e "$OUT" ] || die "$OUT already exists: aosp:stage needs a new directory (move it aside)"
  say "Full owner development stage into $OUT (reads the whole AOSP tree; refusal is expected, see RUNBOOK step 4)"
  heavy 8 node --conditions=eliza-source --import vibelang/register scripts/stage-aosp.ts \
    --target pixel10a --aosp-source "$AOSP" --factory-image "$FACTORY_ZIP" --apk "$APK" \
    --development --owner-telephony --applied-build-patch soong-memory --output "$OUT" 2>&1 | tee "$WORK/aosp-stage.log"
  transplant "$OUT"
  ;;
*) die "unknown STAGE_MODE=$MODE (launcher | official | swap)" ;;
esac

say "Verifying what is now staged"
python3 -I - "$VENDOR" "$HASH" <<'PY' | tee -a "$WORK/stage.sum"
import hashlib, json, os, re, sys
v, want = sys.argv[1], sys.argv[2]
h = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
assert h(os.path.join(v, 'Launcher.apk')) == want, 'Launcher.apk is not the signed APK'
lj = json.load(open(os.path.join(v, 'launcher.json'))); nl = json.load(open(os.path.join(v, 'native-libraries.json')))
assert lj['apkSha256'] == want and nl['apkSha256'] == want, 'launcher.json / native-libraries.json name another APK'
bp = open(os.path.join(v, 'Android.bp')).read()
for lib in nl['libraries']:
    p = os.path.join(v, lib['path']); assert h(p) == lib['sha256'], lib['path']
    assert '/product/priv-app/AlphaPhone/lib/arm64/' in lib['installPath'], lib['installPath']
    assert f'src: "{lib["path"]}"' in bp, f'Android.bp has no module for {lib["path"]}'
on_disk = sorted(os.listdir(os.path.join(v, 'native-arm64'))); listed = sorted(os.path.basename(l['path']) for l in nl['libraries'])
assert on_disk == listed, f'native-arm64 {on_disk} != listed {listed}'
for src in re.findall(r'src: "([^"]+)"', bp): assert os.path.exists(os.path.join(v, src)), f'Android.bp src missing: {src}'
mk = open(os.path.join(v, 'product.mk')).read()
for needle in ('AlphaImageCapabilityOverlay', 'alpha-telephony-components.xml', 'branding/branding.mk', 'TARGET_FS_CONFIG_GEN += vendor/alphaphone/config.fs', 'SYSTEM_EXT_PRIVATE_SEPOLICY_DIRS += vendor/alphaphone/sepolicy'):
    assert needle in mk, f'product.mk lost: {needle}'
print('staged', want, 'libraries:', ', '.join(listed))
PY
echo "STAGE DONE (staging evidence only; not an image build or boot)"
