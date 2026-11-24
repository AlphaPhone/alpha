#!/usr/bin/env python3
"""Verify that each APK packages exactly the resident runtime payload staged from the pin.

The payload is @elizaos/os's (scripts/stage-agent-runtime.ts): the pinned Node runtime at
lib/<abi>/libeliza_node.so, the agent bundle and every other listed file in
assets/agent/inventory.json, and Alpha's source stamp assets/agent/alpha-source.json. This reads
bytes only; it never runs the runtime, so it is not device execution evidence.
"""
import argparse
import hashlib
import json
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STAGED = ROOT / 'android/app/src/main/assets/agent'
NODE_LOCK = ROOT / 'vendor/eliza/packages/os/aosp/runtime/node.lock.json'
REQUIRED = ('agent.mjs', 'manifest.json', 'inventory.json', 'alpha-source.json', 'alpha-runtime-profile.json')
# The bundle carries the workflow plugin, so its manifest pins the worker; the worker program and its own manifest ship.
WORKER = 'workflow-worker/'
WORKER_REQUIRED = ('src/worker/main.js', 'manifest.json', 'workflow-worker.json', 'dependencies.json')
ABIS = ('arm64-v8a', 'x86_64')
NOT_DISTRIBUTABLE = 3


def digest(stream):
    hasher = hashlib.sha256()
    for chunk in iter(lambda: stream.read(1024 * 1024), b''):
        hasher.update(chunk)
    return hasher.hexdigest()


def file_hash(path):
    with open(path, 'rb') as stream:
        return digest(stream)


def expected_stamp():
    lock = (ROOT / 'upstream.lock.json').read_bytes()
    return {
        'base': json.loads(lock)['commit'], 'patches': [],
        'lockSha256': hashlib.sha256(lock).hexdigest(),
        'stagerSha256': file_hash(ROOT / 'scripts/stage-agent-runtime.ts'),
    }


def verify(apk, release=False):
    with zipfile.ZipFile(apk) as archive:
        names = archive.namelist()
        if len(names) != len(set(names)):
            raise ValueError('Duplicate APK entries')
        if not all('assets/agent/' + name in names for name in REQUIRED):
            return {'apk': str(apk), 'runtime': 'MISSING', 'runtimeExecution': False}

        def packaged(name):
            with archive.open(name) as stream:
                return digest(stream)

        stamp = json.loads(archive.read('assets/agent/alpha-source.json'))
        if stamp != expected_stamp():
            raise ValueError('Packaged runtime was staged from a different pin or stager')
        if stamp != json.loads((STAGED / 'alpha-source.json').read_text()):
            raise ValueError('Packaged runtime differs from the staged payload')
        bundle = json.loads(archive.read('assets/agent/manifest.json'))
        worker_sha = bundle.get('workflowWorkerSha256') if isinstance(bundle, dict) else None
        if not isinstance(worker_sha, str) or len(worker_sha) != 64:
            raise ValueError('The agent bundle pins no workflow worker')
        if not all('assets/agent/' + WORKER + name in names for name in WORKER_REQUIRED):
            raise ValueError('The pinned workflow worker is not packaged')
        if packaged('assets/agent/' + WORKER + WORKER_REQUIRED[0]) != worker_sha:
            raise ValueError('The packaged workflow worker differs from the bundle pin')
        inventory = json.loads(archive.read('assets/agent/inventory.json'))
        rows = inventory.get('files') if isinstance(inventory, dict) and inventory.get('schema') == 1 else None
        if not isinstance(rows, list) or not rows:
            raise ValueError('Invalid runtime inventory')
        packaged_abis = {name.split('/')[1] for name in names if name.startswith('lib/') and name.count('/') >= 2}
        checks, listed = 0, set()
        for row in rows:
            path, expected, size = row.get('path'), row.get('sha256'), row.get('size')
            if not isinstance(path, str) or path in listed or '..' in path.split('/') or type(size) is not int:
                raise ValueError('Invalid runtime inventory row')
            listed.add(path)
            # The payload lists native files for every staged ABI; an APK built for fewer ABIs (the
            # arm64-v8a release) carries only its own, and the device checks only its own ABI's rows.
            parts = path.split('/')
            if parts[0] == 'lib' and len(parts) == 3 and parts[1] in ABIS and parts[1] not in packaged_abis:
                continue
            entry = path if path in names else 'assets/' + path
            if entry not in names or archive.getinfo(entry).file_size != size or packaged(entry) != expected:
                raise ValueError('Packaged runtime file differs from its inventory: ' + path)
            checks += 1
        lock = json.loads(NODE_LOCK.read_text())
        pins = {row['abi']: row['sha256'] for row in lock.get('entries', [])}
        unexpected = packaged_abis - set(ABIS)
        if unexpected:
            raise ValueError(f'Unexpected packaged ABI: {sorted(unexpected)}')
        abis = sorted(packaged_abis | ({'arm64-v8a'} if release else set()))
        for abi in abis:
            node = f'lib/{abi}/libeliza_node.so'
            if node not in names or packaged(node) != pins.get(abi):
                raise ValueError(f'Packaged {abi} Node differs from the pinned runtime')
            checks += 1
        return {'apk': str(apk), 'runtime': 'PACKAGED', 'runtimeProfile': 'native', 'upstreamCommit': stamp['base'],
                'nodeVersion': lock.get('version'), 'verifiedEntries': checks, 'runtimeExecution': False}


def main(argv):
    parser = argparse.ArgumentParser(description='Verify packaged runtime bytes in APKs.')
    parser.add_argument('--release', action='append', default=[], metavar='APK', help='release APK (arm64-v8a only)')
    parser.add_argument('apks', nargs='*', metavar='APK')
    args = parser.parse_args(argv)
    if not args.release and not args.apks:
        parser.error('no APKs supplied')
    results = []
    for apk in args.release:
        result = verify(Path(apk), release=True)
        result['release'] = True
        result['distributable'] = result['runtime'] == 'PACKAGED'
        results.append(result)
    results.extend(verify(Path(apk)) for apk in args.apks)
    print(json.dumps(results, indent=2))
    refused = [result['apk'] for result in results if result['runtime'] != 'PACKAGED']
    if refused:
        print('APKs without a packaged resident runtime: ' + ', '.join(refused)
              + '. Stage it with pnpm android:build:local.', file=sys.stderr)
        return NOT_DISTRIBUTABLE
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
