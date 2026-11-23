#!/usr/bin/env python3
"""Alpha's trusted source and policy adapter for upstream native APK admission."""
import argparse
import hashlib
import importlib.util
import json
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SHARED = ROOT / 'scripts/os-ported/os/stage-android-native.py'
spec = importlib.util.spec_from_file_location('eliza_android_native', SHARED)
shared = importlib.util.module_from_spec(spec)
# Keep the pinned upstream checkout immutable when importing its adapter.
_previous_bytecode = sys.dont_write_bytecode
try:
    sys.dont_write_bytecode = True
    spec.loader.exec_module(shared)
finally:
    sys.dont_write_bytecode = _previous_bytecode
RUNTIME_MODES = shared.RUNTIME_MODES
TARGETS = shared.TARGETS
CLOUD_OMITTED_MODEL = shared.CLOUD_OMITTED_MODEL
REQUIRED_AGENT_ASSETS = shared.REQUIRED_AGENT_ASSETS


def admission(root, apk):
    """The Alpha-owned contract for the @elizaos/os runtime payload (scripts/stage-agent-runtime.ts)."""
    digest = lambda data: hashlib.sha256(data).hexdigest()
    lock_bytes = (root / 'upstream.lock.json').read_bytes()
    stamp = {
        'base': json.loads(lock_bytes)['commit'], 'patches': [],
        'lockSha256': digest(lock_bytes),
        'stagerSha256': digest((root / 'scripts/stage-agent-runtime.ts').read_bytes()),
    }
    node_lock = json.loads((root / 'vendor/eliza/packages/os/aosp/runtime/node.lock.json').read_text())
    declarations = subprocess.check_output(['node', str(root / 'scripts/native-view-policy.ts')], timeout=30)
    return {
        'schemaVersion': 2,
        'nodeLock': node_lock,
        'profileEntry': 'assets/agent/alpha-runtime-profile.json',
        'rendererFlagsEntry': 'assets/public/build-flags.json',
        'source': {'kind': 'exact-json', 'entry': 'assets/agent/alpha-source.json', 'commit': stamp['base'], 'commitField': 'base', 'expected': stamp},
        'fileBindings': {'assets/agent/native-view-declarations.json': digest(declarations)},
    }


def stage(apk, output, module, target='stallion', defer_soong=False):
    report = shared.stage(apk, output, module, target, admission(ROOT, apk))
    if not defer_soong:
        finalize_soong(output, module, report)
    return report


def finalize_soong(output, module, report):
    return shared.finalize_soong(output, module, report)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apk', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--module', required=True)
    parser.add_argument('--target', choices=tuple(TARGETS), default='stallion')
    parser.add_argument('--defer-soong', action='store_true')
    parser.add_argument('--finalize-soong', action='store_true')
    parser.add_argument('--admission-only', action='store_true', help='Print only the Alpha-owned authenticated runtime contract')
    args = parser.parse_args()
    if args.admission_only:
        print(json.dumps(admission(ROOT, args.apk), indent=2))
    elif args.finalize_soong:
        report = json.loads((args.output / 'native-libraries.json').read_text())
        print(json.dumps(finalize_soong(args.output, args.module, report), indent=2))
    else:
        print(json.dumps(stage(args.apk, args.output, args.module, args.target, args.defer_soong), indent=2))
