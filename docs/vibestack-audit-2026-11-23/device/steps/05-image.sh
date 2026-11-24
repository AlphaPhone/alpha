#!/usr/bin/env bash
# 05-image.sh: build the Pixel image from the AOSP tree with the launcher staged by step 4, through heavy.sh.
#   ALPHA_DIR=/path/to/alpha VERSION_CODE=632 ./05-image.sh
# Optional: TRIES=3, IMAGE_MEM_GB=10 (heavy.sh clamps to 10), IMAGE_GOMEMLIMIT=8GiB, IMAGE_JOBS=4
# Output: $WORK/img$VERSION_CODE.zip (a copy; the tree's out/ zip is overwritten by the next build).
set -euo pipefail
STEPS=$(cd "$(dirname "$0")" && pwd)
. "$STEPS/env.sh"
TRIES=${TRIES:-3}
APK=$WORK/Launcher$VERSION_CODE.apk
LOG=$WORK/image-build.log; SUM=$WORK/image.sum
need "$APK"; need "$VENDOR/Launcher.apk"; need "$STEPS/lib/build-image-inner.sh"
[ "$(sha256_of "$VENDOR/Launcher.apk")" = "$(sha256_of "$APK")" ] || die "vendor/alphaphone/Launcher.apk is not $APK: run step 4 first (another session may have re-staged the tree)"
if pgrep -af 'soong_ui|build-image' | grep -v pgrep; then die "another image build is running in the tree: out/ is shared, one build at a time"; fi

say "Keeping the previous out/ image zip if it has no copy yet"
if [ -f "$IMG_ZIP" ]; then
  SIZE=$(stat -c %s "$IMG_ZIP"); echo "out/ zip before this build: $(stat -c '%y %s' "$IMG_ZIP")"
  COPY=
  # Each build's zip has its own byte size, so only a same-size file is worth hashing (the zips are 2 GB each).
  for c in "$LEGACY_IMAGE_DIR"/img*.zip "$ROLLBACK_DIR"/img*.zip; do
    [ -f "$c" ] && [ "$(stat -c %s "$c")" = "$SIZE" ] && cmp -s "$c" "$IMG_ZIP" && { COPY=$c; break; } || true
  done
  if [ -n "$COPY" ]; then echo "already copied: $COPY"; else
    mkdir -p "$ROLLBACK_DIR"; cp --reflink=auto "$IMG_ZIP" "$ROLLBACK_DIR/img-out-before-v$VERSION_CODE.zip"
    echo "no existing copy: saved $ROLLBACK_DIR/img-out-before-v$VERSION_CODE.zip"
  fi
fi

say "Removing the previously installed launcher directory from out/ when its library set changed"
# Soong installs each native library as its own module; a library the new APK no longer ships (libeliza_bun.so
# and the musl loader) would otherwise stay in the product staging directory. Inference from reading, not observed.
INSTALLED=$PRODUCT_OUT/product/priv-app/AlphaPhone
if [ -d "$INSTALLED/lib/arm64" ]; then
  WANT=$(python3 -I -c 'import json,os,sys; print("\n".join(sorted(os.path.basename(l["path"]) for l in json.load(open(sys.argv[1]))["libraries"])))' "$VENDOR/native-libraries.json")
  HAVE=$(ls "$INSTALLED/lib/arm64" | sort)
  if [ "$WANT" != "$HAVE" ]; then echo "installed libraries differ from the staged list: removing $INSTALLED"; rm -rf "$INSTALLED"; else echo "library set unchanged"; fi
fi

: > "$SUM"
OK=0
for i in $(seq 1 "$TRIES"); do
  say "Image build try $i/$TRIES: lunch $LUNCH, BUILD_NUMBER=alpha.v$VERSION_CODE, m droid + target-files-package updatepackage (heavy.sh, ${IMAGE_MEM_GB:-10} GB cap)"
  : > "$LOG"
  if "$HEAVY" "$AOSP" "${IMAGE_MEM_GB:-10}" bash "$STEPS/lib/build-image-inner.sh" "$VERSION_CODE" "$LOG" "${IMAGE_GOMEMLIMIT:-8GiB}" "${IMAGE_JOBS:-4}" \
    && grep -q '^exit=0$' "$LOG"; then
    echo "image ok try$i $(grep '^seconds=' "$LOG") $(date +%T)" | tee -a "$SUM"; OK=1; break
  fi
  cp "$LOG" "$WORK/image-build.try$i.log"
  echo "image fail try$i $(date +%T)" | tee -a "$SUM"; tail -12 "$LOG"
  if grep -q 'exit status 137' "$LOG"; then echo "exit status 137 = killed for memory (the cgroup cap or systemd-oomd). See RUNBOOK step 5 before retrying."; fi
done
[ "$OK" = 1 ] || die "image build failed $TRIES time(s): $WORK/image-build.try*.log"

say "Checking the built image"
[ -f "$IMG_ZIP" ] && [ "$IMG_ZIP" -nt "$APK" ] || die "out/ image zip is missing or older than the signed APK"
BUILT=$INSTALLED/AlphaPhone.apk
need "$BUILT"
BUILT_BADGING=$("$BT/aapt2" dump badging "$BUILT"); grep -q "^package: name='$PKG' versionCode='$VERSION_CODE' " <<<"$BUILT_BADGING" || die "the launcher installed in out/ is not versionCode $VERSION_CODE"
[ "$(sha256_of "$BUILT")" = "$(sha256_of "$APK")" ] || die "installed launcher does not match the signed APK"
echo "installed launcher is byte-identical to the signed APK"
echo "installed libraries: $(ls "$INSTALLED/lib/arm64" | tr '\n' ' ')"
python3 -I - "$VENDOR/native-libraries.json" "$INSTALLED/lib/arm64" <<'PY'
import json, os, sys
want = sorted(os.path.basename(l['path']) for l in json.load(open(sys.argv[1]))['libraries']); have = sorted(os.listdir(sys.argv[2]))
assert want == have, f'installed libraries {have} != staged {want} (a stale or missing library would be in the image)'
PY
for f in "$PRODUCT_OUT/system_ext/etc/sysconfig/alpha-telephony-components.xml" "$PRODUCT_OUT/product/overlay/AlphaImageCapabilityOverlay.apk" \
         "$PRODUCT_OUT/product/etc/permissions/privapp-permissions-$PKG.xml" "$PRODUCT_OUT/product/etc/permissions/$PKG.aosp_image.xml"; do
  [ -f "$f" ] && echo "ok:   $f" || die "missing from the image staging directory: $f"
done
grep -h 'ro.build.fingerprint\|ro.system.build.fingerprint' "$PRODUCT_OUT/system/build.prop" 2>/dev/null | head -2 || true

say "Copying the image zip out of the shared out/ directory"
cp --reflink=auto "$IMG_ZIP" "$WORK/img$VERSION_CODE.zip"
python3 -I "$STEPS/lib/image-evidence.py" record "$WORK/image-evidence.json" "alpha.v$VERSION_CODE" "$WORK/img$VERSION_CODE.zip" "$BUILT"
echo "img$VERSION_CODE.zip sha256=$(sha256_of "$WORK/img$VERSION_CODE.zip") bytes=$(stat -c %s "$WORK/img$VERSION_CODE.zip")" | tee -a "$SUM"
sync
echo "IMAGE DONE: $WORK/img$VERSION_CODE.zip (image-build evidence only; not a boot)"
