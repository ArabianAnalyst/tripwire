import { test } from "node:test";
import assert from "node:assert/strict";
import { Trace } from "../src/trace.ts";
import { noopJudge } from "../src/judge.ts";
import type { Judge, Suspicion } from "../src/judge.ts";

test("noopJudge returns no suspicions", async () => {
  const out = await noopJudge.review(new Trace([]), []);
  assert.deepEqual(out, []);
});

test("a judge only ever returns labeled suspicions, never a verdict", async () => {
  // A judge that flags every record. Its output must be Suspicion[], nothing
  // that could stand in for held/pass. This encodes the hard invariant.
  const flagAll: Judge = {
    async review(trace) {
      return trace.records.map(
        (record): Suspicion => ({ record, note: "looks off" }),
      );
    },
  };
  const trace = new Trace([{ action: "charge", outcome: "ok" }]);
  const out = await flagAll.review(trace, []);
  assert.equal(out.length, 1);
  assert.equal(out[0]?.note, "looks off");
  // Suspicions carry no held/verdict field.
  assert.equal("held" in (out[0] as object), false);
});
