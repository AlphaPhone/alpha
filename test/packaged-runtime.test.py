"""Exercise the APK runtime verifier (scripts/verify-packaged-runtime.py) with ZIP payloads in the layout
@elizaos/os stageRuntimePayload stages: lib/<abi>/libeliza_node.so and assets/agent with inventory.json.
Fixture bytes only; not APK build or device evidence."""
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import warnings
import zipfile

spec = importlib.util.spec_from_file_location('packaged_runtime', Path(__file__).resolve().parents[1] / 'scripts/verify-packaged-runtime.py')
verifier = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verifier)
sha = lambda data: hashlib.sha256(data).hexdigest()
ABIS = ('arm64-v8a', 'x86_64')


class PackagedRuntimeTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        for name in ('ROOT', 'STAGED', 'NODE_LOCK'):
            self.addCleanup(setattr, verifier, name, getattr(verifier, name))
        verifier.ROOT = self.root
        verifier.STAGED = self.root / 'android/app/src/main/assets/agent'
        verifier.NODE_LOCK = self.root / 'node.lock.json'
        self.write('upstream.lock.json', json.dumps({'commit': 'a' * 40}).encode())
        self.write('scripts/stage-agent-runtime.ts', b'stager')
        self.node = {abi: f'{abi} runtime'.encode() for abi in ABIS}
        self.write('node.lock.json', json.dumps({'version': '26.13.1', 'entries': [{'abi': abi, 'sha256': sha(self.node[abi])} for abi in ABIS]}).encode())
        stamp = json.dumps(verifier.expected_stamp()).encode()
        self.write('android/app/src/main/assets/agent/alpha-source.json', stamp)
        worker = b'export const worker = 1\n'
        listed = {
            'assets/agent/agent.mjs': b'export const agent = 1\n',
            'assets/agent/manifest.json': json.dumps({'schema': 1, 'workflowWorkerSha256': sha(worker)}).encode(),
            'assets/agent/workflow-worker/src/worker/main.js': worker,
            'assets/agent/workflow-worker/manifest.json': b'{}',
            'assets/agent/workflow-worker/workflow-worker.json': b'{}',
            'assets/agent/workflow-worker/dependencies.json': b'{}',
            **{f'lib/{abi}/libeliza_node.so': self.node[abi] for abi in ABIS},
        }
        inventory = json.dumps({'schema': 1, 'files': [{'path': name, 'sha256': sha(data), 'size': len(data)} for name, data in sorted(listed.items())]}).encode()
        self.entries = {**listed, 'assets/agent/inventory.json': inventory, 'assets/agent/alpha-source.json': stamp,
                        'assets/agent/alpha-runtime-profile.json': json.dumps({'version': 1, 'runtimeProfile': 'native'}).encode()}

    def write(self, name, data):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)

    def apk(self, name='app.apk', drop=(), change=None, replace=None, extra=None):
        file = self.root / name
        with zipfile.ZipFile(file, 'w') as archive:
            for entry, data in {**self.entries, **(replace or {})}.items():
                if entry in drop:
                    continue
                archive.writestr(entry, b'changed' if entry == change else data)
            for entry, data in (extra or {}).items():
                archive.writestr(entry, data)
        return file

    def test_a_debug_apk_with_both_abis_is_byte_verified_without_execution_claim(self):
        result = verifier.verify(self.apk())
        self.assertEqual((result['runtime'], result['runtimeExecution'], result['nodeVersion']), ('PACKAGED', False, '26.13.1'))
        self.assertEqual(result['verifiedEntries'], 8 + 2, 'every inventory row, then each ABI runtime against the lock')

    def test_an_arm64_release_verifies_against_the_payload_staged_for_both_abis(self):
        result = verifier.verify(self.apk(drop={'lib/x86_64/libeliza_node.so'}), release=True)
        self.assertEqual(result['runtime'], 'PACKAGED')

    def test_a_release_without_the_arm64_runtime_is_refused(self):
        with self.assertRaisesRegex(ValueError, 'differs from its inventory: lib/arm64-v8a/libeliza_node.so'):
            verifier.verify(self.apk(drop={'lib/arm64-v8a/libeliza_node.so'}), release=True)

    def test_a_changed_listed_file_or_runtime_is_refused(self):
        with self.assertRaisesRegex(ValueError, 'differs from its inventory: assets/agent/agent.mjs'):
            verifier.verify(self.apk(change='assets/agent/agent.mjs'))
        with self.assertRaisesRegex(ValueError, 'differs from its inventory: lib/x86_64/libeliza_node.so'):
            verifier.verify(self.apk(change='lib/x86_64/libeliza_node.so'))

    def test_a_debug_apk_missing_an_abi_runtime_is_refused(self):
        with self.assertRaisesRegex(ValueError, 'differs from its inventory: lib/x86_64/libeliza_node.so'):
            verifier.verify(self.apk(drop={'lib/x86_64/libeliza_node.so'}))

    def test_a_release_that_packages_x86_64_still_checks_its_rows(self):
        with self.assertRaisesRegex(ValueError, 'differs from its inventory: lib/x86_64/libeliza_node.so'):
            verifier.verify(self.apk(change='lib/x86_64/libeliza_node.so'), release=True)

    def test_duplicate_zip_entries_are_refused(self):
        with warnings.catch_warnings():
            warnings.simplefilter('ignore', UserWarning)
            apk = self.apk(extra={'assets/agent/agent.mjs': b'duplicate'})
        with self.assertRaisesRegex(ValueError, 'Duplicate APK entries'):
            verifier.verify(apk)

    def test_a_stamp_from_a_different_pin_or_stager_is_refused(self):
        apk = self.apk()
        for name, data in (('upstream.lock.json', json.dumps({'commit': 'b' * 40}).encode()),
                           ('scripts/stage-agent-runtime.ts', b'changed stager')):
            original = (self.root / name).read_bytes()
            self.write(name, data)
            with self.subTest(source=name), self.assertRaisesRegex(ValueError, 'different pin or stager'):
                verifier.verify(apk)
            self.write(name, original)

    def test_a_packaged_stamp_that_differs_from_the_staged_one_is_refused(self):
        apk = self.apk()
        self.write('android/app/src/main/assets/agent/alpha-source.json', json.dumps({'base': 'c' * 40}).encode())
        with self.assertRaisesRegex(ValueError, 'differs from the staged payload'):
            verifier.verify(apk)

    def test_the_workflow_worker_must_match_the_bundle_pin(self):
        with self.assertRaisesRegex(ValueError, 'pins no workflow worker'):
            verifier.verify(self.apk(replace={'assets/agent/manifest.json': json.dumps({'schema': 1}).encode()}))
        for name in ('src/worker/main.js', 'manifest.json', 'workflow-worker.json', 'dependencies.json'):
            with self.subTest(missing=name), self.assertRaisesRegex(ValueError, 'worker is not packaged'):
                verifier.verify(self.apk(drop={'assets/agent/workflow-worker/' + name}))
        with self.assertRaisesRegex(ValueError, 'differs from the bundle pin'):
            verifier.verify(self.apk(change='assets/agent/workflow-worker/src/worker/main.js'))

    def test_an_unexpected_packaged_abi_is_refused_in_debug_and_release(self):
        for release in (False, True):
            with self.subTest(release=release), self.assertRaisesRegex(ValueError, 'Unexpected packaged ABI'):
                verifier.verify(self.apk(extra={'lib/armeabi-v7a/libfoo.so': b'32-bit'}), release=release)

    def test_an_apk_without_the_payload_reports_it_missing(self):
        self.assertEqual(verifier.verify(self.apk(drop={'assets/agent/inventory.json'}))['runtime'], 'MISSING')


if __name__ == '__main__':
    unittest.main()
