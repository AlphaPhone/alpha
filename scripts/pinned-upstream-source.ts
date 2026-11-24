import fs from "node:fs";
import path from "node:path";
import { pinnedCommit } from "./upstream-pin.ts";

/** The os native module build directories Gradle writes inside the checkout; tracked files there are still authenticated. */
export const GENERATED_UPSTREAM_DIRECTORIES = [
	"system", "camera", "location", "network-policy", "calendar", "reminders", "agent-service", "runtime-files", "sign-in", "secure-store",
	"browser-surface", "contacts", "action-journal", "notifications", "messages", "phone", "passwords", "media", "filesystem",
].map((name) => `packages/os/android/${name}/build`).concat(
	// The upstream root's own build and spec tools (pnpm build:upstream): vibestack's dist, its generated root modules, its VibeLang and spec caches.
	[".cache", ".vibe", "dist", "gen", ".spec-cache", "vibestack/studio/.spec-cache", "vibestack/studio/.vibe"],
	// The design system's build writes its token stylesheets here.
	["packages/design-system/generated"],
);
/**
 * The upstream root's turbo logs from pnpm build:upstream, and the single-file outputs upstream's own
 * package builds write outside a build directory. The OS test generator writes one manifest;
 * do not admit adjacent files or the whole package cache.
 */
export const GENERATED_UPSTREAM_FILES = [
	".turbo/turbo-build.log", ".turbo/turbo-gen.log", "packages/os/android/browser-surface/resources/control-channel.js",
	"packages/os/.cache/generated/tests/manifest.json",
];

/** Authenticate vendor bytes at the pinned commit before resolving or compiling consumer source. */
export async function verifyPinnedUpstream(root: string) {
	const commit = pinnedCommit(root);
	const directory = path.join(root, "vendor/eliza");
	const { verifyCommittedWorkspace } = await import("@elizaos/os/build");
	const { run } = await import("./run-os-program.ts");
	await run(verifyCommittedWorkspace(directory, commit, { generatedDirectories: GENERATED_UPSTREAM_DIRECTORIES, generatedFiles: GENERATED_UPSTREAM_FILES }));
	return { directory, commit };
}

export const REACHABILITY_RECORD = "scripts/ci/upstream-reachability.json";
const sha40 = /^[0-9a-f]{40}$/;

/**
 * Judge a recorded GitHub compare of `<base>...<pin>` without the network.
 * The pin is reachable from the upstream branch only when the compare is "identical" or
 * "behind" (aheadBy 0): every pinned commit is then already on that branch.
 */
interface ReachabilityRecord {
 schema: number;
 base: string;
 head: string;
 mergeBase: string;
 status: string;
 aheadBy: number;
 behindBy: number;
 pinOnlyCommits: {sha: string; subject: string}[];
 recordedAt?: string;
 pullRequests?: unknown[];
 pendingPullRequest?: unknown;
}

export function assessDevelopReachability(value: unknown, pin: string) {
 if (!value || typeof value !== 'object')
		return { ok: false, reachable: false, reason: "missing", message: `No recorded develop compare in ${REACHABILITY_RECORD}.` };
	const {schema, base, head, mergeBase, status, aheadBy, behindBy, pinOnlyCommits, recordedAt} = value as Partial<ReachabilityRecord>;
	const valid =
		schema === 1 &&
		typeof base === "string" && base &&
		typeof head === "string" && sha40.test(head) &&
		typeof mergeBase === "string" && sha40.test(mergeBase) &&
		["identical", "behind", "ahead", "diverged"].includes(status ?? "") &&
		typeof aheadBy === "number" && Number.isInteger(aheadBy) && aheadBy >= 0 &&
		typeof behindBy === "number" && Number.isInteger(behindBy) && behindBy >= 0 &&
		Array.isArray(pinOnlyCommits) &&
		pinOnlyCommits.every((row) => typeof row?.sha === "string" && sha40.test(row.sha) && typeof row.subject === "string");
	if (!valid)
		return { ok: false, reachable: false, reason: "invalid", message: `${REACHABILITY_RECORD} is malformed.` };
	const consistent =
		(status === "identical") === (aheadBy === 0 && behindBy === 0) &&
		(aheadBy === 0) === ["identical", "behind"].includes(status ?? "") &&
		// Merge commits are not listed, so an ahead pin may have no non-merge commits.
		(aheadBy > 0 || pinOnlyCommits.length === 0) &&
		pinOnlyCommits.length <= aheadBy;
	if (!consistent)
		return { ok: false, reachable: false, reason: "invalid", message: `${REACHABILITY_RECORD} status, counts and commit list disagree.` };
	if (head !== pin)
		return {
			ok: false, reachable: false, reason: "stale",
			message: `Recorded ${base} compare is for ${head.slice(0, 12)}, not the pin ${pin.slice(0, 12)}; rerun node --conditions=eliza-source --import vibelang/register scripts/verify-upstream.ts --record-reachability.`,
		};
	if (aheadBy === 0)
		return { ok: true, reachable: true, reason: "reachable", message: `${base} reaches the pin ${pin.slice(0, 12)} (${status}, recorded ${recordedAt ?? "unknown date"}).` };
	const list = pinOnlyCommits.map((row) => `  ${row.sha.slice(0, 10)} ${row.subject}`).join("\n");
	return {
		ok: false, reachable: false, reason: "unreachable",
		message: `${base} cannot reach the pin ${pin.slice(0, 12)}: ${status}, ${aheadBy} pin-only commit(s) (${pinOnlyCommits.length} non-merge), ${behindBy} behind (recorded ${recordedAt ?? "unknown date"}).\n${list}`,
	};
}

/** "fail", "warn" (default) or "off", from --upstream-reachability=<mode> or ELIZA_UPSTREAM_REACHABILITY. */
export function reachabilityMode(argv: readonly string[] = [], env: NodeJS.ProcessEnv = {}) {
	const flag = argv.find((arg) => arg.startsWith("--upstream-reachability="));
	const value = flag ? flag.slice("--upstream-reachability=".length) : env.ELIZA_UPSTREAM_REACHABILITY || "warn";
	if (!["fail", "warn", "off"].includes(value))
		throw new Error(`Upstream reachability mode must be fail, warn or off, not ${JSON.stringify(value)}`);
	return value;
}

export function readReachabilityRecord(root: string): Partial<ReachabilityRecord> | null {
	const file = path.join(root, REACHABILITY_RECORD);
	if (!fs.existsSync(file)) return null;
	try {
		return JSON.parse(fs.readFileSync(file, "utf8"));
	} catch {
		return {};
	}
}
