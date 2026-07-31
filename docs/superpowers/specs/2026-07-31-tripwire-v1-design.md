# Tripwire v1 — Design

> Working name: **Tripwire** (provisional). Alternatives to weigh at the end: Blindspot, Redcell.
> Date: 2026-07-31 · Status: design approved, pre-plan · Author: ARABA

**One line:** A scanner that catches the silent wrong action, the thing an AI agent does that returns "ok" but is wrong, before a customer hits it.

---

## Problem it solves

Teams are shipping AI agents that act on real systems and real money. The dangerous failure is not a crash. It is the **silent wrong action**, the agent that faithfully executes the wrong decision, returns success, throws no error, and is not caught until a customer feels it. Normal QA checks deterministic code. Nothing on the market attacks agent-shaped failure the way it needs to be attacked, and the tools that try reach for an LLM judge, which is another AI that can be confidently wrong, the exact failure being sold against.

## Who it is for (beachhead ICP)

Technical teams shipping AI agents, especially agents that touch money or act on customer systems. This is the same buyer as Purse and blackbox. They already lie awake about this failure, they can integrate an SDK, and every install cross-sells the rest of the stack. Fast-follow ICP, companies running agents for their own customers (fintech, ops-automation platforms).

## Core promise

Catch the **silent wrong action**, two ways:
- **Pre-ship (v1):** a tester provokes the agent with adversarial and edge-case inputs and checks what it actually did against declared expectations.
- **Post-ship (later spec):** a monitor watches the live action record and flags the same failures in production.

Everything else the product could check is a rule added around this spine.

---

## Design decisions (the settled forks, with rationale)

1. **Product, not internal tool.** Generality from day one. The SDK and engine work against any agent and any expectations. Multi-tenant hosting arrives with the dashboard slice, not before.
2. **Standalone core, better with the stack.** Ships its own lightweight capture so anyone adopts it alone. If **blackbox** is present it reads the existing record instead of re-capturing. If **Purse** is present it can read enforcement decisions. Three products become one stack, enforce (Purse), prove (blackbox), catch (Tripwire). Every install quietly sells the other two.
3. **Deterministic expectations are the spine. The judge is a labeled secondary.** An AI judging another AI is the one thing this brand does not trust. Developer-declared invariants carry the verdict. An LLM judge only raises a labeled suspicion for a human and proposes new expectations. Same shape as Recovered Revenue Audit, deterministic checks carry the number, the AI is a labeled estimate. This is the moat, everyone else reaches for the judge first.
4. **Gated at propose-for-approval. Read-only, safe by default.** It runs the agent in the developer's own environment through their entrypoint, never touches production, and every finding or proposed rule is a suggestion a human accepts. The watcher that cannot itself go rogue.
5. **Build sequence: shared spine + free tester scan first (the wedge), monitor next.** The free scan is the proven wedge shape (free Red-Flag Scan, free Memory Audit into a paid outcome), it is a shareable artifact, it dogfoods the spine, and the paid monitor is a fast follow on the same foundation.
6. **v1 output is a self-contained HTML report, not a hosted dashboard.** Faster to something in front of people. Dashboard, accounts, storage are the next slice.

---

## v1 scope

**In:**
- The shared spine: capture SDK, expectations API, deterministic checker, labeled judge.
- The tester: developer-provided entrypoint plus an adversarial and edge-case scenario runner.
- Output: terminal summary plus a self-contained, shareable HTML report.
- Dogfood: first real scan run against one of ARABA's own agents (Get Paid or the Outreach booking agent).

**Out (deliberately deferred):** hosted dashboard, accounts, auth, storage backend, the live monitor, billing, teams, auto-remediation, the judge as anything more than a labeled flag.

---

## Architecture and components

### The spine (built once, the monitor reuses all of it)

- **Capture SDK.** A small wrapper the developer puts around the agent's tool and action calls. Records each action as a structured **trace**: `action`, `input`, `outcome`, `error?`, `cost?`, `latencyMs?`, `meta?`, ordered. If blackbox is present, it reads blackbox's record instead of capturing its own (the trace shape is deliberately blackbox-compatible).
- **Expectations.** Developer-declared invariants, deterministic predicates over a trace or a single record. Examples: a refund never exceeds the original charge; tool B only runs after tool A; no spend without a matching approved intent; the agent never calls the same paid tool more than N times per run. Small, typed, composable.
- **Checker.** Runs every expectation against a captured trace and returns, per expectation, pass or fail with the **exact offending record** and a human-readable reason. This is the verdict.
- **Judge (labeled secondary).** An LLM pass over the trace that flags actions that look wrong but no expectation covered. Output is always labeled "suspicion, needs a human", never a verdict, and it proposes candidate expectations so today's suspicion becomes tomorrow's deterministic rule.

### The tester (v1 surface)

- **Entrypoint.** The developer hands Tripwire a runnable entrypoint, a function or endpoint that takes an input and runs their agent to completion. This is the one real integration ask in v1.
- **Scenario runner.** Drives a battery of inputs through the entrypoint: the developer's own scenarios plus a built-in **adversarial and edge-case library** (prompt-injection payloads, boundary values, contradictory instructions, empty and malformed inputs). Each run is captured as a trace.
- The tester works with only the developer's scenarios; the adversarial library is the red-team value-add on top.

### Output

- **Report.** One artifact: per-expectation verdict (held or broke, with the exact breaking case and the input that caused it), the silent wrong actions found, a separate clearly-labeled judge-suspicions section, and a "rules worth adding" list. Terminal summary plus a self-contained HTML file, same shape as Recovered Revenue Audit's report. Shareable by design.

---

## Data flow (one scan)

1. Developer wires the capture SDK around their agent and declares expectations.
2. Developer registers an entrypoint and, optionally, their own scenarios.
3. Scenario runner drives each scenario (own + adversarial library) through the entrypoint.
4. SDK captures a trace per run.
5. Checker runs every expectation over every trace, collecting pass/fail with offending records.
6. Judge adds labeled suspicions and proposed expectations.
7. Report assembled (terminal + HTML).

---

## The developer's surface (interface shape, illustrative, not final code)

```ts
import { defineExpectations, scan } from "tripwire";

// 1. Declare invariants (deterministic, carry the verdict)
const expectations = defineExpectations([
  {
    id: "refund-never-exceeds-charge",
    check: (trace) => trace
      .where({ action: "refund" })
      .every((r) => r.input.amount <= originalCharge(trace, r)),
    reason: "A refund exceeded the original charge.",
  },
  {
    id: "no-spend-without-intent",
    check: (trace) => trace
      .where({ action: "charge" })
      .every((r) => hasApprovedIntent(trace, r)),
    reason: "A charge ran with no matching approved intent.",
  },
]);

// 2. Point it at a runnable entrypoint and run the scan
const report = await scan({
  entrypoint: (input) => myAgent.run(input),   // developer-provided
  expectations,
  scenarios: [/* optional developer scenarios */],
  adversarial: true,                            // built-in red-team library
  report: "tripwire-report.html",
});
```

- `scan()` never mutates anything outside the developer's process. It runs their agent, captures, checks, judges, writes the report.
- Expectations are plain predicates over a queryable trace, so they are testable in isolation.

---

## Autonomy and safety

- Read-only. Tripwire runs the agent in the developer's own environment via their entrypoint. It never reaches into production and never acts on the customer's systems.
- Findings and proposed expectations are suggestions a human accepts. No auto-remediation in v1 or as a default ever.

## Tech stack

- TypeScript ESM, minimal dependencies, same discipline as Purse and blackbox (zero deps in the core where feasible; the judge needs an LLM client, isolated behind an interface so the core stays dependency-light and the judge is swappable).
- `tsx` for tests. Trace shape blackbox-compatible.
- HTML report is self-contained (inlined CSS, no external requests), same constraints as the blackbox demo.

## Testing approach

- Unit-test the checker against hand-built traces with known violations (deterministic, exhaustive on the seed expectations).
- Unit-test the trace query API.
- The judge is tested for shape and labeling (it never emits a verdict), not for correctness of opinion.
- Golden-file test the HTML report against a fixed scan result.
- Integration: a fake agent with a planted silent wrong action; the scan must catch it deterministically and surface it in the report.

## Dogfood plan

First real scan against Get Paid or the Outreach booking agent. Declare a handful of real expectations (for Get Paid, e.g., never send a chase to a client who has paid; never send twice in a window; never send without approval), run the adversarial library, and ship the resulting report as the first proof artifact.

---

## Roadmap after v1 (not this spec)

- **Live monitor** (the original 24 July need, the real moat): same spine reading the live record, alert plus propose-a-fix-for-approval.
- **Hosted dashboard**: accounts, storage, scan history, the free-to-paid ladder.
- Billing, teams, deeper Purse and blackbox integration, richer adversarial libraries.

## Open questions

- **Name.** Tripwire is provisional. Decide before public launch.
- **Adversarial library scope for v1.** How large a built-in payload set is enough to be credible without over-building. Resolve in planning.
- **Expectation authoring ergonomics.** The trace query API needs to be pleasant enough that declaring expectations is not a chore. Prototype the API surface early in the plan.
