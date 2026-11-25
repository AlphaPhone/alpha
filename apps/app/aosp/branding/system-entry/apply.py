#!/usr/bin/env python3
"""Read-only admission by default. --apply is for the owner-reviewed component build checkout."""
from pathlib import Path
import argparse, hashlib, json, subprocess
from portable_tools import reject_symlinks, require, safe_relative_path

root = Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument('source_root', type=Path)
parser.add_argument('--apply', action='store_true')
parser.add_argument('--manifest', type=Path, default=root / 'manifest.json')
args = parser.parse_args()
manifest_path = args.manifest.resolve(strict=True)
manifest = json.loads(manifest_path.read_text())
source = args.source_root.resolve(strict=True)
head = subprocess.check_output(['git', '-C', str(source), 'rev-parse', 'HEAD'], text=True).strip()
require(head == manifest['revision'], f"Unexpected {manifest['project']} revision")
relative_patch = Path(manifest['patch'])
require(not relative_patch.is_absolute() and len(relative_patch.parts) == 1
        and relative_patch.name not in ('.', '..'), 'Unsafe patch filename')
patch = manifest_path.parent / relative_patch
digest = lambda data: hashlib.sha256(data).hexdigest()
require(digest(patch.read_bytes()) == manifest['patchSha256'], 'Patch digest drift')
headers = [line for line in patch.read_text().splitlines() if line.startswith(('--- ', '+++ '))]
expected_headers = []
for row in manifest['files']:
    expected_headers += ['--- /dev/null' if row['beforeSha256'] is None else '--- a/' + row['path'], '+++ b/' + row['path']]
require(headers == expected_headers, 'Patch paths differ from manifest scope')
states = []
for row in manifest['files']:
    relative = safe_relative_path(row['path'], 'patch path')
    current = source / relative
    reject_symlinks(current, source, 'target path: ' + row['path'])
    actual = digest(current.read_bytes()) if current.exists() else None
    require(actual in (row['beforeSha256'], row['afterSha256']), 'Source hash drift: ' + row['path'])
    states.append('after' if actual == row['afterSha256'] else 'before')
require(len(set(states)) == 1, 'Partial application requires explicit recovery, never guessed continuation')
if states[0] == 'after':
    print(json.dumps({'state': 'ALREADY_APPLIED_EXACTLY', 'mutated': False, 'compilation': 'pending'}))
else:
    subprocess.run(['git', 'apply', '--check', str(patch)], cwd=source, check=True)
    if args.apply:
        subprocess.run(['git', 'apply', str(patch)], cwd=source, check=True)
        for row in manifest['files']:
            require(digest((source / row['path']).read_bytes()) == row['afterSha256'], 'Post-apply drift')
    print(json.dumps({'state': 'APPLIED_SOURCE_ONLY' if args.apply else 'ADMITTED_NOT_APPLIED',
                      'mutated': args.apply, 'files': len(states), 'compilation': 'pending'}))
