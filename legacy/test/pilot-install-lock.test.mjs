import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { claimPilotInstall } from "../scripts/owner/pilot-install-lock.ts";

const device = "a".repeat(64);
function lockFixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "alpha-pilot-install-lock-test-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return { anchor: root, directory: path.join(root, "private", "locks") };
}

test("one install holds the device lock until it releases it", t => {
  const { directory, anchor } = lockFixture(t);
  const release = claimPilotInstall(directory, device, anchor);
  try {
    assert.throws(() => claimPilotInstall(directory, device, anchor), /lock is held/);
    // Another device is independent.
    claimPilotInstall(directory, "b".repeat(64), anchor)();
  } finally { release(); }
  claimPilotInstall(directory, device, anchor)();
  assert.equal(fs.statSync(directory).mode & 0o077, 0);
  assert.throws(() => claimPilotInstall(directory, "not-a-digest", anchor), /Invalid pilot device identity/);
});

test("claim syncs every parent even when a peer already created the lock directory", t => {
  const { directory, anchor } = lockFixture(t);
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const openSync = fs.openSync;
  const opened = [];
  t.mock.method(fs, "openSync", (file, flags, ...args) => {
    if ((flags & fs.constants.O_DIRECTORY) !== 0) opened.push(file);
    return openSync(file, flags, ...args);
  });
  const release = claimPilotInstall(directory, device, anchor);
  try {
    assert.deepEqual(opened, [path.dirname(directory), anchor, directory]);
    assert.throws(() => claimPilotInstall(directory, device, directory), /inside its durable anchor/);
  } finally { release(); }
});
