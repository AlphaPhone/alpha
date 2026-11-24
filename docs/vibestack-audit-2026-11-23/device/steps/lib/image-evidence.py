"""Check the image files and bind their bytes to a single build receipt."""

import hashlib
import json
from pathlib import Path
import sys
from zipfile import ZipFile, BadZipFile


def sha256(path):
    with Path(path).open("rb") as file:
        return hashlib.file_digest(file, "sha256").hexdigest()


def image_entries(image):
    required = ("android-info.txt", "system.img", "product.img", "vbmeta.img")
    with ZipFile(image) as archive:
        names = archive.namelist()
        for entry in required:
            if names.count(entry) != 1 or archive.getinfo(entry).file_size == 0:
                raise ValueError(f"expected exactly one nonempty {entry} in {image}")


def write_receipt(receipt, build, image, launcher):
    image_entries(image)
    evidence = {"build": build, "imageSha256": sha256(image), "launcherSha256": sha256(launcher)}
    temporary = Path(receipt).with_suffix(".tmp")
    temporary.write_text(json.dumps(evidence) + "\n", encoding="utf-8")
    temporary.replace(receipt)


def check_receipt(receipt, build, image, launcher_digest):
    evidence = json.loads(Path(receipt).read_text(encoding="utf-8"))
    if not isinstance(evidence, dict) or evidence.get("build") != build:
        raise ValueError(f"{receipt} does not describe build {build}")
    if len(launcher_digest) != 64 or evidence.get("launcherSha256") != launcher_digest:
        raise ValueError(f"launcher does not match the verified build in {receipt}")
    image_entries(image)
    if sha256(image) != evidence.get("imageSha256"):
        raise ValueError(f"{image} does not match the verified build in {receipt}")
    print(evidence["imageSha256"])


def main():
    action, receipt, build, image, launcher = sys.argv[1:]
    if action == "record":
        write_receipt(receipt, build, image, launcher)
    elif action == "check":
        check_receipt(receipt, build, image, launcher)
    else:
        raise ValueError(f"unknown action: {action}")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, BadZipFile) as error:
        sys.exit(f"Image verification failed: {error}")
