import { test } from "node:test";
import assert from "node:assert/strict";
import { Recorder, fromBlackbox } from "../src/capture.ts";

test("wrap records an ok outcome and returns the result", async () => {
  const r = new Recorder();
  const out = await r.wrap("charge", { amount: 20 }, () => 42);
  assert.equal(out, 42);
  const rec = r.trace().records[0];
  assert.equal(rec?.action, "charge");
  assert.equal(rec?.outcome, "ok");
  assert.equal(typeof rec?.latencyMs, "number");
});

test("wrap records an error outcome and rethrows", async () => {
  const r = new Recorder();
  await assert.rejects(() =>
    r.wrap("charge", { amount: 1 }, () => {
      throw new Error("cap");
    }),
  );
  const rec = r.trace().records[0];
  assert.equal(rec?.outcome, "error");
  assert.equal(rec?.error, "Error: cap");
});

test("record appends a raw record", () => {
  const r = new Recorder();
  r.record({ action: "note", outcome: "ok" });
  assert.equal(r.trace().records.length, 1);
});

test("fromBlackbox ingests a blackbox-shaped record array into a Trace", () => {
  const t = fromBlackbox([
    { action: "charge", outcome: "ok", input: { amount: 5 } },
  ]);
  assert.equal(t.records[0]?.action, "charge");
});
