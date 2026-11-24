import assert from "node:assert/strict";
import test from "node:test";
import { carrierFieldText, createCarrierSession } from "../apps/app/src/settings/carrier.ts";

const field = (value) => ({ status: "available", value });
const beforeActivation = {
  status: "ready",
  slots: [
    { slotIndex: 0, imei: field("000000000000001"), simState: field("No SIM") },
    { slotIndex: 1, imei: { status: "permission-denied" }, simState: field("No SIM") },
  ],
  subscriptions: { status: "available", items: [] },
  eid: { status: "not-read" },
};

function fixture(ports = {}) {
  return createCarrierSession({
    read: async () => beforeActivation,
    readEid: async () => field("00000000000000000000000000000001"),
    copy: async () => {},
    current: () => true,
    changed: () => {},
    ...ports,
  });
}

test("IMEI can be shown before SIM activation, only on request, and only one available field is copied", async () => {
  let current = false;
  let reads = 0;
  const copied = [];
  const session = fixture({
    read: async () => { reads++; return beforeActivation; },
    copy: async (value) => copied.push(value),
    current: () => current,
  });
  await session.show();
  current = true;
  assert.equal(reads, 0);
  assert.equal(await session.copy("imei-0"), false);
  await session.show();
  assert.equal(reads, 1);
  assert.equal(session.snapshot().data.slots[0].simState.value, "No SIM");
  assert.equal(await session.copy("imei-1"), false);
  assert.equal(await session.copy("eid"), false);
  assert.equal(await session.copy("imei-0"), true);
  assert.deepEqual(copied, ["000000000000001"]);
});

test("leaving the foreground drops a pending answer even when the owner immediately returns", async () => {
  let current = true;
  const first = Promise.withResolvers();
  const second = Promise.withResolvers();
  const requests = [first.promise, second.promise];
  const session = fixture({ read: () => requests.shift(), current: () => current });
  const oldRead = session.show();
  await session.show();
  assert.equal(requests.length, 1);
  current = false;
  session.clear();
  current = true;
  const freshRead = session.show();
  first.resolve(beforeActivation);
  await oldRead;
  assert.equal(session.snapshot().busy, true);
  assert.equal(session.snapshot().data, undefined);
  second.resolve(beforeActivation);
  await freshRead;
  assert.equal(session.snapshot().data, beforeActivation);
  session.clear();
  assert.equal(await session.copy("imei-0"), false);
});

test("an old optional EID read cannot overwrite a new physical SIM read", async () => {
  const pending = Promise.withResolvers();
  let eidReads = 0;
  const session = fixture({ readEid: () => { eidReads++; return pending.promise; } });
  await session.show();
  assert.equal(eidReads, 0);
  const eid = session.showEid();
  await session.showEid();
  assert.equal(eidReads, 1);
  await session.show();
  assert.equal(session.snapshot().data.slots[0].imei.value, "000000000000001");
  pending.resolve(field("00000000000000000000000000000001"));
  await eid;
  assert.equal(session.snapshot().data.eid.status, "not-read");
});

test("a failed refresh clears old values and denial is distinct from missing hardware", async () => {
  let unreadable = false;
  const session = fixture({ read: async () => {
    if (unreadable) throw new Error("unavailable");
    return beforeActivation;
  } });
  await session.show();
  unreadable = true;
  await session.show();
  assert.deepEqual(session.snapshot(), { data: undefined, busy: false, eidBusy: false, failed: true });
  assert.equal(carrierFieldText({ status: "permission-denied" }), "Access denied by Android");
  assert.equal(carrierFieldText({ status: "unsupported" }), "Not supported on this device");
  assert.equal(carrierFieldText({ status: "unavailable" }), "Unavailable from Android");
});
