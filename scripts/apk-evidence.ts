import { mkdtemp, mkdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  aaptManifestTree,
  assertAndroidArtifactSnapshotUnchanged,
  dumpAndroidArtifactBadging,
  listAndroidArtifactEntries,
  manifestFacts,
  readAndroidArtifactEntryBuffers,
  readApkSignerDigest,
  snapshotAndroidArtifact,
} from "@elizaos/os/image";
import { androidEnv, tool } from "./toolchain.ts";
import { run } from "./upstream-effect.ts";
import { sha256File } from "./sha256.ts";

// The two-ABI Alpha build carries the resident runtime and on-device voice together.
const MAX_ALPHA_APK_BYTES = 1024 * 1024 * 1024;

interface EntryBudget {
  readonly label: string;
  readonly maxEntryBytes?: number;
  readonly maxTotalBytes?: number;
}

export interface ApkEvidence {
  readonly sourceFile: string;
  readonly toolFile: string;
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly names: readonly string[];
  entries(names: readonly string[], budget: EntryBudget): Promise<ReadonlyMap<string, Buffer>>;
  manifest(): Promise<{
    readonly xml: string;
    readonly badging: string;
    readonly facts: ReturnType<typeof manifestFacts>;
  }>;
  signer(apiLevel?: number): Promise<string>;
}

/** Scope native tools and archive readers to the same package bytes. */
export async function withApkEvidence<A>(sourceFile: string, inspect: (apk: ApkEvidence) => Promise<A>): Promise<A> {
  const snapshot = await run(snapshotAndroidArtifact(sourceFile, { maxArtifactBytes: MAX_ALPHA_APK_BYTES }));
  const names = await run(listAndroidArtifactEntries(sourceFile, { artifactBytes: snapshot.bytes }));
  const privateDir = await mkdtemp(path.join(tmpdir(), "alpha-apk-evidence-"));
  const toolFile = path.join(privateDir, "candidate.apk");
  try {
    await writeFile(toolFile, snapshot.bytes, { flag: "wx", mode: 0o400 });
    let manifest: ReturnType<ApkEvidence["manifest"]> | undefined;
    const result = await inspect({
      sourceFile,
      toolFile,
      sha256: snapshot.sha256,
      sizeBytes: snapshot.sizeBytes,
      names,
      async entries(requested, budget) {
        const buffers = await run(readAndroidArtifactEntryBuffers(sourceFile, requested, { ...budget, artifactBytes: snapshot.bytes }));
        return new Map(requested.map((entry, index) => [entry, buffers[index]!]));
      },
      manifest() {
        return manifest ??= (async () => {
          const aapt = tool("aapt");
          const [xml, badging] = await Promise.all([
            run(aaptManifestTree(toolFile, { aapt, env: androidEnv() })),
            run(dumpAndroidArtifactBadging(aapt, toolFile)),
          ]);
          return { xml, badging, facts: manifestFacts(xml, badging) };
        })();
      },
      signer(apiLevel) {
        if (apiLevel !== undefined && (!Number.isSafeInteger(apiLevel) || apiLevel < 1)) {
          throw new Error("Invalid Android API level");
        }
        return run(readApkSignerDigest(toolFile, { apksigner: tool("apksigner"), apiLevel, env: androidEnv() }));
      },
    });
    const verify = async (file: string) => {
      const sizeBytes = (await stat(file)).size;
      await run(assertAndroidArtifactSnapshotUnchanged(file, snapshot, { sha256: sha256File(file), sizeBytes }));
    };
    await verify(sourceFile);
    await verify(toolFile);
    return result;
  } finally {
    await rm(privateDir, { recursive: true, force: true });
  }
}

const PUBLIC_PREFIX = "assets/public/";

export async function withPackagedWeb<A>(apk: ApkEvidence, inspect: (publicDir: string) => A | Promise<A>): Promise<A> {
  const files = apk.names.filter((entry) => entry.startsWith(PUBLIC_PREFIX) && !entry.endsWith("/"));
  if (!files.includes(PUBLIC_PREFIX + "index.html")) throw new Error("The APK has no packaged web entry point");
  const buffers = await apk.entries(files, { label: "packaged web payload" });
  const directory = await mkdtemp(path.join(tmpdir(), "alpha-apk-public-"));
  try {
    for (const [entry, bytes] of buffers) {
      const relative = entry.slice(PUBLIC_PREFIX.length);
      const destination = path.resolve(directory, relative);
      if (!destination.startsWith(directory + path.sep)) throw new Error("Unsafe packaged web entry " + entry);
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, bytes, { flag: "wx" });
    }
    return await inspect(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
