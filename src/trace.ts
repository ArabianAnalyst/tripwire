import type { ActionRecord, RecordMatcher } from "./types.js";
import { matches } from "./types.js";

export class Trace {
  constructor(readonly records: ActionRecord[]) {}

  where(matcher: RecordMatcher): ActionRecord[] {
    return this.records.filter((r) => matches(r, matcher));
  }

  count(matcher: RecordMatcher): number {
    return this.where(matcher).length;
  }
}
