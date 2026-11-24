import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { withApkEvidence, withPackagedWeb } from "../scripts/apk-evidence.ts";

function artifact(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "alpha-apk-evidence-test-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const apk = path.join(root, "fixture.apk");
  execFileSync("python3", ["-c", [
    "import sys, zipfile",
    "with zipfile.ZipFile(sys.argv[1], 'w', compression=zipfile.ZIP_DEFLATED) as apk:",
    "    apk.writestr('assets/public/index.html', 'index')",
    "    apk.writestr('assets/public/inner/data.txt', 'page data')",
    "    apk.writestr('assets/owner-routes.json', '{}')",
  ].join("\n"), apk]);
  return apk;
}

test("APK and packaged web readers admit exact entries and discard scoped copies", async t => {
  const apk = artifact(t);
  const [toolFile, web] = await withApkEvidence(apk, async evidence => {
    assert.deepEqual(fs.readFileSync(evidence.toolFile), fs.readFileSync(apk));
    const paths = await withPackagedWeb(evidence, directory => {
      assert.equal(fs.readFileSync(path.join(directory, "inner/data.txt"), "utf8"), "page data");
      assert.equal(fs.existsSync(path.join(directory, "owner-routes.json")), false);
      return directory;
    });
    await assert.rejects(evidence.entries(["assets/public/inner/data.txt"], { label: "test", maxEntryBytes: 4 }), /audit limit/);
    return [evidence.toolFile, paths];
  });
  assert.equal(fs.existsSync(toolFile), false);
  assert.equal(fs.existsSync(web), false);
});

test("APK verification refuses evidence after a same-size source replacement", async t => {
  const apk = artifact(t);
  let toolFile;
  await assert.rejects(withApkEvidence(apk, async evidence => {
    toolFile = evidence.toolFile;
    const replacement = fs.readFileSync(apk);
    replacement[0] ^= 1;
    fs.writeFileSync(apk, replacement);
    const entry = "assets/owner-routes.json";
    const captured = await evidence.entries([entry], { label: "routes" });
    assert.equal(captured.get(entry)?.toString("utf8"), "{}");
  }), /changed during audit/);
  assert.equal(fs.existsSync(toolFile), false);
});

test("APK evidence refuses symbolic links before the inspection runs", async t => {
  const apk = artifact(t);
  const link = path.join(path.dirname(apk), "linked.apk");
  fs.symlinkSync(apk, link);
  await assert.rejects(withApkEvidence(link, async () => assert.fail("must not inspect a link")), /nonempty regular file/);
});
