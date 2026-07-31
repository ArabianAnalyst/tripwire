import { test } from "node:test";
import assert from "node:assert/strict";
import { Trace } from "../src/trace.ts";
import { defineExpectations } from "../src/expectations.ts";
import { runExpectations } from "../src/checker.ts";
import type { ActionRecord } from "../src/types.ts";

const expectations = defineExpectations([
  {
    id: "refund-not-over-1000",
    reason: "A refund exceeded the 1000 ceiling.",
    where: { action: "refund" },
    must: (r) => (r.input as { amount: number }).amount <= 1000,
  },
]);

test("held is true when no record violates", () => {
  const trace = new Trace([
    { action: "refund", input: { amount: 5 }, outcome: "ok" },
  ] satisfies ActionRecord[]);
  const [result] = runExpectations(expectations, trace);
  assert.equal(result?.held, true);
  assert.equal(result?.offenders.length, 0);
});

test("held is false and the offender is returned when a record violates", () => {
  const trace = new Trace([
    { action: "refund", input: { amount: 5 }, outcome: "ok" },
    { action: "refund", input: { amount: 5000 }, outcome: "ok" },
  ] satisfies ActionRecord[]);
  const [result] = runExpectations(expectations, trace);
  assert.equal(result?.held, false);
  assert.equal(result?.offenders.length, 1);
  assert.equal((result?.offenders[0]?.input as { amount: number }).amount, 5000);
});

test("records outside the where scope are ignored", () => {
  const trace = new Trace([
    { action: "charge", input: { amount: 9999 }, outcome: "ok" },
  ] satisfies ActionRecord[]);
  const [result] = runExpectations(expectations, trace);
  assert.equal(result?.held, true);
});
