// spec/notes/previousDevice.md, "Story: Read Notes kept by an earlier installation of Alpha"
import { deepEqual, rejects } from "node:assert/strict";
import { test } from "vitest";
import { previousDeviceSlots, readPreviousDeviceNotes } from "../../src/notes/previous-device-notes.ts";

const savedReply = (records: unknown[]) => ({ value: JSON.stringify({
  version: 1, currentRaw: JSON.stringify({ version: 2, records }),
  archive: { v1: null, v2: null, daily: null },
}) });

test("reads the earlier encrypted collection and its draft as separate sources", async () => {
  const slots: string[] = [];
  const draft = { version: 1, records: [{ id: "n1", title: "Draft title", body: "Draft body" }], removed: ["n2"] };
  const result = await readPreviousDeviceNotes(async (slot) => {
    slots.push(slot);
    return slot === previousDeviceSlots.saved
      ? savedReply([{ id: "n1", title: "Saved title", body: "Saved body", items: [{ t: "First item", done: true }] }])
      : { value: JSON.stringify(draft) };
  }, new AbortController().signal);
  deepEqual(slots, [previousDeviceSlots.saved, previousDeviceSlots.draft]);
  deepEqual(result, {
    saved: { status: "available", notes: [{ id: "n1", title: "Saved title", body: "Saved body", details: ["✓ First item"] }], pendingRemovals: 0 },
    draft: { status: "available", notes: [{ id: "n1", title: "Draft title", body: "Draft body", details: [] }], pendingRemovals: 1 },
  });
});

test("distinguishes absent data and unreadable data without losing the other source", async () => {
  const signal = new AbortController().signal;
  deepEqual(await readPreviousDeviceNotes(async (slot) => slot === previousDeviceSlots.saved
    ? { value: null } : { value: "invalid JSON" }, signal), {
    saved: { status: "empty" }, draft: { status: "unavailable" },
  });
  deepEqual(await readPreviousDeviceNotes(async (slot) => {
    if (slot === previousDeviceSlots.saved) throw new Error("local native refusal");
    return { value: JSON.stringify({ version: 1, records: [], removed: ["n1"] }) };
  }, signal), {
    saved: { status: "unavailable" }, draft: { status: "available", notes: [], pendingRemovals: 1 },
  });
});

test("ignores an interrupted result and reads again on a later open", async () => {
  const aborted = new AbortController();
  const visited: string[] = [];
  await rejects(readPreviousDeviceNotes(async (slot) => {
    visited.push(slot);
    aborted.abort();
    return savedReply([]);
  }, aborted.signal), { name: "AbortError" });
  deepEqual(visited, [previousDeviceSlots.saved]);
  deepEqual(await readPreviousDeviceNotes(async () => ({ value: null }), new AbortController().signal), {
    saved: { status: "empty" }, draft: { status: "empty" },
  });
});
