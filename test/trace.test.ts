import { test } from "node:test";
import assert from "node:assert/strict";
import { Trace } from "../src/trace.ts";
import type { ActionRecord } from "../src/types.ts";

const records: ActionRecord[] = [
  { action: "charge", input: { amount: 20 }, outcome: "ok" },
  { action: "refund", input: { amount: 5 }, outcome: "ok" },
  { action: "charge", input: { amount: 999 }, outcome: "error", error: "cap" },
];

test("records are exposed in order", () => {
  const t = new Trace(records);
  assert.equal(t.records.length, 3);
  assert.equal(t.records[0]?.action, "charge");
});

test("where filters by an object matcher (all keys must equal)", () => {
  const t = new Trace(records);
  assert.equal(t.where({ action: "charge" }).length, 2);
  assert.equal(t.where({ action: "charge", outcome: "ok" }).length, 1);
});

test("where filters by a predicate function", () => {
  const t = new Trace(records);
  const big = t.where((r) => (r.input as { amount: number }).amount > 100);
  assert.equal(big.length, 1);
  assert.equal(big[0]?.action, "charge");
});

test("count returns the number of matches", () => {
  const t = new Trace(records);
  assert.equal(t.count({ action: "refund" }), 1);
});
