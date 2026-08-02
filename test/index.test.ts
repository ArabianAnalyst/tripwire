import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, rmSync } from "node:fs";
import { scan, defineExpectations, renderTerminal } from "../src/index.ts";
import { Recorder } from "../src/index.ts";

test("public API runs an end-to-end scan and writes a report file when asked", async () => {
  const expectations = defineExpectations([
    {
      id: "no-refund",
      reason: "The agent issued a refund it should never issue.",
      where: { action: "refund" },
      must: () => false,
    },
  ]);
  const path = "test/tmp-report.html";
  const report = await scan({
    entrypoint: async (input, rec: Recorder) => {
      await rec.wrap("refund", { amount: 10 }, () => "ok");
    },
    expectations,
    scenarios: [{ name: "s1", input: "x" }],
    adversarial: false,
    report: path,
  });
  assert.equal(report.summary.violatedScenarios, 1);
  assert.ok(existsSync(path));
  assert.match(renderTerminal(report), /no-refund/);
  rmSync(path);
});
