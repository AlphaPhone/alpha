#!/usr/bin/env bash
set -euo pipefail

maven_repo="${1:?Usage: prepare-robolectric-android.sh MAVEN_REPOSITORY}"
# These API 35 tests use Robolectric 4.16.1's instrumented Android framework jar.
version=15-robolectric-13954326-i7
sha256=06c4c8602d6db7486266a982bc55834ed6dfebd62a0b88daca204139ecf142cb
artifact="android-all-instrumented-$version.jar"
relative="org/robolectric/android-all-instrumented/$version/$artifact"
jar="$maven_repo/$relative"

verified() { printf '%s  %s\n' "$sha256" "$1" | shasum -a 256 --check --status; }
if [[ -f "$jar" ]] && verified "$jar"; then exit 0; fi
mkdir -p "$(dirname "$jar")"
partial=$(mktemp "$jar.XXXXXXXX")
trap 'rm -f "$partial"' EXIT
curl --fail --silent --show-error --location --retry 5 --retry-all-errors \
  --connect-timeout 20 --max-time 300 --output "$partial" "https://repo.maven.apache.org/maven2/$relative"
if ! verified "$partial"; then
  printf 'Robolectric framework checksum mismatch for %s\n' "$artifact" >&2
  exit 1
fi
mv -f "$partial" "$jar"
