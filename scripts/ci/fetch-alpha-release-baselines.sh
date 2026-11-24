#!/usr/bin/env bash
set -euo pipefail

git fetch --no-tags --no-recurse-submodules --depth=1 origin \
  '+refs/heads/main:refs/remotes/origin/main'

pin_status() {
  node --input-type=module <<'JS'
import {releasePinStatus} from './scripts/android-build-preflight.ts';
import {pinnedCommit} from './scripts/upstream-pin.ts';
const root = process.cwd();
const status = releasePinStatus(root, pinnedCommit(root));
console.log(status.state, status.ref);
JS
}

status=$(pin_status)
read -r state baseline <<< "$status"
# Until main uses the Vibestack SDK, the preflight compares against that Alpha branch.
if [[ "$baseline" == refs/remotes/origin/vibestack ]]; then
  git fetch --no-tags --no-recurse-submodules --depth=1 origin \
    '+refs/heads/vibestack:refs/remotes/origin/vibestack'
  status=$(pin_status)
  read -r state baseline <<< "$status"
fi

case "$state" in
  unknown|shallow)
    if [[ $(git -C vendor/eliza rev-parse --is-shallow-repository) == true ]]; then
      pin=$(git -C vendor/eliza rev-parse HEAD)
      git -C vendor/eliza fetch --unshallow --no-tags --filter=blob:none origin "$pin"
    fi
    ;;
esac
