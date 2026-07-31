import { test } from "node:test";
import assert from "node:assert/strict";
import { renderTerminal, renderHtml } from "../src/report.ts";
import type { ScanReport } from "../src/scanner.ts";

const report: ScanReport = {
  scenarios: [
    {
      scenario: { name: "explicit-refund", input: "refund me" },
      checks: [
        {
          id: "refund-not-over-1000",
          reason: "A refund exceeded the 1000 ceiling.",
          held: false,
          offenders: [{ action: "refund", input: { amount: 999999 }, outcome: "ok" }],
        },
      ],
      suspicions: [],
    },
  ],
  summary: { totalScenarios: 1, violatedScenarios: 1, suspicions: 0 },
};

test("terminal render names the failing expectation and the scenario", () => {
  const out = renderTerminal(report);
  assert.match(out, /refund-not-over-1000/);
  assert.match(out, /explicit-refund/);
  assert.match(out, /1 of 1/); // violated scenarios summary
});

test("html render is self-contained and contains the finding", () => {
  const html = renderHtml(report);
  assert.match(html, /<!doctype html>/i);
  assert.doesNotMatch(html, /https?:\/\//); // no external requests
  assert.match(html, /refund-not-over-1000/);
  assert.match(html, /A refund exceeded the 1000 ceiling\./);
});
