#!/usr/bin/env bash
# 06-flash.sh: flash $WORK/img$VERSION_CODE.zip to the Pixel WITHOUT wiping (fastboot update, never -w).
# Refuses to run unless CONFIRM_FLASH=yes. Saves the rollback artifacts first and refuses to flash if the
# image that is on the phone now cannot be put back.
#   CONFIRM_FLASH=yes ALPHA_DIR=/path/to/alpha VERSION_CODE=632 ./06-flash.sh
# Optional: ROLLBACK_IMG=/path/to/imgNNN.zip (default: ~/.cache/alpha-v612/image/img<running build>.zip)
#           ROLLBACK_RECEIPT=/path/to/image-evidence.json (default: img<running build>.evidence.json beside the image)
# Before running: the owner has agreed to this flash, and no other session is flashing or driving the phone.
set -euo pipefail
. "$(dirname "$0")/env.sh"
[ "${CONFIRM_FLASH:-}" = yes ] || die "refusing to flash: set CONFIRM_FLASH=yes after the owner has agreed and steps 1-5 passed"
[ "$#" = 0 ] || die "this script takes no arguments (and never passes -w)"
IMG=$WORK/img$VERSION_CODE.zip
need "$IMG"; need "$WORK/Launcher$VERSION_CODE.apk"
EVIDENCE="$(dirname "$0")/lib/image-evidence.py"
NEWSHA=$(python3 -I "$EVIDENCE" check "$WORK/image-evidence.json" "alpha.v$VERSION_CODE" "$IMG" "$(sha256_of "$WORK/Launcher$VERSION_CODE.apk")") \
  || die "the image or signed launcher does not match the output of step 5"
if pgrep -af 'fastboot' | grep -v pgrep; then die "a fastboot process is already running: another session is flashing"; fi
[ "$(timeout 10 "$ADB" -s "$SERIAL" get-state 2>/dev/null)" = device ] || die "phone $SERIAL is not in adb 'device' state"

TS=$(date +%Y%m%d-%H%M%S)
RB=$ROLLBACK_DIR/$TS-before-v$VERSION_CODE
mkdir -p "$RB"

say "1/6 Recording the phone as it is now -> $RB"
adbsh getprop > "$RB/getprop.txt"
adbsh dumpsys package "$PKG" > "$RB/package.txt"
adbsh pm list packages -f > "$RB/packages.txt"
for r in HOME DIALER SMS ASSISTANT BROWSER; do echo "$r: $(adbsh cmd role get-role-holders android.app.role.$r)"; done | tee "$RB/roles.txt"
timeout 20 "$ADB" -s "$SERIAL" exec-out screencap -p > "$RB/screen.png" || true
FP=$(adbsh getprop ro.build.fingerprint); INC=$(adbsh getprop ro.build.version.incremental); SLOT=$(adbsh getprop ro.boot.slot_suffix)
CUR=$(sed -n 's/^ *versionCode=\([0-9]*\).*/\1/p' "$RB/package.txt" | head -1)
echo "fingerprint $FP  slot $SLOT  installed versionCode $CUR"
[ -n "$CUR" ] && [ "$VERSION_CODE" -gt "$CUR" ] || die "VERSION_CODE $VERSION_CODE does not exceed the installed $CUR"
grep -q 'UPDATED_SYSTEM_APP' "$RB/package.txt" && die "a /data update sits over the system app; it would outrank the new image's launcher. Resolve with the owner first (pm uninstall-system-updates $PKG keeps app data)"
case "$INC" in alpha.v*) ;; *) die "the phone runs '$INC', not a local alpha.vNNN image: this lane has no rollback image for it" ;; esac

say "2/6 Rollback artifacts: the image on the phone now, its launcher, and the tree's vendor/alphaphone backup"
RBIMG=${ROLLBACK_IMG:-$LEGACY_IMAGE_DIR/img${INC#alpha.v}.zip}
RBEVIDENCE=${ROLLBACK_RECEIPT:-${RBIMG%.zip}.evidence.json}
[ -f "$RBIMG" ] || die "rollback image $RBIMG does not exist: cannot return to $INC, not flashing"
need "$RBEVIDENCE"
echo "testing $RBIMG (2 GB, about a minute)"; unzip -tq "$RBIMG" > /dev/null || die "rollback image $RBIMG is corrupt"
cp --reflink=auto "$RBIMG" "$RB/rollback-img.zip"
DEVSHA=$(adbsh sha256sum /product/priv-app/AlphaPhone/AlphaPhone.apk | cut -d' ' -f1 || true)
RBSHA=$(python3 -I "$EVIDENCE" check "$RBEVIDENCE" "$INC" "$RB/rollback-img.zip" "$DEVSHA") \
  || die "the rollback image and the phone's launcher must match the same verified build record"
cp "$RBEVIDENCE" "$RB/rollback-image-evidence.json"
VBK=$ROLLBACK_DIR/vendor-alphaphone-before-v$VERSION_CODE
[ -d "$VBK" ] || die "no vendor/alphaphone backup at $VBK (step 4 writes it)"
cat > "$RB/ROLLBACK.md" <<EOF
# Rollback to $INC (written $TS before flashing alpha.v$VERSION_CODE)

Phone before the flash: $FP, slot $SLOT, launcher versionCode $CUR.
Rollback image: $RB/rollback-img.zip (sha256 $RBSHA; source $RBIMG).

1. Put the phone in the bootloader: \`$ADB -s $SERIAL reboot bootloader\`, or hold Power + Volume Down from off.
2. \`$FASTBOOT -s $SERIAL update $RB/rollback-img.zip\`   (no -w: user data is kept)
3. After boot: \`dumpsys package $PKG\` shows versionCode $CUR under /product/priv-app/AlphaPhone; HOME, DIALER and SMS
   are $PKG (if a role fell back: \`adb shell cmd role add-role-holder android.app.role.SMS $PKG\`, same for DIALER).
4. AOSP tree: restore \`$VBK\` over \`$VENDOR\` before building another legacy image.

Not restored by this: Alpha's app data. fastboot update keeps /data, so whatever the Vibestack build wrote or
adopted there stays. A system app going back from $VERSION_CODE to $CUR on kept data has not been tried.
Last resort (wipes the phone): the stock factory image $FACTORY_ZIP.
EOF
echo "rollback recipe: $RB/ROLLBACK.md"

say "3/6 Testing the new image $IMG"
unzip -tq "$IMG" > /dev/null || die "new image zip is corrupt"
echo "new image sha256 $NEWSHA"
printf '{"startedAt":"%s","image":"%s","imageSha256":"%s","wipe":false,"from":"%s","rollback":"%s"}\n' "$(date -Is)" "$IMG" "$NEWSHA" "$FP" "$RB/rollback-img.zip" > "$WORK/flash-start.json"

say "4/6 Rebooting to the bootloader"
"$ADB" -s "$SERIAL" reboot bootloader
for i in $(seq 1 40); do timeout 8 "$FASTBOOT" devices 2>/dev/null | grep -q "^$SERIAL" && break; sleep 3; done
getvar() { timeout 10 "$FASTBOOT" -s "$SERIAL" getvar "$1" 2>&1 | sed -n "s/^$1: //p" | head -1; }
[ "$(getvar product)" = stallion ] || die "bootloader does not report product stallion (phone is in the bootloader; '$FASTBOOT -s $SERIAL reboot' returns it to the current image)"
[ "$(getvar unlocked)" = yes ] || die "bootloader is not unlocked ('$FASTBOOT -s $SERIAL reboot' returns to the current image)"
echo "bootloader $(getvar version-bootloader)  baseband $(getvar version-baseband)  (2026-11-22 flashes: stallion-17.0-15819938 / g5400i-260604-260807-B-16035863)"

say "5/6 fastboot update (no wipe)"
FLASH_LOG=$WORK/flash.fastboot.log
rc=0
"$FASTBOOT" -s "$SERIAL" update "$IMG" > "$FLASH_LOG" 2>&1 || rc=$?
tail -n 6 "$FLASH_LOG"
if [ "$rc" = 0 ]; then done=true; else done=false; fi
printf '{"finishedAt":"%s","imageSha256":"%s","wipe":false,"ok":%s}\n' "$(date -Is)" "$NEWSHA" "$done" > "$WORK/flash-result.json"
[ "$rc" = 0 ] || die "fastboot exited $rc and the phone may hold a partial image. Check $FLASH_LOG and use $RB/ROLLBACK.md"

say "6/6 Waiting for the new image to boot (up to 10 minutes)"
timeout 300 "$ADB" -s "$SERIAL" wait-for-device || die "the phone did not come back on adb within 5 minutes. Roll back: $RB/ROLLBACK.md"
BOOTED=0
for i in $(seq 1 120); do [ "$(adbsh getprop sys.boot_completed 2>/dev/null)" = 1 ] && { BOOTED=1; break; }; sleep 5; done
[ "$BOOTED" = 1 ] || die "boot did not complete in 10 minutes (boot loop?). Capture 'adb logcat -d -b all' if adb answers, then roll back: $RB/ROLLBACK.md"
echo "booted: $(adbsh getprop ro.build.fingerprint)"
echo "FLASH DONE. This is a flash and a boot, not acceptance. Next: ./07-postflash-checks.sh (the owner unlocks the phone first)."
