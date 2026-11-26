"""Discover already-installed tools and enforce unconditional runtime checks.

Never downloads a compiler or accepts SDK licenses.
"""
from pathlib import Path
import base64
import hashlib
import os
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request


def require(condition, message='Requirement failed'):
    """Unconditional runtime check that cannot be stripped by python3 -O."""
    if not condition:
        raise RuntimeError(message)


def find_repo_root(start):
    """Locate the workspace root via pnpm-workspace.yaml."""
    start_path = Path(start).resolve()
    for candidate in (start_path, *start_path.parents):
        if (candidate / 'pnpm-workspace.yaml').is_file():
            return candidate
    raise RuntimeError(f'Workspace root (pnpm-workspace.yaml) not found above {start_path}')


def safe_relative_path(raw_path, label='path'):
    relative = Path(raw_path)
    require(not relative.is_absolute() and '..' not in relative.parts, f'Unsafe {label}: {raw_path}')
    return relative


def reject_symlinks(target, stop_at, label='path'):
    stop = Path(stop_at).resolve()
    for candidate in (target, *target.parents):
        if candidate == stop.parent:
            break
        require(not candidate.is_symlink(), f'Symlink in {label}: {candidate}')


def fetch_pinned_googlesource(url, destination, expected_sha256, stop_at,
                              max_bytes=64 * 1024 * 1024, timeout=30, retries=3):
    """Fetch a base64-encoded googlesource file with strict integrity and atomic write.

    Returns True if fetched from network, False if an existing verified file was reused.
    """
    reject_symlinks(destination, stop_at, 'source input path')
    if destination.exists():
        actual = hashlib.sha256(destination.read_bytes()).hexdigest()
        require(actual == expected_sha256, f'Existing input drift: {destination}')
        return False
    last_error = None
    encoded = None
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(url, timeout=timeout) as response:
                require(response.geturl() == url, f'Unexpected source redirect: {response.geturl()}')
                encoded = response.read(max_bytes + 1)
            break
        except urllib.error.HTTPError as err:
            last_error = err
            if err.code not in (429, 500, 502, 503, 504) or attempt + 1 == retries:
                raise
            time.sleep(1.5 * (attempt + 1))
    require(encoded is not None, f'Failed to fetch {url}: {last_error}')
    require(len(encoded) <= max_bytes, f'Input exceeds bounded source size ({max_bytes} bytes): {url}')
    content = base64.b64decode(encoded, validate=True)
    actual = hashlib.sha256(content).hexdigest()
    require(actual == expected_sha256, f'Fetched source hash mismatch: {destination}')
    destination.parent.mkdir(parents=True, exist_ok=True)
    reject_symlinks(destination.parent, stop_at, 'source input directory')
    temporary_path = None
    try:
        with tempfile.NamedTemporaryFile(dir=destination.parent, delete=False) as temporary:
            temporary_path = Path(temporary.name)
            temporary.write(content)
        os.replace(temporary_path, destination)
        temporary_path = None
    finally:
        if temporary_path is not None and temporary_path.exists():
            temporary_path.unlink(missing_ok=True)
    return True


def java_binary(name):
    home = os.environ.get('JAVA_HOME')
    if home:
        candidate = Path(home) / 'bin' / name
        if not candidate.is_file(): raise RuntimeError('JAVA_HOME has no ' + name)
        return str(candidate)
    helper = Path('/usr/libexec/java_home')
    if sys.platform == 'darwin' and helper.is_file():
        result = subprocess.run([str(helper), '-v', '17+'], capture_output=True, text=True)
        if result.returncode == 0:
            candidate = Path(result.stdout.strip()) / 'bin' / name
            if candidate.is_file(): return str(candidate)
    candidate = shutil.which(name)
    if candidate: return candidate
    raise RuntimeError('Install a JDK or set JAVA_HOME; missing ' + name)


def android_api_jar(api):
    explicit = os.environ.get('ALPHA_ANDROID_API_JAR')
    if explicit: return Path(explicit).expanduser().resolve()
    home = os.environ.get('ANDROID_SDK_ROOT') or os.environ.get('ANDROID_HOME')
    if home: return Path(home).expanduser() / 'platforms' / f'android-{api}' / 'android.jar'
    defaults = [Path.home() / 'Library/Android/sdk', Path.home() / 'Android/Sdk']
    for root in defaults:
        jar = root / 'platforms' / f'android-{api}' / 'android.jar'
        if jar.is_file(): return jar
    raise RuntimeError(f'Android API {api} is required: set ANDROID_SDK_ROOT or ALPHA_ANDROID_API_JAR')
