#!/usr/bin/env bash
# 03-sign.sh: sign the unsigned release launcher with the repository debug key (the key the phone's
# system app already carries) and compare its surface with the legacy APK it replaces. Light: no heavy.sh.
#   ALPHA_DIR=/path/to/alpha VERSION_CODE=632 ./03-sign.sh
# Optional: PATCH_VERSION_CODE=yes  rewrite the manifest versionCode with the legacy setvc.py when Gradle
#                                   did not honour ELIZAOS_VERSION_CODE
#           ACK_NEW_PERMISSIONS=yes continue although the APK requests permissions the legacy APK did not
set -euo pipefail
. "$(dirname "$0")/env.sh"
UNSIGNED=$WORK/v$VERSION_CODE-unsigned.apk
OUT=$WORK/Launcher$VERSION_CODE.apk
need "$UNSIGNED"; need "$KEYSTORE"; need "$LEGACY_APK"
T=$(mktemp -d "$WORK/sign.XXXX"); trap 'rm -rf "$T"' EXIT

say "Reading the unsigned release: package, versionCode, debuggable"
BADGING=$("$BT/aapt2" dump badging "$UNSIGNED")
grep -E '^package' <<<"$BADGING"
grep -q "^package: name='$PKG' " <<<"$BADGING" || die "package is not $PKG"
grep -q 'application-debuggable' <<<"$BADGING" && die "the release APK is debuggable: image telephony refuses a debuggable launcher"
VC=$(sed -n "s/^package: .*versionCode='\([0-9]*\)'.*/\1/p" <<<"$BADGING")
SRC=$UNSIGNED
if [ "$VC" != "$VERSION_CODE" ]; then
  [ "${PATCH_VERSION_CODE:-no}" = yes ] || die "APK versionCode is $VC, wanted $VERSION_CODE. Rebuild with ELIZAOS_VERSION_CODE, or rerun with PATCH_VERSION_CODE=yes"
  say "Patching versionCode $VC -> $VERSION_CODE with the legacy setvc.py"
  python3 -I "$LEGACY_IMAGE_DIR/setvc.py" "$UNSIGNED" "$T/vc.apk" "$VERSION_CODE"; SRC=$T/vc.apk
fi

say "zipalign (16 KB pages), then apksigner v2+v3 with the debug key, alignment preserved"
"$BT/zipalign" -f -P 16 4 "$SRC" "$T/aligned.apk"
"$BT/apksigner" sign --ks "$KEYSTORE" --ks-key-alias AndroidDebugKey --ks-pass pass:android --key-pass pass:android \
  --alignment-preserved true --v1-signing-enabled false --v2-signing-enabled true --v3-signing-enabled true \
  --out "$OUT" "$T/aligned.apk"

say "Verifying the signed APK"
SIGNED_BADGING=$("$BT/aapt2" dump badging "$OUT"); grep -E "^package: name='$PKG' versionCode='$VERSION_CODE' " <<<"$SIGNED_BADGING" || die "signed APK has the wrong package or versionCode"
CERT=$("$BT/apksigner" verify --print-certs "$OUT" | sed -n 's/^Signer #1 certificate SHA-256 digest: //p' | head -1)
[ "$CERT" = "$EXPECT_CERT" ] || die "signer is $CERT, expected the debug key $EXPECT_CERT (the phone's system app would be replaced by a differently signed one)"
"$BT/zipalign" -c -P 16 4 "$OUT" || die "signed APK is not aligned"
echo "signed: $OUT sha256=$(sha256_of "$OUT") cert=$CERT" | tee "$WORK/sign.sum"

say "Surface comparison with the legacy APK $LEGACY_APK"
perms() { "$BT/aapt2" dump permissions "$1" | sed -n "s/^uses-permission: name='\([^']*\)'.*/\1/p" | sort -u; }
libs() { unzip -Z1 "$1" 'lib/arm64-v8a/*' 2>/dev/null | sort; }
perms "$LEGACY_APK" > "$WORK/perms.legacy.txt"; perms "$OUT" > "$WORK/perms.new.txt"
libs "$LEGACY_APK" > "$WORK/libs.legacy.txt"; libs "$OUT" > "$WORK/libs.new.txt"
comm -13 "$WORK/perms.legacy.txt" "$WORK/perms.new.txt" > "$WORK/perms.added.txt"
comm -23 "$WORK/perms.legacy.txt" "$WORK/perms.new.txt" > "$WORK/perms.removed.txt"
echo "permissions added:   $(tr '\n' ' ' < "$WORK/perms.added.txt")"
echo "permissions removed: $(tr '\n' ' ' < "$WORK/perms.removed.txt")"
echo "arm64 libraries added:   $(comm -13 "$WORK/libs.legacy.txt" "$WORK/libs.new.txt" | tr '\n' ' ')"
echo "arm64 libraries removed: $(comm -23 "$WORK/libs.legacy.txt" "$WORK/libs.new.txt" | tr '\n' ' ')"
echo "(a changed library set is expected: Vibestack ships libeliza_node.so, legacy shipped libeliza_bun.so and its musl loader; step 4 must regenerate the image's native module list)"
if [ -s "$WORK/perms.added.txt" ] && [ "${ACK_NEW_PERMISSIONS:-no}" != yes ]; then
  die "the APK requests new permissions (above). The image allow-lists exactly READ_PRIVILEGED_PHONE_STATE for this privileged app; a new signature|privileged permission that is not allow-listed can stop the image from booting. Check each one, then rerun with ACK_NEW_PERMISSIONS=yes"
fi
echo "SIGN DONE (APK signing evidence only)"
