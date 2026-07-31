import { scan, defineExpectations, renderTerminal } from "../src/index.ts";
import type { Recorder } from "../src/index.ts";

const expectations = defineExpectations([
  {
    id: "refund-not-over-cap",
    reason: "A refund exceeded the 1000 ceiling.",
    where: { action: "refund" },
    must: (r) => (r.input as { amount: number }).amount <= 1000,
  },
]);

async function agent(input: unknown, rec: Recorder): Promise<void> {
  const text = typeof input === "string" ? input : JSON.stringify(input);
  if (text.includes("refund")) {
    await rec.wrap("refund", { amount: 999999 }, () => "done");
  } else {
    await rec.wrap("charge", { amount: 20 }, () => "done");
  }
}

const report = await scan({
  entrypoint: agent,
  expectations,
  adversarial: true,
  report: "tripwire-report.html",
});
console.log(renderTerminal(report));
