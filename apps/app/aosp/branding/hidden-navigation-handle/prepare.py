#!/usr/bin/env python3
"""Fetch/reuse the exact pinned Launcher3 source and stage the reviewed draw-only patch."""
from pathlib import Path
import argparse, hashlib, json, subprocess, sys

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parent / 'system-entry'))
from portable_tools import fetch_pinned_googlesource, reject_symlinks, require, safe_relative_path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--inputs-root', type=Path, default=ROOT / '.cache')
args = parser.parse_args()
data = args.inputs_root.resolve()
manifest = json.loads((ROOT / 'manifest.json').read_text())
require(manifest['project'] == 'packages/apps/Launcher3', 'Unexpected project in manifest')
require(hashlib.sha256((ROOT / manifest['patch']).read_bytes()).hexdigest() == manifest['patchSha256'],
        'Patch digest drift')
for row in manifest['files']:
    path = safe_relative_path(row['path'], 'source input path')
    url = ('https://android.googlesource.com/platform/packages/apps/Launcher3/+/'
           + manifest['revision'] + '/' + row['path'] + '?format=TEXT')
    target = data / 'baseline' / path
    fetch_pinned_googlesource(url, target, row['beforeSha256'], data, max_bytes=1024 * 1024)
    staged = data / 'staged' / path
    reject_symlinks(staged, data, 'staged input path')
    staged.parent.mkdir(parents=True, exist_ok=True)
    staged.write_bytes(target.read_bytes())
subprocess.run(['git', 'apply', '--check', str(ROOT / manifest['patch'])], cwd=data / 'staged', check=True)
subprocess.run(['git', 'apply', str(ROOT / manifest['patch'])], cwd=data / 'staged', check=True)
for row in manifest['files']:
    actual = hashlib.sha256((data / 'staged' / row['path']).read_bytes()).hexdigest()
    require(actual == row['afterSha256'], 'Post-apply staged hash mismatch')
print(json.dumps({'state': 'STAGED_SOURCE_ONLY', 'revision': manifest['revision'],
                  'patchSHA256': manifest['patchSha256'], 'compilation': 'pending'}))
