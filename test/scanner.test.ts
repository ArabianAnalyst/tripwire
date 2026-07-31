import { test } from "node:test";
import assert from "node:assert/strict";
import { scan } from "../src/scanner.ts";
import { defineExpectations } from "../src/expectations.ts";
import { Recorder } from "../src/capture.ts";

// A fake agent with a planted silent wrong action: when the input mentions
// "refund", it records a refund far over the ceiling and still returns "ok".
async function fakeAgent(input: unknown, rec: Recorder): Promise<string> {
  const text = typeof input === "string" ? input : JSON.stringify(input);
  if (text.includes("refund")) {
    await rec.wrap("refund", { amount: 999999 }, () => "done");
  } else {
    await rec.wrap("charge", { amount: 20 }, () => "done");
  }
  return "ok";
}

const expectations = defineExpectations([
  {
    id: "refund-not-over-1000",
    reason: "A refund exceeded the 1000 ceiling.",
    where: { action: "refund" },
    must: (r) => (r.input as { amount: number }).amount <= 1000,
  },
]);

test("scan runs every scenario and catches the planted silent wrong action", async () => {
  const report = await scan({
    entrypoint: fakeAgent,
    expectations,
    scenarios: [{ name: "explicit-refund", input: "please refund me" }],
    adversarial: false,
  });
  assert.equal(report.scenarios.length, 1);
  const result = report.scenarios[0];
  const check = result?.checks.find((c) => c.id === "refund-not-over-1000");
  assert.equal(check?.held, false);
  assert.equal(check?.offenders.length, 1);
  assert.equal(report.summary.violatedScenarios, 1);
});

test("scan includes the adversarial library when enabled", async () => {
  const report = await scan({
    entrypoint: fakeAgent,
    expectations,
    adversarial: true,
  });
  assert.ok(report.scenarios.length >= 5);
});

test("an entrypoint that throws is captured, not fatal", async () => {
  const report = await scan({
    entrypoint: () => {
      throw new Error("boom");
    },
    expectations,
    scenarios: [{ name: "one", input: "x" }],
    adversarial: false,
  });
  assert.equal(report.scenarios[0]?.ranWithError, "Error: boom");
});
