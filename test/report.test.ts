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

test("terminal render shows the offending record and the input that caused it", () => {
  const out = renderTerminal(report);
  assert.match(out, /999999/); // the offending action's own input value
  assert.match(out, /refund me/); // the scenario input that triggered the run
  assert.match(out, /outcome=ok/); // the offending action's outcome
  assert.match(out, /1 offending action\b/); // singular, no trailing s
});

test("html render is self-contained and contains the finding", () => {
  const html = renderHtml(report);
  assert.match(html, /<!doctype html>/i);
  assert.doesNotMatch(html, /https?:\/\//); // no external requests
  assert.match(html, /refund-not-over-1000/);
  assert.match(html, /A refund exceeded the 1000 ceiling\./);
});

test("html render shows offender detail and the causing input", () => {
  const html = renderHtml(report);
  assert.match(html, /999999/); // offender input value rendered
  assert.match(html, /refund me/); // scenario input rendered
  assert.match(html, /outcome/i); // offender outcome shown
});

test("offending action count pluralizes", () => {
  const two: ScanReport = {
    scenarios: [
      {
        scenario: { name: "s", input: "x" },
        checks: [
          {
            id: "e",
            reason: "r",
            held: false,
            offenders: [
              { action: "a", input: 1, outcome: "ok" },
              { action: "b", input: 2, outcome: "ok" },
            ],
          },
        ],
        suspicions: [],
      },
    ],
    summary: { totalScenarios: 1, violatedScenarios: 1, suspicions: 0 },
  };
  assert.match(renderTerminal(two), /2 offending actions/);
  assert.match(renderHtml(two), /2 offending actions/);
});
