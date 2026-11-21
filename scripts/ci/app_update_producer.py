"""Admit the reviewed producer route and the immutable GitHub candidate archive."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess

REPOSITORY = "eliza-research/alpha"
REPOSITORY_ID = 1396333361
WORKFLOW = ".github/workflows/resident-android.yml"
WORKFLOW_ID = 373209004
CANDIDATE_PACKAGE = "ai.alphacompute.alphaphone"
CANDIDATE = "github-main-candidate"
PRIVATE_RUNNER = "root-reviewed-private-runner"
HOSTED_DISPATCH = "github-dispatch"
MAX_ARCHIVE_BYTES = 1_500_000_000
LEGACY_APK_MEMBER_BYTES = 400_000_000
PRIVATE_APK_BUCKET = "alpha-aosp-lab-20261024-private-apks"
SHA = re.compile(r"[0-9a-f]{64}")
COMMIT = re.compile(r"[0-9a-f]{40}")
NUMBER = re.compile(r"[1-9][0-9]{0,15}")
CANDIDATE_NAME = re.compile(r"app-native-candidate-([1-9][0-9]{0,9})-([0-9a-f]{40})-([1-9][0-9]{0,15})-([1-9][0-9]{0,15})")
CANDIDATE_FIELDS = {"producerRunAttempt", "candidateReceiptSHA256"}
GITHUB_FIELDS = CANDIDATE_FIELDS | {"producerRunId", "artifactId"}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def pairs(rows):
    value = {}
    for key, item in rows:
        require(key not in value, "Duplicate JSON field")
        value[key] = item
    return value


def decode(data):
    return json.loads(data.decode("utf-8", errors="strict"), object_pairs_hook=pairs,
                      parse_constant=lambda _: (_ for _ in ()).throw(ValueError("Non-JSON number")))


def matches(pattern, value):
    return isinstance(value, str) and pattern.fullmatch(value) is not None


def positive_id(value):
    return matches(NUMBER, value) and int(value) <= 2**53 - 1


def producer_kind(plan):
    require("rotation" not in plan, "Signing plans carry no signing-key rotation: Alpha signs with one key")
    if "producerKind" not in plan:
        require(plan.get("privateStorage") is None and not CANDIDATE_FIELDS.intersection(plan) and
                "privateProducerReceiptSHA256" not in plan, "Mixed producer routes")
        return HOSTED_DISPATCH
    kind = plan["producerKind"]
    if kind == PRIVATE_RUNNER:
        require(isinstance(plan.get("privateStorage"), dict) and not GITHUB_FIELDS.intersection(plan) and
                matches(SHA, plan.get("privateProducerReceiptSHA256")), "Invalid private runner producer")
        return kind
    require(kind == CANDIDATE, "Unknown producer kind")
    require("privateProducerReceiptSHA256" not in plan, "Candidate cannot claim a private runner receipt")
    candidate_transport_pins(plan)
    require(matches(COMMIT, plan.get("sdkCommit")) and
            matches(SHA, plan.get("candidateReceiptSHA256")), "Invalid exact candidate producer pins")
    require(isinstance(plan.get("updateChannel"), dict) and plan["updateChannel"].get("kind") == "public",
            "Candidate requires public update channel")
    require(isinstance(plan.get("privateStorage"), dict) and
            "recipientCertificateSHA256" not in plan and "encryptedArtifactApproved" not in plan,
            "Candidate requires an exact private mirror and private signed delivery")
    return kind


def input_contract(plan):
    """Bind every immutable archive input: the one launcher APK."""
    producer_kind(plan)
    pins = plan.get("unsignedApkSHA256")
    require(isinstance(pins, dict), "Missing unsigned APK pins")
    require(set(pins) == {"launcher"}, "Unexpected release variants: only the launcher APK is signed")
    package = plan.get("applicationId", CANDIDATE_PACKAGE)
    require(package == CANDIDATE_PACKAGE, "Unsupported installation identity: Alpha releases only its own app id")
    return {"variants": ("launcher",), "runtimeProfile": "native",
            "packageName": package}


class RetiredSignerRecord(ValueError):
    """android/release-signer.json carries a retired field that must be removed."""


def retired_signer_problems(descriptor):
    """Alpha version 49 phones are wiped, not upgraded in place (owner decision 2026-11-15): one
    signing key and no rotation. A standalone pin left in an existing approval is inert, since
    input_contract admits launcher-only plans. scripts/release-signer-record.ts is the same rule."""
    problems = []
    if not isinstance(descriptor, dict):
        return problems
    if "apkSigningRotation" in descriptor:
        problems.append("android/release-signer.json still has apkSigningRotation; Alpha no longer rotates its "
                        "signing key for version 49 phones. Delete the apkSigningRotation object "
                        "from android/release-signer.json.")
    return problems


def require_current_signer_record(descriptor):
    """Refuse a signer record with a retired field instead of ignoring it."""
    problems = retired_signer_problems(descriptor)
    if problems:
        raise RetiredSignerRecord(" ".join(problems))
    return descriptor


def release_contract(plan):
    """Only the launcher may be signed, exported or qualified for a new release."""
    return {**input_contract(plan), "variants": ("launcher",)}


def archive_pins(plan):
    require(type(plan.get("archiveBytes")) is int and 0 < plan["archiveBytes"] <= MAX_ARCHIVE_BYTES and
            matches(SHA, plan.get("archiveSHA256")), "Invalid exact producer archive pins")


def candidate_transport_pins(plan):
    require(positive_id(plan.get("producerRunId")) and positive_id(plan.get("artifactId")) and
            type(plan.get("producerRunAttempt")) is int and 0 < plan["producerRunAttempt"] <= 2**53 - 1 and
            type(plan.get("versionCode")) is int and 0 < plan["versionCode"] <= 2_100_000_000 and
            matches(COMMIT, plan.get("alphaCommit")), "Invalid exact candidate producer pins")
    archive_pins(plan)


def validate_private_storage(plan):
    storage = plan["privateStorage"]
    require(storage["bucket"] == PRIVATE_APK_BUCKET, "Unexpected private bucket")
    sha = plan["archiveSHA256"]
    require(isinstance(sha, str) and re.fullmatch(r"[0-9a-f]{64}", sha), "Invalid archive digest")
    require(storage["inputObject"] == f"unsigned/{sha}.zip", "Input object must bind the archive digest")
    require(isinstance(storage["inputGeneration"], str) and
            re.fullmatch(r"[1-9][0-9]{0,24}", storage["inputGeneration"]), "Exact input generation required")
    require(re.fullmatch(r"signed/" + sha + r"/[0-9a-f]{32}/signed-apks.tar",
                         storage["outputObject"]), "Invalid exclusive delivery object")
    require(type(plan["archiveBytes"]) is int and 0 < plan["archiveBytes"] <= MAX_ARCHIVE_BYTES,
            "Invalid archive byte bound")
    require(producer_kind(plan) in (PRIVATE_RUNNER, CANDIDATE), "Unreviewed private producer kind")
    return storage


def apk_member_limit(kind, contract=None):
    private_native = kind == PRIVATE_RUNNER and contract is not None and \
        contract.get("runtimeProfile") == "native" and contract.get("packageName") == CANDIDATE_PACKAGE
    return MAX_ARCHIVE_BYTES if kind == CANDIDATE or private_native else LEGACY_APK_MEMBER_BYTES


def copy_verified(source, size, expected_digest, failure, destination=None):
    digest = hashlib.sha256()
    remaining = size
    while chunk := source.read(min(1024 * 1024, remaining + 1)):
        remaining -= len(chunk)
        require(remaining >= 0, failure)
        digest.update(chunk)
        if destination is not None:
            destination.write(chunk)
    require(remaining == 0 and digest.hexdigest() == expected_digest, failure)


def gh_json(endpoint):
    result = subprocess.run(["gh", "api", endpoint], check=True, capture_output=True, timeout=60)
    require(len(result.stdout) <= 1024**2, "GitHub producer metadata exceeds bound")
    return json.loads(result.stdout)


def verify_github_candidate(plan, api, artifact=None):
    candidate_transport_pins(plan)
    run_id, attempt = plan["producerRunId"], plan["producerRunAttempt"]
    source, version = plan["alphaCommit"], plan["versionCode"]
    run = api(f"repos/{REPOSITORY}/actions/runs/{run_id}/attempts/{attempt}")
    require(run["id"] == int(run_id) and run["run_attempt"] == attempt and run["run_number"] == version and
            run["event"] == "push" and run["head_branch"] == "main" and run["head_sha"] == source and
            run["workflow_id"] == WORKFLOW_ID and run["path"] == WORKFLOW and
            run["status"] == "completed" and run["conclusion"] == "success" and
            all(run[key]["id"] == REPOSITORY_ID and run[key]["full_name"].lower() == REPOSITORY
                for key in ("repository", "head_repository")), "Candidate producer run attempt differs")
    artifact_id = plan["artifactId"]
    if artifact is None:
        artifact = api(f"repos/{REPOSITORY}/actions/artifacts/{artifact_id}")
    provenance = artifact["workflow_run"]
    # Artifacts expose the run ID, not its attempt. The trusted workflow names
    # each attempt separately and the admitted archive contains its own receipt.
    require(artifact["id"] == int(artifact_id) and artifact["expired"] is False and
            artifact["name"] == f"app-native-candidate-{version}-{source}-{run_id}-{attempt}" and
            artifact["size_in_bytes"] == plan["archiveBytes"] and
            artifact["digest"] == "sha256:" + plan["archiveSHA256"] and
            provenance["id"] == int(run_id) and provenance["head_sha"] == source and
            provenance["head_branch"] == "main" and
            provenance["repository_id"] == provenance["head_repository_id"] == REPOSITORY_ID,
            "Candidate GitHub artifact differs from the reviewed archive")


def github_candidate(plan, api=gh_json):
    require(producer_kind(plan) == CANDIDATE, "Expected a main-push candidate plan")
    verify_github_candidate(plan, api)


def github_candidate_download_pins(artifact_id, api=gh_json):
    require(positive_id(artifact_id), "Exact candidate artifact ID required")
    artifact = api(f"repos/{REPOSITORY}/actions/artifacts/{artifact_id}")
    require(isinstance(artifact, dict) and artifact.get("id") == int(artifact_id) and
            artifact.get("expired") is False, "Candidate artifact identity or expiry differs")
    name = artifact.get("name")
    identity = CANDIDATE_NAME.fullmatch(name) if isinstance(name, str) else None
    require(identity is not None, "Expected a main-push candidate artifact name")
    version, source, run_id, attempt = identity.groups()
    remote_digest = artifact.get("digest")
    require(isinstance(remote_digest, str) and remote_digest.startswith("sha256:"),
            "Candidate artifact has no SHA-256")
    pins = {"artifactId": artifact_id, "archiveBytes": artifact.get("size_in_bytes"),
            "archiveSHA256": remote_digest.removeprefix("sha256:"), "alphaCommit": source,
            "versionCode": int(version), "producerRunId": run_id, "producerRunAttempt": int(attempt)}
    verify_github_candidate(pins, api, artifact)
    return pins


def download_github_archive(plan, destination):
    import resource

    archive_pins(plan)
    require(positive_id(plan.get("artifactId")), "Exact producer artifact ID required")
    size = plan["archiveBytes"]

    def bound():
        resource.setrlimit(resource.RLIMIT_FSIZE, (size, size))

    endpoint = f"repos/{REPOSITORY}/actions/artifacts/{plan['artifactId']}/zip"
    with destination.open("xb") as target:
        subprocess.run(["gh", "api", endpoint], stdout=target, stderr=subprocess.DEVNULL, check=True,
                       timeout=420, preexec_fn=bound)
    with destination.open("rb") as stream:
        require(destination.stat().st_size == size and
                hashlib.file_digest(stream, "sha256").hexdigest() == plan["archiveSHA256"],
                "Downloaded GitHub producer archive differs from reviewed bytes")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=("kind", "github", "download", "signer-record"))
    parser.add_argument("plan", type=Path)
    parser.add_argument("destination", type=Path, nargs="?")
    args = parser.parse_args()
    try:
        if args.mode == "signer-record":
            try:
                require_current_signer_record(decode(args.plan.read_bytes()))
            except RetiredSignerRecord as error:
                parser.exit(1, f"Release signer record refused: {error}\n")
            raise SystemExit(0)
        plan = json.loads(args.plan.read_text())
        kind = producer_kind(plan)
        if args.mode == "kind":
            print(kind)
        elif args.mode == "github":
            github_candidate(plan)
        else:
            require(args.destination is not None, "Archive destination required")
            download_github_archive(plan, args.destination)
    except ValueError as error:
        parser.exit(1, f"Producer admission refused: {error}\n")
    except (KeyError, TypeError, OSError, subprocess.SubprocessError):
        # GitHub and transport errors may contain provider response details.
        parser.exit(1, "Producer admission refused: producer metadata or transport failed.\n")
