#!/usr/bin/env python3
"""Read-only admission unless --apply; never changes visibility, gestures or user settings."""
from pathlib import Path
import argparse, hashlib, json, subprocess, sys, xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parent / 'system-entry'))
from portable_tools import reject_symlinks, require, safe_relative_path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('source_root', type=Path)
parser.add_argument('--apply', action='store_true')
args = parser.parse_args()
source = args.source_root.resolve(strict=True)
manifest = json.loads((ROOT / 'manifest.json').read_text())
digest = lambda value: hashlib.sha256(value).hexdigest()
head = subprocess.check_output(['git', '-C', str(source), 'rev-parse', 'HEAD'], text=True).strip()
require(head == manifest['revision'], f"Unexpected {manifest['project']} revision")
patch = ROOT / manifest['patch']
require(digest(patch.read_bytes()) == manifest['patchSha256'], 'Patch digest drift')
dependency = manifest['requiredExistingResource']
dependency_rel = safe_relative_path(dependency['path'], 'required resource path')
dependency_path = source / dependency_rel
reject_symlinks(dependency_path, source, 'required resource path')
flags = [node for node in ET.fromstring(dependency_path.read_text()).findall('bool')
         if node.attrib.get('name') == dependency['name']]
require(len(flags) == 1 and flags[0].text.strip() == dependency['defaultValue'],
        'Existing Alpha product flag missing or changed')
states = []
for row in manifest['files']:
    relative = safe_relative_path(row['path'], 'patch target path')
    target = source / relative
    reject_symlinks(target, source, 'patch target')
    actual = digest(target.read_bytes())
    require(actual in [row['beforeSha256'], row['afterSha256']], 'Unreviewed source drift')
    states.append(actual == row['afterSha256'])
require(len(set(states)) == 1, 'Partial application requires recovery')
if all(states):
    print(json.dumps({'state': 'ALREADY_APPLIED_EXACTLY', 'mutated': False}))
else:
    subprocess.run(['git', 'apply', '--check', str(patch)], cwd=source, check=True)
    if args.apply:
        subprocess.run(['git', 'apply', str(patch)], cwd=source, check=True)
        for row in manifest['files']:
            require(digest((source / row['path']).read_bytes()) == row['afterSha256'], 'Post-apply drift')
    print(json.dumps({'state': 'APPLIED_SOURCE_ONLY' if args.apply else 'ADMITTED_NOT_APPLIED',
                      'mutated': args.apply, 'compilation': 'pending'}))
