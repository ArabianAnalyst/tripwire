import { Recorder } from "./capture.js";
import { runExpectations } from "./checker.js";
import type { CheckResult } from "./checker.js";
import type { Expectation } from "./expectations.js";
import { noopJudge } from "./judge.js";
import type { Judge, Suspicion } from "./judge.js";
import { adversarialLibrary } from "./adversarial.js";
import type { Scenario } from "./adversarial.js";
import { writeHtmlReport } from "./report.js";

export type Entrypoint = (
  input: unknown,
  recorder: Recorder,
) => Promise<unknown> | unknown;

export interface ScanOptions {
  entrypoint: Entrypoint;
  expectations: Expectation[];
  scenarios?: Scenario[];
  adversarial?: boolean;
  judge?: Judge;
  report?: string;
}

export interface ScenarioResult {
  scenario: Scenario;
  checks: CheckResult[];
  suspicions: Suspicion[];
  ranWithError?: string;
}

export interface ScanReport {
  scenarios: ScenarioResult[];
  summary: {
    totalScenarios: number;
    violatedScenarios: number;
    suspicions: number;
  };
}

export async function scan(options: ScanOptions): Promise<ScanReport> {
  const judge = options.judge ?? noopJudge;
  const scenarios: Scenario[] = [
    ...(options.scenarios ?? []),
    ...(options.adversarial ? adversarialLibrary() : []),
  ];

  const results: ScenarioResult[] = [];
  for (const scenario of scenarios) {
    const recorder = new Recorder();
    let ranWithError: string | undefined;
    try {
      await options.entrypoint(scenario.input, recorder);
    } catch (e) {
      ranWithError = String(e);
    }
    const trace = recorder.trace();
    const checks = runExpectations(options.expectations, trace);
    const suspicions = await judge.review(trace, checks);
    results.push({ scenario, checks, suspicions, ranWithError });
  }

  const violatedScenarios = results.filter((r) =>
    r.checks.some((c) => !c.held),
  ).length;
  const suspicionCount = results.reduce(
    (n, r) => n + r.suspicions.length,
    0,
  );

  const out: ScanReport = {
    scenarios: results,
    summary: {
      totalScenarios: results.length,
      violatedScenarios,
      suspicions: suspicionCount,
    },
  };

  if (options.report) writeHtmlReport(out, options.report);
  return out;
}
