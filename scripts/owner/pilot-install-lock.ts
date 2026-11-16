import fs from "node:fs";
import path from "node:path";
import { errorCode } from "./input.ts";

const hex64 = /^[a-f0-9]{64}$/;

function syncDirectory(directory: string) {
  const fd = fs.openSync(directory, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY);
  try { fs.fsyncSync(fd); }
  finally { fs.closeSync(fd); }
}

/** Hold the same device lock across every pilot install, regardless of alias or worktree. */
export function claimPilotInstall(directory: string, deviceId: string, durableAnchor: string) {
  if (!hex64.test(deviceId)) throw new Error("Invalid pilot device identity");
  directory = path.resolve(directory);
  const anchor = path.resolve(durableAnchor);
  const relative = path.relative(anchor, directory);
  if (!relative || relative === ".." || relative.startsWith(".." + path.sep) || path.isAbsolute(relative))
    throw new Error("Pilot install lock must be inside its durable anchor");
  const lock = path.join(directory, deviceId + ".lock");
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const owner = fs.lstatSync(directory);
  if (!owner.isDirectory() || owner.uid !== process.getuid?.() || (owner.mode & 0o077) !== 0)
    throw new Error("Pilot install lock directory must be owner-only");
  // Another process may have just created an ancestor and not synced it yet.
  for (let parent = path.dirname(directory); ; parent = path.dirname(parent)) {
    syncDirectory(parent);
    if (parent === anchor) break;
  }
  try { fs.mkdirSync(lock, { mode: 0o700 }); }
  catch (error) {
    if (errorCode(error) === "EEXIST") throw new Error("Pilot install lock is held. Reconcile the device before another install.");
    throw error;
  }
  syncDirectory(directory);
  return () => {
    fs.rmdirSync(lock);
    syncDirectory(directory);
  };
}
