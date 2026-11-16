"""Hermetic checks of the canonical Pixel source-packet admission and stage preimages.

Runs from test/python-suites.test.mjs with only repository files, Bun and synthetic stage
fixtures: no AOSP checkout, generated branding assets or signed APK. The full packet run over
pinned AOSP inputs stays in aosp-fresh-presets.test.py. Neither proves an actual signed image.
"""
from pathlib import Path
import importlib.util, json, os, subprocess, tempfile, unittest
from unittest.mock import patch

REPO = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('alpha_branding_stage', REPO/'scripts/stage-alpha-os-branding.py')
stage = importlib.util.module_from_spec(spec); spec.loader.exec_module(stage)
BUN = os.environ.get('ALPHA_BUN', 'bun')
CANONICAL = json.loads((REPO/'app.config.json').read_text())['appId']
RETAINED = 'ai.elizaresearch.alphaphone'
run = subprocess.check_output

def bun(code, *args):
    return run([BUN, '-e', code, *args], text=True, cwd=REPO)

def tree(package, *flags):
    return run([BUN, 'test/fixtures/telephony-launcher-tree.mjs', package, *flags], text=True, cwd=REPO)

class ImagePacket(unittest.TestCase):
    def stage_dir(self, root):
        """A synthetic published image stage; the APK bytes are a boundary fixture, not an APK."""
        apk = root/'Launcher.apk'; apk.write_bytes(b'isolated signed-tool boundary fixture, not an APK')
        config = json.loads((REPO/'app.config.json').read_text())
        product = json.loads((REPO/'android/aosp/pixel10a-product.json').read_text())
        self.signer = json.loads((REPO/product['signer']['apkDescriptor']).read_text())['signerSha256']
        self.descriptor = {'packageName': CANONICAL, 'moduleName': config['moduleName'], 'apkSha256': stage.digest(apk.read_bytes()),
                           'certificateSha256': self.signer, 'development': False}
        (root/'launcher.json').write_text(json.dumps(self.descriptor))
        handlers = root/'provisioning/alpha-telephony-components.xml'; handlers.parent.mkdir(parents=True)
        handlers.write_text('isolated normal-stage handler binding fixture')
        self.product = product

    def admission(self, root, app_id=CANONICAL, **overrides):
        # The admission comes from stage-aosp's own exported builder, the same code main() runs.
        values = {'output': str(root), 'appId': app_id, 'apkSha256': self.descriptor['apkSha256'],
                  'sourceLockSha256': self.product['sourceLock']['sha256'],
                  'platformCertificateSha256': self.product['signer']['platformCertificateSha256'], **overrides}
        return json.loads(bun('const {imagePolicyAdmission} = await import("./scripts/stage-aosp.ts");'
                              'console.log(JSON.stringify(imagePolicyAdmission(JSON.parse(process.argv.at(-1)))));', json.dumps(values)))

    def tools(self, manifest, package=CANONICAL, signer=None, badging_extra=''):
        def call(args, **kwargs):
            if args[0] == 'apksigner-fixture': return 'Signer #1 certificate SHA-256 digest: ' + (signer or self.signer) + '\n'
            if args[0] == BUN: return run(args, **kwargs, stderr=subprocess.PIPE)
            self.assertEqual(args[0], 'aapt-fixture')
            if args[2] == 'xmltree': return manifest['tree']
            return "package: name='" + package + "' versionCode='80'\n" + badging_extra
        return call

    def test_stage_aosp_admission_is_accepted_and_every_binding_is_rechecked(self):
        with tempfile.TemporaryDirectory(prefix='alpha-image-packet-') as d:
            root = Path(d); self.stage_dir(root)
            admission = self.admission(root)
            self.assertEqual(admission['packageName'], CANONICAL)
            file = root/'image-policy-admission.json'; file.write_text(json.dumps(admission))
            manifest = {'tree': tree(CANONICAL)}
            with patch.object(stage.subprocess, 'check_output', side_effect=self.tools(manifest)):
                self.assertEqual(stage.image_identity(root, 'aapt-fixture', 'apksigner-fixture'), admission)
                # The receiver and nine-handler qualifiers run through the production TypeScript.
                for broken in [tree(CANONICAL, '--without-setup-receiver'), manifest['tree'].replace('BIND_INCALL_SERVICE', 'UNRELATED'),
                               manifest['tree'].replace(CANONICAL, 'other.package')]:
                    with self.subTest(manifest=broken[-60:]):
                        manifest['tree'] = broken
                        with self.assertRaises(subprocess.CalledProcessError): stage.image_identity(root, 'aapt-fixture', 'apksigner-fixture')
                manifest['tree'] = tree(CANONICAL)
                for key, value in [('schema', 2), ('packageName', RETAINED), ('packageName', 'unknown.package'), ('apkSha256', '0'*64),
                                   ('launcherDescriptorSha256', '0'*64), ('sourceLockSha256', '0'*64),
                                   ('platformCertificateSha256', '0'*64), ('handlerDefaultsSha256', '0'*64)]:
                    with self.subTest(key=key, value=value):
                        file.write_text(json.dumps({**admission, key: value}))
                        with self.assertRaises(AssertionError): stage.image_identity(root, 'aapt-fixture', 'apksigner-fixture')
                file.write_text(json.dumps(admission))
            # A debuggable launcher, a different packaged name or signer is refused from the tools' own output.
            for kwargs, message in [({'badging_extra': 'application-debuggable\n'}, 'debuggable'),
                                    ({'package': 'other.package'}, 'canonical identity'),
                                    ({'signer': '0'*64}, 'Staged APK signer')]:
                with self.subTest(message=message), patch.object(stage.subprocess, 'check_output', side_effect=self.tools(manifest, **kwargs)):
                    with self.assertRaisesRegex(AssertionError, message): stage.image_identity(root, 'aapt-fixture', 'apksigner-fixture')

    def test_stage_aosp_never_builds_an_admission_for_another_identity_or_without_evidence(self):
        with tempfile.TemporaryDirectory(prefix='alpha-image-packet-') as d:
            root = Path(d); self.stage_dir(root)
            for app_id, overrides, message in [(RETAINED, {}, 'staged only for ' + CANONICAL),
                                               (CANONICAL, {'sourceLockSha256': None}, 'admitted sourceLockSha256'),
                                               (CANONICAL, {'platformCertificateSha256': 'x'}, 'admitted platformCertificateSha256')]:
                with self.subTest(message=message):
                    with self.assertRaises(subprocess.CalledProcessError) as raised:
                        run([BUN, '-e', 'const {imagePolicyAdmission} = await import("./scripts/stage-aosp.ts");'
                             'imagePolicyAdmission(JSON.parse(process.argv.at(-1)));',
                             json.dumps({'output': str(root), 'appId': app_id, 'apkSha256': self.descriptor['apkSha256'],
                                         'sourceLockSha256': self.product['sourceLock']['sha256'],
                                         'platformCertificateSha256': self.product['signer']['platformCertificateSha256'], **overrides})],
                            text=True, cwd=REPO, stderr=subprocess.PIPE)
                    self.assertIn(message, raised.exception.stderr)

    def test_packet_command_pins_the_generated_product_and_the_planner_reads_that_stage(self):
        with tempfile.TemporaryDirectory(prefix='alpha-image-packet-') as d:
            root = Path(d); generated = b'# Generated Pixel launcher stage product\n'
            (root/'product.mk').write_bytes(generated)
            command = json.loads(bun('const [output] = process.argv.slice(-1);'
                'console.log(JSON.stringify((await import("./scripts/stage-aosp.ts")).brandingPacketCommand('
                '{output, source: "/aosp", assets: "/assets", reportSha256: "0".repeat(64), aapt: "aapt-fixture", apksigner: "apksigner-fixture"})));', str(root)))
            branded = (root/'product.mk').read_bytes()
            # stage-aosp appends exactly the planner's include and passes the pre-include hash.
            self.assertEqual(branded, generated + stage.BRANDING_SUFFIX)
            self.assertEqual(command[command.index('--product-mk-sha256')+1], stage.digest(generated))
            self.assertEqual(command[command.index('--image-stage')+1], str(root))
            self.assertEqual(Path(command[command.index('--packet-output')+1]).parent, root)
            self.assertNotIn('--source-inputs', command); self.assertNotIn('--apply', command)
            self.assertIsNone(stage.branding_product(branded, stage.digest(generated), root))
            for current, pin in [(b'# other\n' + branded, stage.digest(generated)), (branded, stage.digest(b'other')), (generated, stage.digest(generated)),
                                 (branded + stage.BRANDING_SUFFIX, stage.digest(generated + stage.BRANDING_SUFFIX))]:
                with self.subTest(current=current[-40:]), self.assertRaises(AssertionError):
                    stage.branding_product(current, pin, root)
            # Without an image stage the source-tree path keeps its explicit preimage pin.
            self.assertEqual(stage.branding_product(generated, stage.digest(generated), None), branded)
            with self.assertRaisesRegex(AssertionError, 'preimage pin'): stage.branding_product(generated, stage.digest(b'other'), None)
            # vendor/alphaphone preimages come from the image stage, never from the source tree.
            source = root/'aosp'
            self.assertEqual(stage.stage_preimage(source, root, 'vendor/alphaphone/product.mk'), root/'product.mk')
            self.assertEqual(stage.stage_preimage(source, root, 'frameworks/base/x'), source/'frameworks/base/x')
            self.assertEqual(stage.stage_preimage(source, None, 'vendor/alphaphone/product.mk'), source/'vendor/alphaphone/product.mk')
            with self.assertRaisesRegex(AssertionError, 'Unsafe'): stage.stage_preimage(source, root, 'vendor/alphaphone/../x')

    def test_packet_requires_admission_and_never_applies(self):
        with tempfile.TemporaryDirectory(prefix='alpha-image-packet-') as d:
            root = Path(d); aosp = root/'aosp'; aosp.mkdir(); assets = root/'assets'; assets.mkdir()
            base = ['stage-alpha-os-branding.py', '--aosp-root', str(aosp), '--assets-dir', str(assets), '--assets-report-sha256', '0'*64,
                    '--receipt', str(root/'receipt.json')]
            with patch('sys.argv', base + ['--packet-output', str(root/'packet.zip')]):
                with self.assertRaisesRegex(AssertionError, 'requires normal signed-image admission'): stage.main()
            with patch.object(stage, 'image_identity', return_value={'packageName': CANONICAL}), \
                 patch('sys.argv', base + ['--image-stage', str(root), '--packet-output', str(root/'packet.zip'), '--apply']):
                with self.assertRaisesRegex(AssertionError, 'does not apply source'): stage.main()
            with patch.object(stage, 'image_identity', return_value={'packageName': CANONICAL}), \
                 patch('sys.argv', base + ['--image-stage', str(root), '--packet-output', str(aosp/'packet.zip')]):
                with self.assertRaisesRegex(AssertionError, 'publish with its admitted image stage'): stage.main()
            self.assertFalse((root/'receipt.json').exists())

if __name__ == '__main__': unittest.main(verbosity=2)
