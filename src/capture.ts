import type { ActionRecord } from "./types.ts";
import { Trace } from "./trace.ts";

export class Recorder {
  private readonly records: ActionRecord[] = [];

  record(rec: ActionRecord): void {
    this.records.push(rec);
  }

  async wrap<T>(
    action: string,
    input: unknown,
    fn: () => Promise<T> | T,
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      this.records.push({
        action,
        input,
        outcome: "ok",
        latencyMs: Date.now() - start,
      });
      return result;
    } catch (e) {
      this.records.push({
        action,
        input,
        outcome: "error",
        error: String(e),
        latencyMs: Date.now() - start,
      });
      throw e;
    }
  }

  trace(): Trace {
    return new Trace(this.records);
  }
}

// blackbox records already match ActionRecord shape; this is an explicit adapter
// so callers using blackbox can feed its record array straight into the checker.
export function fromBlackbox(records: ActionRecord[]): Trace {
  return new Trace(records);
}
