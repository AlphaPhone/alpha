#!/usr/bin/env bash
# 07-postflash-checks.sh: read-only adb checks of the flashed image. Changes nothing on the phone
# (no installs, no role commands, no input). Saves what it read under $WORK/postflash-<time>/.
#   ALPHA_DIR=/path/to/alpha VERSION_CODE=632 ./07-postflash-checks.sh
#   PHASE=pre ... ./07-postflash-checks.sh     same reads on the legacy build before the flash, nothing asserted
# Baseline for comparison: device/baseline/ (legacy alpha.v630, captured 2026-11-23 12:12).
set -euo pipefail
. "$(dirname "$0")/env.sh"
PHASE=${PHASE:-post}
OUT=$WORK/${PHASE}flash-$(date +%Y%m%d-%H%M%S); mkdir -p "$OUT"
BASE=$DEVICE_DIR/baseline
FAIL=0
bad() { echo "FAIL: $*"; FAIL=$((FAIL + 1)); }
ok() { echo "ok:   $*"; }
expect() { [ "$PHASE" = post ]; }   # assertions apply only after the flash
exec > >(tee "$OUT/checks.txt") 2>&1
[ -n "$SERIAL" ] || die "set ALPHA_SERIAL to the target phone"
[ "$(timeout 10 "$ADB" -s "$SERIAL" get-state 2>/dev/null)" = device ] || die "phone $SERIAL is not in adb 'device' state"

say "Image"
adbsh getprop > "$OUT/getprop.txt"
FP=$(adbsh getprop ro.build.fingerprint); echo "fingerprint: $FP"
echo "build date: $(adbsh getprop ro.build.date)  slot: $(adbsh getprop ro.boot.slot_suffix)  boot_completed: $(adbsh getprop sys.boot_completed)"
if expect; then case "$FP" in *"/alpha.v$VERSION_CODE:userdebug/test-keys") ok "fingerprint is alpha.v$VERSION_CODE" ;; *) bad "fingerprint is not alpha.v$VERSION_CODE (did another session flash? did the flash apply?)" ;; esac; fi

say "Launcher package"
adbsh dumpsys package "$PKG" > "$OUT/package.txt"
adbsh pm list packages -f > "$OUT/packages.txt"
VC=$(sed -n 's/^ *versionCode=\([0-9]*\).*/\1/p' "$OUT/package.txt" | head -1)
CP=$(sed -n 's/^ *codePath=//p' "$OUT/package.txt" | head -1)
echo "versionCode=$VC versionName=$(sed -n 's/^ *versionName=//p' "$OUT/package.txt" | head -1) codePath=$CP"
grep -m1 'signatures=' "$OUT/package.txt" || true
grep -E "=$PKG$" "$OUT/packages.txt" || true
if expect; then
  [ "$VC" = "$VERSION_CODE" ] && ok "versionCode $VC" || bad "versionCode is $VC, expected $VERSION_CODE"
  [ "$CP" = /product/priv-app/AlphaPhone ] && ok "system app under /product/priv-app" || bad "codePath is $CP: a /data copy is shadowing the image's launcher"
  grep -q 'UPDATED_SYSTEM_APP' "$OUT/package.txt" && bad "UPDATED_SYSTEM_APP: a /data update sits over the system app" || ok "no /data update over the system app"
  [ "$(grep -cE "=$PKG$" "$OUT/packages.txt")" = 1 ] && ok "one installed path for $PKG" || bad "more than one path for $PKG"
  grep -E '^ *(pkgFlags|flags)=\[' "$OUT/package.txt" | grep -q 'DEBUGGABLE' && bad "launcher is debuggable (image telephony refuses it)" || ok "not debuggable"
  grep -q 'PRIVILEGED' "$OUT/package.txt" && ok "privileged" || bad "not flagged PRIVILEGED"
  # Same key as the legacy build => the same PackageSignatures value as the baseline (289df855 on 2026-11-23).
  B=$(grep -m1 -o 'signatures:\[[0-9a-f]*\]' "$BASE/package.txt" || true); N=$(grep -m1 -o 'signatures:\[[0-9a-f]*\]' "$OUT/package.txt" || true)
  [ -n "$B" ] && [ "$B" = "$N" ] && ok "signer unchanged from the legacy baseline ($N)" || bad "signer $N differs from the baseline $B"
  DEVSHA=$(adbsh sha256sum /product/priv-app/AlphaPhone/AlphaPhone.apk | cut -d' ' -f1 || true)
  if [ -f "$WORK/Launcher$VERSION_CODE.apk" ]; then
    [ "$DEVSHA" = "$(sha256_of "$WORK/Launcher$VERSION_CODE.apk")" ] && ok "on-device launcher bytes == $WORK/Launcher$VERSION_CODE.apk (cert $EXPECT_CERT)" || bad "on-device launcher sha256 $DEVSHA is not the signed APK of this run"
  fi
fi
echo "native libraries on the image: $(adbsh ls /product/priv-app/AlphaPhone/lib/arm64 | tr '\n' ' ')"

say "Roles"
for r in HOME DIALER SMS ASSISTANT BROWSER; do
  H=$(adbsh cmd role get-role-holders android.app.role.$r); echo "$r: $H" | tee -a "$OUT/roles.txt"
  case "$r" in HOME|DIALER|SMS) if expect; then [ "$H" = "$PKG" ] && ok "$r held by Alpha" || bad "$r is '$H'. Not changed by this script. To give it back deliberately: adb shell cmd role add-role-holder android.app.role.$r $PKG"; fi ;; esac
done

say "Image telephony: capability overlay, image feature, role handler override"
grep -E 'imagecapabilities|overlay' "$OUT/packages.txt" | sed 's/^/  /' || true
FEATURES=$(adbsh pm list features || true); grep -q "$PKG.aosp_image" <<<"$FEATURES" && ok "feature $PKG.aosp_image" || { expect && bad "image feature $PKG.aosp_image missing" || true; }
grep -q "=$PKG.imagecapabilities$" "$OUT/packages.txt" && ok "AlphaImageCapabilityOverlay installed" || { expect && bad "capability overlay package missing" || true; }
grep -A12 'enabledComponents:' "$OUT/package.txt" | head -14 || true

say "Permissions against the legacy baseline"
grants() { sed -n 's/^ *\([A-Za-z0-9_.]*\): granted=true.*/\1/p' "$1" | sort -u; }
grants "$BASE/package.txt" > "$OUT/granted.legacy.txt"; grants "$OUT/package.txt" > "$OUT/granted.now.txt"
LOST=$(comm -23 "$OUT/granted.legacy.txt" "$OUT/granted.now.txt" | tr '\n' ' '); GAINED=$(comm -13 "$OUT/granted.legacy.txt" "$OUT/granted.now.txt" | tr '\n' ' ')
echo "granted now: $(wc -l < "$OUT/granted.now.txt")  legacy: $(wc -l < "$OUT/granted.legacy.txt")"
echo "lost:   ${LOST:-none}"; echo "gained: ${GAINED:-none}"
if expect; then [ -z "$LOST" ] && ok "no grant lost" || bad "grants lost since the legacy build: $LOST"; fi
grep -q 'android.permission.READ_PRIVILEGED_PHONE_STATE: granted=true' "$OUT/package.txt" && ok "READ_PRIVILEGED_PHONE_STATE granted" || { expect && bad "READ_PRIVILEGED_PHONE_STATE not granted (privapp allow-list)" || true; }

say "Process, agent service, crashes, SELinux denials"
echo "pid: $(adbsh pidof "$PKG" || true)"
adbsh dumpsys activity services "$PKG" | grep -E 'ServiceRecord|isForeground' | head -8 || true
timeout 30 "$ADB" -s "$SERIAL" logcat -d -b crash 2>/dev/null | tail -40 > "$OUT/crash.txt" || true
grep -c 'FATAL EXCEPTION' "$OUT/crash.txt" | sed 's/^/FATAL EXCEPTION lines in the crash buffer: /' || true
timeout 30 "$ADB" -s "$SERIAL" logcat -d 2>/dev/null | grep -E 'avc: *denied' | grep -E 'alphaphone|priv_app' | tail -30 > "$OUT/avc.txt" || true
echo "avc denials naming Alpha or priv_app: $(wc -l < "$OUT/avc.txt") (-> $OUT/avc.txt; the new workflow.v1 abstract socket is the one to look for, register row A-034)"

say "Network preconditions for sign-in and Cloud checks"
CONN=$(adbsh dumpsys connectivity || true); grep -q 'VPN CONNECTED' <<<"$CONN" && echo "WARN: a VPN is connected (dead gnirehtet reverse tether black-holes traffic)" || ok "no VPN connected"
adbsh pm get-app-links "$PKG" | head -12 || true

say "Screen"
adbsh dumpsys window | grep -m1 -o 'isKeyguardShowing=[a-z]*' || true
timeout 20 "$ADB" -s "$SERIAL" exec-out screencap -p > "$OUT/screen.png" || true
echo "screenshot: $OUT/screen.png"

say "Result"
if [ "$PHASE" != post ]; then echo "PRE-FLASH SNAPSHOT saved in $OUT (nothing asserted)"; exit 0; fi
[ "$FAIL" = 0 ] && echo "POST-FLASH CHECKS OK: package, signer, roles, grants (adb evidence only; not the on-device checklist in DEVICE-CHECKS.md, and not acceptance)" \
  || { echo "POST-FLASH CHECKS: $FAIL problem(s)"; exit 1; }
