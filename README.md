# Tripwire

**Your AI agent's worst failure is the one that returns `ok`.** A refund that fires at ten times its cap. A record silently overwritten. A call to the wrong endpoint that succeeds. The run looks green, and the customer finds the bug.

Tripwire is a read-only scanner that catches the action that looks fine and isn't, before it reaches anyone. Point it at your agent, say what must always be true, and it runs the agent against your inputs and a library of adversarial ones, then flags every action that completed but broke a rule. Zero dependencies.

Tripwire is the **watch** in Deadlatch, the open runtime governance stack. Purse enforces what an agent can do, blackbox proves what it did, Tripwire catches what slipped through.

```bash
npm i @olurabian/tripwire
```

## Quick start

Say what must hold. Point Tripwire at your agent. Scan.

```ts
import { scan, defineExpectations, renderTerminal } from "@olurabian/tripwire";
import type { Recorder } from "@olurabian/tripwire";

// 1. State the invariants. A false means that action is an offender.
const expectations = defineExpectations([
  {
    id: "refund-within-cap",
    reason: "A refund went over the 1000 ceiling.",
    where: { action: "refund" },
    must: (r) => (r.input as { amount: number }).amount <= 1000,
  },
]);

// 2. Your agent. Wrap each action it takes so Tripwire can see it.
async function agent(input: unknown, rec: Recorder) {
  if (String(input).includes("refund")) {
    // this returns "ok", but the amount is wrong
    await rec.wrap("refund", { amount: 999999 }, () => "done");
  } else {
    await rec.wrap("charge", { amount: 20 }, () => "done");
  }
}

// 3. Scan. Runs your agent, plus a library of adversarial inputs.
const report = await scan({
  entrypoint: agent,
  expectations,
  adversarial: true,
  report: "tripwire-report.html",
});

console.log(renderTerminal(report));
// the refund completed "ok" and still broke the rule, so Tripwire flags it
```

## How it works

Three parts, and one rule about which of them gets to decide.

**Record.** Wrap each action your agent takes with `rec.wrap(action, input, fn)`. Tripwire captures the action name, the input, the outcome, the latency, and any error into a trace. Nothing is blocked and nothing is changed. It only watches.

**Check.** Your expectations are deterministic predicates. Each one names the records it applies to with `where`, and returns true when that record is fine. A `false` is an offender, full stop. This is the only thing that decides pass or fail.

**Judge (optional).** Pass an LLM-backed `judge` that reviews the trace and raises suspicions, notes about actions that look off. A suspicion is advisory only. It carries no verdict and can never flip a result, so a hallucinating judge cannot pass a real failure or fail a real pass. The deterministic check stays in charge. The default is `noopJudge`, which raises nothing.

**Adversarial.** Set `adversarial: true` and Tripwire runs your agent against a built-in library of hostile inputs designed to trigger the silent wrong action. Add your own with `scenarios`.

You get back a `ScanReport` with every scenario, the offending records, and a summary. Print it with `renderTerminal(report)`, or write an HTML report with the `report` option.

## What it is, and what it is not

Tripwire **detects**. It does not block. It is read-only by design, so you can put it next to a live agent today without changing how the agent behaves. When you want to stop the action before it happens, that is enforcement, and that is Purse.

Already recording actions with blackbox? Hand a blackbox log to `fromBlackbox()` and scan the trace you already have.

## The Deadlatch stack

Three primitives, one control loop. Adopt one, or run all three.

- **[Purse](https://github.com/ArabianAnalyst/purse)**, enforce. Stop the action off-policy, at the moment it happens.
- **[blackbox](https://github.com/ArabianAnalyst/blackbox)**, prove. A tamper-evident record of what happened, verifiable outside the tool.
- **Tripwire**, watch. Catch the silent wrong action before a customer does.

## License

MIT
