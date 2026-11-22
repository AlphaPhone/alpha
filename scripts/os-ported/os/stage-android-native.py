#!/usr/bin/env python3
# Ported for Alpha from elizaOS/eliza develop 89baf73d94df6437dd0677543ff23997bd0d8a70 (packages/os/scripts/android/stage-android-native.py, MIT); retire when @elizaos/os offers it.
"""Stage ABI-bound JNI files for an already admitted Android launcher APK."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import zipfile

RUNTIME_MODES = {
    'libeliza_node.so': '0755',
}
# Explicit image targets, never infer the installation ABI from a fat APK.
TARGETS = {
    'stallion': {'abi': 'arm64-v8a', 'arch': 'arm64', 'machine': b'\xb7\x00', 'modes': RUNTIME_MODES},
    'cuttlefish': {'abi': 'x86_64', 'arch': 'x86_64', 'machine': b'\x3e\x00', 'modes': RUNTIME_MODES},
}

CLOUD_OMITTED_MODEL = {
    'path': 'assets/agent/models/bge-small-en-v1.5-f16.gguf',
    'sha256': 'f0b2fef971e8366438bfd2d9aefea1b0115919389448806d290237f638bae999',
}
REQUIRED_AGENT_ASSETS = {
    'agent.mjs', 'manifest.json', 'inventory.json', 'pglite.wasm', 'pglite.data', 'initdb.wasm', 'alpha-source.json',
    'alpha-runtime-profile.json',
}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def sha_stream(stream):
    """Hash archive bytes with at most a 1 MiB read buffer on Python 3.10+."""
    digest = hashlib.sha256()
    for chunk in iter(lambda: stream.read(1024 * 1024), b''):
        digest.update(chunk)
    return digest.hexdigest()


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError('Duplicate JSON key: ' + key)
        result[key] = value
    return result


def read_json(archive, path, max_bytes=1024 * 1024):
    if type(max_bytes) is not int or not 1 <= max_bytes <= 16 * 1024 * 1024:
        raise ValueError('Invalid runtime manifest size bound')
    if archive.getinfo(path).file_size > max_bytes:
        raise ValueError('Oversized runtime manifest: ' + path)
    return json.loads(archive.read(path), object_pairs_hook=unique_object)


def runtime_profile(archive, admission=None):
    admission = admission or {}
    names = set(archive.namelist())
    marker = admission.get('profileEntry')
    profile = read_json(archive, marker) if marker and marker in names else {'version': 1, 'runtimeProfile': 'native'}
    native = {'version': 1, 'runtimeProfile': 'native'}
    cloud = {'version': 1, 'runtimeProfile': 'cloud', 'omittedLocalModels': [CLOUD_OMITTED_MODEL]}
    if not isinstance(profile, dict) or type(profile.get('version')) is not int or profile not in (native, cloud):
        raise ValueError('Unknown or malformed runtime profile')
    kind = profile['runtimeProfile']
    flags_path = admission.get('rendererFlagsEntry')
    flags = read_json(archive, flags_path) if flags_path and flags_path in names else {}
    if not isinstance(flags, dict) or flags.get('runtimeProfile', 'native') != kind:
        raise ValueError('Renderer and resident runtime profiles differ')
    if kind == 'cloud':
        if flags.get('testMocks') is not False:
            raise ValueError('Cloud requires flag-off renderer admission')
        for name in names:
            if (name.startswith('assets/paradee-voice/')
                    or re.search(r'\.(gguf|onnx|safetensors|pt|pth)$', name)
                    or re.match(r'^(lib(?:elizainference|elizavoicejni|paradeevoicejni|llama|ggml|omnivoice)|llama-server)', Path(name).name)):
                raise ValueError('Cloud APK includes local inference or speech')
    return kind


def runtime_layout(target, admission):
    return dict(TARGETS[target])


def verify_source_receipt(archive, provenance, source):
    commit = source.get('commit')
    if not isinstance(commit, str) or not re.fullmatch(r'[a-f0-9]{40}', commit):
        raise ValueError('Runtime requires a full reviewed source commit')
    receipt = read_json(archive, source['entry'], source.get('maxBytes', 1024 * 1024))
    if source.get('kind') == 'exact-json':
        if receipt != source['expected'] or receipt.get(source.get('commitField', 'commit')) != commit:
            raise ValueError('Runtime source stamp differs from admitted source')
    elif source.get('kind') == 'aosp-build':
        entry = 'assets/agent/android-agent-runtime-provenance.json'
        if (receipt.get('schema') != 'eliza.aosp_build_provenance.v1'
                or receipt.get('git_revision') != commit
                or receipt.get('android_package') != source['package']
                or receipt.get('runtime_provenance_entry') != entry
                or receipt.get('runtime_provenance_sha256') != sha(archive.read(entry))
                or receipt.get('runtime_provenance') != provenance):
            raise ValueError('APK build receipt does not bind source, package and runtime provenance')
        files = receipt.get('packaged_runtime_files')
        if not isinstance(files, list) or not 1 <= len(files) <= 10000:
            raise ValueError('Invalid final packaged runtime inventory')
        seen = set()
        for record in files:
            name = record.get('path')
            if (not isinstance(name, str) or not re.fullmatch(r'(assets/agent/|lib/)[A-Za-z0-9_.+/@-]+', name)
                    or any(part in ('', '.', '..') for part in name.split('/')) or name in seen
                    or type(record.get('size_bytes')) is not int or not 0 <= record['size_bytes'] <= 1024 ** 3
                    or not re.fullmatch(r'[a-f0-9]{64}', record.get('sha256', ''))):
                raise ValueError('Invalid final packaged runtime entry')
            seen.add(name)
            entry_info = archive.getinfo(name)
            with archive.open(entry_info) as stream:
                if entry_info.file_size != record['size_bytes'] or sha_stream(stream) != record['sha256']:
                    raise ValueError('Final packaged runtime bytes differ: ' + name)
        actual = {name for name in archive.namelist() if not name.endswith('/') and (name.startswith('assets/agent/') or name.startswith('lib/'))}
        if actual != seen:
            raise ValueError('Final packaged runtime closure differs')
    else:
        raise ValueError('Unsupported runtime source receipt contract')
    return commit


def verify_runtime(archive, runtime_names, profile='native', target='stallion', admission=None):
    """The @elizaos/os runtime payload: Node at lib/<abi>/libeliza_node.so, every listed asset in assets/agent/inventory.json."""
    if not isinstance(admission, dict) or admission.get('schemaVersion') != 2:
        raise ValueError('Resident runtime requires an authenticated admission contract')
    limit = admission.get('maxRuntimeFiles', 4096)
    if type(limit) is not int or not 1 <= limit <= 100000:
        raise ValueError('Invalid runtime inventory bound')
    config = runtime_layout(target, admission)
    abi = config['abi']
    if runtime_names != set(config['modes']):
        raise ValueError('Incomplete or unknown ' + abi + ' resident runtime')
    inventory = read_json(archive, 'assets/agent/inventory.json', admission.get('maxManifestBytes', 4 * 1024 * 1024))
    rows = inventory.get('files') if isinstance(inventory, dict) and inventory.get('schema') == 1 else None
    if not isinstance(rows, list) or not 1 <= len(rows) <= limit:
        raise ValueError('Invalid runtime inventory')
    names = set(archive.namelist())
    seen = set()
    for row in rows:
        path, digest, size = row.get('path'), row.get('sha256'), row.get('size')
        if not isinstance(path, str) or path in seen or not re.fullmatch(r'[0-9a-f]{64}', str(digest)) or type(size) is not int:
            raise ValueError('Invalid runtime inventory row')
        seen.add(path)
        entry = path if path in names else 'assets/' + path if 'assets/' + path in names else None
        if entry is None:
            raise ValueError('Runtime inventory names a missing file: ' + path)
        info = archive.getinfo(entry)
        if info.file_size != size:
            raise ValueError('Runtime size mismatch: ' + path)
        with archive.open(info) as stream:
            if sha_stream(stream) != digest:
                raise ValueError('Runtime hash mismatch: ' + path)
    node = 'lib/' + abi + '/libeliza_node.so'
    pin = next((row for row in admission['nodeLock'].get('entries', []) if row.get('abi') == abi), None)
    if pin is None or sha(archive.read(node)) != pin.get('sha256'):
        raise ValueError('Packaged ' + abi + ' Node differs from the pinned runtime')
    required = {'assets/agent/' + n for n in REQUIRED_AGENT_ASSETS}
    if not required <= names:
        raise ValueError('Runtime payload omits required files')
    source = admission['source']
    stamp = read_json(archive, source['entry'])
    if stamp != source['expected']:
        raise ValueError('Runtime source stamp differs from the pinned source')
    for entry, expected in admission.get('fileBindings', {}).items():
        if archive.getinfo(entry).file_size > 1024 * 1024 or sha(archive.read(entry)) != expected:
            raise ValueError('Runtime policy binding differs: ' + entry)
    workers = [path for path in seen if path.startswith('agent/workflow-worker/') or path.startswith('assets/agent/workflow-worker/')]
    return {'runtimeFilesVerified': len(rows), 'workerFilesVerified': len(workers), 'sourceCommit': stamp.get('base'),
            'nodeVersion': admission['nodeLock'].get('version'), 'runtimeProfile': profile, 'omittedLocalModels': []}


def stage(apk, output, module, target='stallion', admission=None):
    if target not in TARGETS:
        raise ValueError('Unsupported Android image target')
    config = runtime_layout(target, admission or {})
    abi, arch, modes = config['abi'], config['arch'], config['modes']
    prefix = 'lib/' + abi + '/'
    if not re.fullmatch(r'[A-Za-z][A-Za-z0-9_]*', module):
        raise ValueError('Invalid module name')
    with zipfile.ZipFile(apk) as archive:
        names = archive.namelist()
        if len(names) != len(set(names)):
            raise ValueError('Duplicate APK entries')
        profile = runtime_profile(archive, admission)
        selected = [e for e in archive.infolist() if e.filename.startswith(prefix)]
        payloads = []
        for entry in selected:
            name = entry.filename.removeprefix(prefix)
            if not re.fullmatch(r'lib[A-Za-z0-9_.+-]+\.so', name):
                raise ValueError('Unexpected native path: ' + entry.filename)
            if entry.compress_type != zipfile.ZIP_STORED or entry.file_size > 1024 ** 3:
                raise ValueError('Native library is compressed or oversized: ' + name)
            data = archive.read(entry)
            if len(data) < 64 or data[:6] != b'\x7fELF\x02\x01' or data[18:20] != config['machine']:
                raise ValueError('Expected little-endian ELF64 ' + abi + ': ' + name)
            payloads.append((name, data))
        if not payloads:
            raise ValueError('No ' + abi + ' native libraries')
        runtime_names = {name for name, _ in payloads if name.startswith('libeliza_') or name == 'libsigsys-handler.so'}
        runtime = verify_runtime(archive, runtime_names, profile, target, admission) if target == 'cuttlefish' or runtime_names or 'assets/agent/agent.mjs' in names or profile == 'cloud' else None
    expected_bp = ('// Generated from a hash- and signer-verified downstream launcher.\n'
                   'android_app_import {\n' + f'    name: "{module}",\n' +
                   '    apk: "Launcher.apk",\n    presigned: true,\n'
                   '    preprocessed: true,\n    product_specific: true,\n'
                   '    dex_preopt: { enabled: false },\n}\n')
    expected_bp = (admission or {}).get('launcherBlueprint', expected_bp)
    # Only a launcher whose reviewed descriptor names privileged permissions is a priv-app.
    privileged = (admission or {}).get('launcherPrivileged') is True
    if ('    privileged: true,\n' in expected_bp) != privileged:
        raise ValueError('Launcher privilege differs from its admitted blueprint')
    if ((output / 'Android.bp').read_text() != expected_bp
            or any((output / name).exists() for name in ['Android.mk', 'config.fs', 'native-libraries.json'])):
        raise ValueError('Expected a fresh, exact upstream launcher overlay')
    native_name = 'native-' + arch
    native = output / native_name
    native.mkdir(exist_ok=False)
    records = []
    for index, (name, data) in enumerate(payloads):
        (native / name).write_bytes(data)
        destination = f'{"priv-app" if privileged else "app"}/{module}/lib/{arch}'
        records.append({'apkEntry': prefix + name,
                        'path': native_name + '/' + name,
                        'installPath': '/product/' + destination + '/' + name,
                        'mode': modes.get(name, '0644'),
                        'sha256': hashlib.sha256(data).hexdigest()})
    (output / 'config.fs').write_text(''.join(
        f'[{record["installPath"].lstrip("/")}]\nmode: {record["mode"]}\nuser: AID_ROOT\ngroup: AID_ROOT\ncaps: 0\n\n'
        for record in records))
    # AOSP's supported prebuilt app rule installs LOCAL_PREBUILT_JNI_LIBS beside
    # the APK. SDK >= 30 + PRESIGNED preserves the APK and checks compression and
    # alignment. Do not use prebuilt_any: that type is reserved for generated rules.
    (output / 'Android.mk').write_text(
        f'# Generated Android {target} APK and bundled JNI installation.\n'
        'LOCAL_PATH := $(call my-dir)\ninclude $(CLEAR_VARS)\n' +
        f'LOCAL_MODULE := {module}\n' +
        'LOCAL_MODULE_CLASS := APPS\nLOCAL_MODULE_SUFFIX := .apk\n'
        'LOCAL_SRC_FILES := Launcher.apk\nLOCAL_CERTIFICATE := PRESIGNED\n'
        'LOCAL_SDK_VERSION := 36\nLOCAL_PRODUCT_MODULE := true\n' +
        ('LOCAL_PRIVILEGED_MODULE := true\n' if privileged else '') +
        f'LOCAL_MULTILIB := 64\nLOCAL_MODULE_TARGET_ARCH := {arch}\n'
        'LOCAL_DEX_PREOPT := false\nLOCAL_PREBUILT_JNI_LIBS := ' +
        ' '.join(native_name + '/' + name for name, _ in payloads) +
        '\ninclude $(BUILD_PREBUILT)\n')
    (output / 'Android.bp').write_text('// The launcher is defined in Android.mk for bundled JNI installation.\n' + (admission or {}).get('remainingBlueprint', ''))
    report = {'schemaVersion': 1, 'apkSha256': hashlib.sha256(apk.read_bytes()).hexdigest(),
              'target': target, 'moduleName': module, 'libraries': records, 'residentAgentIncluded': runtime is not None,
              'runtimeAdmission': runtime, 'fsConfigRequired': True, 'nativeLibrariesStaged': True,
              'runtimeVerified': False, 'deployReady': False}
    (output / 'native-libraries.json').write_text(json.dumps(report, indent=2) + '\n')
    return report


def finalize_soong(output, module, report, remaining_blueprint="", privileged=False):
    # Shared admission remains authoritative. Adapt only its legacy install rules
    # for image products that ignore Android.mk; never alter admitted payloads.
    if not re.fullmatch(r'[A-Za-z][A-Za-z0-9_]*', module) or report.get('moduleName') != module:
        raise ValueError('Native module identity changed')
    arch = TARGETS[report['target']]['arch']
    # Both fixed-directory rules come from the reviewed soong-app-native patch.
    # AOSP reserves prebuilt_priv_app for generated rules, not Android.bp files.
    directory, rule = ('priv-app', 'prebuilt_priv_app_native') if privileged else ('app', 'prebuilt_app_native')
    if (output / 'Android.bp').read_text() != '// The launcher is defined in Android.mk for bundled JNI installation.\n' + remaining_blueprint:
        raise ValueError('Unexpected shared launcher blueprint')
    if hashlib.sha256((output / 'Launcher.apk').read_bytes()).hexdigest() != report['apkSha256']:
        raise ValueError('Admitted launcher bytes changed')
    for record in report['libraries']:
        name = Path(record['path']).name
        if not re.fullmatch(r'lib[A-Za-z0-9_.+-]+\.so', name) or record['path'] != f'native-{arch}/{name}' or record['installPath'] != f'/product/{directory}/{module}/lib/{arch}/{name}':
            raise ValueError('Native installation path changed')
        source = output / record['path']
        if source.is_symlink() or hashlib.sha256(source.read_bytes()).hexdigest() != record['sha256']:
            raise ValueError('Admitted native bytes changed')
    records = report['libraries']
    native_modules = [f'{module}_native_{index}' for index in range(len(records))]
    # An admitted companion can legally use the generated native naming pattern.
    # Refuse before replacing either build file rather than emit duplicate modules.
    declared_names = set(re.findall(r'\bname\s*:\s*"([^"\n]+)"\s*,', remaining_blueprint))
    if declared_names.intersection([module, *native_modules]):
        raise ValueError('Generated native module name collides with admitted blueprint')
    blueprint = ('// Generated from a hash- and signer-verified downstream launcher.\n'
        'android_app_import {\n' + f'    name: "{module}",\n' +
        '    apk: "Launcher.apk",\n    presigned: true,\n'
        '    preprocessed: true,\n' + ('    privileged: true,\n' if privileged else '') +
        '    product_specific: true,\n' +
        '    required: ' + json.dumps(native_modules) + ',\n' +
        '    dex_preopt: { enabled: false },\n}\n')
    for name, record in zip(native_modules, records):
        relative = Path(record['installPath']).relative_to('/product/' + directory)
        blueprint += ('\n' + rule + ' {\n' + f'    name: "{name}",\n' +
            f'    src: "{record["path"]}",\n    filename: "{relative.name}",\n' +
            f'    relative_install_path: "{relative.parent}",\n' +
            '    product_specific: true,\n}\n')
    (output / 'Android.mk').unlink()
    (output / 'Android.bp').write_text(blueprint + remaining_blueprint)
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apk', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--module', required=True)
    parser.add_argument('--target', choices=tuple(TARGETS), default='stallion')
    parser.add_argument('--admission', type=Path, help='Caller-authenticated runtime admission contract')
    parser.add_argument('--finalize-soong', action='store_true', help='Convert admitted native staging to Soong installation rules')
    args = parser.parse_args()
    admission = json.loads(args.admission.read_text(), object_pairs_hook=unique_object) if args.admission else None
    if args.finalize_soong:
        report = json.loads((args.output / 'native-libraries.json').read_text(), object_pairs_hook=unique_object)
        result = finalize_soong(args.output, args.module, report, (admission or {}).get('remainingBlueprint', ''),
                                (admission or {}).get('launcherPrivileged') is True)
    else:
        result = stage(args.apk, args.output, args.module, args.target, admission)
    print(json.dumps(result, indent=2))
