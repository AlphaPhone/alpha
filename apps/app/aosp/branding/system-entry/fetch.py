#!/usr/bin/env python3
"""Fetch only hash-pinned official source inputs; valid existing inputs are reused offline."""
from pathlib import Path
import argparse, json
from portable_tools import fetch_pinned_googlesource, require, safe_relative_path

ROOT = Path(__file__).resolve().parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--inputs-root', type=Path, default=ROOT / '.cache')
args = parser.parse_args()
data = args.inputs_root.resolve()
manifest = json.loads((ROOT / 'SOURCE-INPUTS.json').read_text())
require(manifest['project'] == 'frameworks/base', 'Unexpected project in SOURCE-INPUTS.json')
revision = manifest['revision']
require(len(revision) == 40 and all(c in '0123456789abcdef' for c in revision), 'Invalid revision hash')
base = 'https://android.googlesource.com/platform/frameworks/base/+/' + revision + '/'
fetched = reused = 0
for row in manifest['files']:
    relative = safe_relative_path(row['path'], 'source input path')
    url = base + row['path'] + '?format=TEXT'
    destination = data / 'baseline' / relative
    if fetch_pinned_googlesource(url, destination, row['beforeSha256'], data):
        fetched += 1
    else:
        reused += 1
print(json.dumps({'revision': revision, 'fetched': fetched, 'reused': reused, 'inputsRoot': str(data)}))
