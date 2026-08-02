import type { ActionRecord } from "./types.ts";
import { matches } from "./types.ts";
import type { Trace } from "./trace.ts";
import type { Expectation } from "./expectations.ts";

export interface CheckResult {
  id: string;
  reason: string;
  held: boolean;
  offenders: ActionRecord[];
}

export function runExpectations(
  expectations: Expectation[],
  trace: Trace,
): CheckResult[] {
  return expectations.map((e) => {
    const scope = e.where
      ? trace.records.filter((r) => matches(r, e.where!))
      : trace.records;
    const offenders = scope.filter((r) => !e.must(r, trace));
    return {
      id: e.id,
      reason: e.reason,
      held: offenders.length === 0,
      offenders,
    };
  });
}
