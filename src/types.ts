export type Outcome = "ok" | "error" | "blocked";

export interface ActionRecord {
  action: string;
  input?: unknown;
  outcome: Outcome;
  error?: string;
  cost?: number;
  latencyMs?: number;
  meta?: Record<string, unknown>;
}

export type RecordMatcher =
  | Partial<Pick<ActionRecord, "action" | "outcome">>
  | ((record: ActionRecord) => boolean);

export function matches(record: ActionRecord, matcher: RecordMatcher): boolean {
  if (typeof matcher === "function") return matcher(record);
  return Object.entries(matcher).every(
    ([k, v]) => record[k as keyof ActionRecord] === v,
  );
}
