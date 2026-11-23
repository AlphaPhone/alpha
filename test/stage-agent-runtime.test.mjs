import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {publishAgentRuntime, TARGET_ABIS} from "../scripts/stage-agent-runtime.ts";

const main = "android/app/src/main";
const bundle = `${main}/assets/agent/agent.mjs`;
const embedding = `${main}/assets/agent/models/bge.gguf`;
const node = abi => `${main}/jniLibs/${abi}/libeliza_node.so`;
const voice = abi => `${main}/jniLibs/${abi}/libelizainference.so`;

test("the SDK's staged assets and both Node libraries land in Alpha's source set on each run", t => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "alpha-runtime-publication-"));
  t.after(() => fs.rmSync(work, {recursive: true, force: true}));
  const product = path.join(work, "product");
  const put = (dir, relative, text) => {
    const target = path.join(dir, relative);
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, text);
  };
  const read = relative => fs.readFileSync(path.join(product, relative), "utf8");
  const stage = (version, abis = TARGET_ABIS) => {
    const scratch = fs.mkdtempSync(path.join(work, "stage-"));
    const payload = path.join(scratch, "payload");
    put(payload, bundle, `bundle ${version}`);
    for (const abi of abis) put(payload, node(abi), `Node ${version} ${abi}`);
    return () => publishAgentRuntime(product, payload, TARGET_ABIS, scratch);
  };
  put(product, embedding, "qualified embedding model");
  for (const abi of TARGET_ABIS) put(product, voice(abi), `qualified voice ${abi}`);
  stage(1)();
  assert.equal(read(bundle), "bundle 1");
  assert.throws(stage(2, [TARGET_ABIS[0]]), /ENOENT/);
  assert.equal(read(bundle), "bundle 1");
  for (const abi of TARGET_ABIS) assert.equal(read(node(abi)), `Node 1 ${abi}`);
  const rename = fs.renameSync;
  const refused = t.mock.method(fs, "renameSync", (source, destination) => {
    if (destination === path.join(product, node("x86_64")) && source.includes(`${path.sep}payload${path.sep}`)) {
      throw new Error("x86_64 publication refused");
    }
    return rename(source, destination);
  });
  assert.throws(stage(2), /x86_64 publication refused/);
  refused.mock.restore();
  assert.equal(read(bundle), "bundle 1");
  assert.equal(read(embedding), "qualified embedding model");
  for (const abi of TARGET_ABIS) assert.equal(read(node(abi)), `Node 1 ${abi}`);
  stage(2)();
  assert.equal(read(bundle), "bundle 2");
  assert.equal(read(embedding), "qualified embedding model");
  for (const abi of TARGET_ABIS) {
    assert.equal(read(node(abi)), `Node 2 ${abi}`);
    assert.equal(read(voice(abi)), `qualified voice ${abi}`);
  }
});
