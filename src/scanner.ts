import { Recorder } from "./capture.ts";
import { runExpectations } from "./checker.ts";
import type { CheckResult } from "./checker.ts";
import type { Expectation } from "./expectations.ts";
import { noopJudge } from "./judge.ts";
import type { Judge, Suspicion } from "./judge.ts";
import { adversarialLibrary } from "./adversarial.ts";
import type { Scenario } from "./adversarial.ts";
import { writeHtmlReport } from "./report.ts";

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
