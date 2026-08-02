import type { ActionRecord, RecordMatcher } from "./types.ts";
import type { Trace } from "./trace.ts";

export interface Expectation {
  id: string;
  reason: string;
  // which records this applies to. Omit to apply to every record.
  where?: RecordMatcher;
  // must hold for each matched record. false means that record is an offender.
  must: (record: ActionRecord, trace: Trace) => boolean;
}

export function defineExpectations(list: Expectation[]): Expectation[] {
  const ids = new Set<string>();
  for (const e of list) {
    if (ids.has(e.id)) throw new Error(`Duplicate expectation id: ${e.id}`);
    ids.add(e.id);
  }
  return list;
}
