import type { ActionRecord } from "./types.js";
import type { Trace } from "./trace.js";
import type { CheckResult } from "./checker.js";

// A suspicion is always advisory. It names a record and a note, and may propose
// an expectation to add. It deliberately carries no verdict field. The
// deterministic checker is the only thing that decides pass or fail.
export interface Suspicion {
  record: ActionRecord;
  note: string;
  proposedExpectation?: string;
}

export interface Judge {
  review(trace: Trace, checks: CheckResult[]): Promise<Suspicion[]>;
}

export const noopJudge: Judge = {
  async review(): Promise<Suspicion[]> {
    return [];
  },
};
