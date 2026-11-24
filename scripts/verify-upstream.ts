import fs from "node:fs";
import {sha256File} from "./sha256.ts";
import { execFileSync } from "node:child_process";
import {
	assessDevelopReachability,
	reachabilityMode,
	readReachabilityRecord,
	REACHABILITY_RECORD,
	verifyPinnedUpstream,
} from "./pinned-upstream-source.ts";
import { readUpstreamPin } from "./upstream-pin.ts";
import {STAGED_AGENT_ASSETS} from "./agent-payload.ts";

const argv = process.argv.slice(2);
// --reachability-only reports the recorded upstream branch compare without re-authenticating vendor bytes.
const reachabilityOnly = argv.includes("--reachability-only");
const { commit } = reachabilityOnly
	? readUpstreamPin(process.cwd())
	: await verifyPinnedUpstream(process.cwd());

if (!reachabilityOnly && argv.includes("--record-reachability")) {
	// Explicit, networked refresh of the recorded compare. CI never runs this.
	const lock = readUpstreamPin(process.cwd());
	const base = lock.branch || "vibestack";
	const repository = new URL(lock.url).pathname.replace(/^\//, "").replace(/\.git$/, "");
	const api = (route: string, jq: string) =>
		execFileSync("gh", ["api", route, "--jq", jq], { encoding: "utf8", timeout: 120_000 }).trim();
	const compare = JSON.parse(api(`repos/${repository}/compare/${base}...${commit}`,
		"{status,ahead_by,behind_by,merge_base:.merge_base_commit.sha,commits:[.commits[]|select((.parents|length)==1)|{sha:.sha,subject:(.commit.message|split(\"\\n\")[0])}]}"));
	const previous = readReachabilityRecord(process.cwd()) ?? {};
	const record = {
		schema: 1,
		repository,
		base,
		baseCommit: api(`repos/${repository}/branches/${base}`, ".commit.sha"),
		head: commit,
		recordedAt: new Date().toISOString().slice(0, 10),
		command: `gh api repos/${repository}/compare/${base}...${commit}`,
		status: compare.status,
		aheadBy: compare.ahead_by,
		behindBy: compare.behind_by,
		mergeBase: compare.merge_base,
		pinOnlyCommits: compare.commits,
		pullRequests: Array.isArray(previous.pullRequests) ? previous.pullRequests : [],
		// Hand-maintained PR bookkeeping survives a refresh of the compare.
		...(previous.pendingPullRequest ? { pendingPullRequest: previous.pendingPullRequest } : {}),
	};
	fs.writeFileSync(REACHABILITY_RECORD, `${JSON.stringify(record, null, 2)}\n`);
	console.log(`Recorded ${REACHABILITY_RECORD}: ${record.status}, ahead ${record.aheadBy}, behind ${record.behindBy}`);
}

const stampFile = `${STAGED_AGENT_ASSETS}/alpha-source.json`;
if (!reachabilityOnly && fs.existsSync(stampFile)) {
	const stamp = JSON.parse(fs.readFileSync(stampFile, "utf8"));
	const hash = (file: string) =>
		sha256File(file);
	if (
		stamp.base !== commit ||
		!Array.isArray(stamp.patches) ||
		stamp.patches.length ||
		stamp.lockSha256 !== hash("upstream.lock.json") ||
		stamp.stagerSha256 !== hash("scripts/stage-agent-runtime.ts")
	)
		throw new Error(
			"Staged runtime does not match the pinned source; prepare and stage it before packaging.",
		);
}
if (!reachabilityOnly) console.log(`Eliza source verified: ${commit}`);

const mode = reachabilityMode(argv, process.env);
if (mode !== "off") {
	const result = assessDevelopReachability(readReachabilityRecord(process.cwd()), commit);
	if (result.ok) console.log(`Upstream reachability: ${result.message}`);
	else if (mode === "fail") {
		console.error(`Upstream reachability (fail): ${result.message}`);
		process.exit(1);
	} else console.warn(`Upstream reachability (warning): ${result.message}`);
}
