import { writeFileSync } from "node:fs";
import type { ScanReport, ScenarioResult } from "./scanner.ts";

function fmt(v: unknown): string {
  if (v === undefined) return "(none)";
  return typeof v === "string" ? v : JSON.stringify(v);
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function renderTerminal(report: ScanReport): string {
  const lines: string[] = [];
  lines.push(
    `Tripwire scan: ${report.summary.violatedScenarios} of ${report.summary.totalScenarios} scenarios triggered a silent wrong action.`,
  );
  for (const s of report.scenarios) {
    const broken = s.checks.filter((c) => !c.held);
    if (broken.length === 0 && !s.ranWithError) continue;
    lines.push(`\n  scenario: ${s.scenario.name}`);
    lines.push(`    input: ${fmt(s.scenario.input)}`);
    if (s.ranWithError) lines.push(`    ran with error: ${s.ranWithError}`);
    for (const c of broken) {
      lines.push(
        `    BROKE ${c.id} :: ${c.reason} (${plural(c.offenders.length, "offending action")})`,
      );
      for (const o of c.offenders) {
        lines.push(`      - ${o.action}  input=${fmt(o.input)}  outcome=${o.outcome}`);
      }
    }
    for (const sus of s.suspicions) {
      lines.push(`    suspicion (needs a human): ${sus.note}`);
    }
  }
  return lines.join("\n");
}

function esc(s: unknown): string {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function scenarioHtml(s: ScenarioResult): string {
  const broken = s.checks.filter((c) => !c.held);
  const state = broken.length ? "broke" : "held";
  const input = `<div class="input">input ${esc(fmt(s.scenario.input))}</div>`;
  const err = s.ranWithError
    ? `<div class="err">ran with error: ${esc(s.ranWithError)}</div>`
    : "";
  const checks = broken
    .map((c) => {
      const offenders = c.offenders
        .map(
          (o) =>
            `<li><code>${esc(o.action)}</code> input ${esc(fmt(o.input))} outcome ${esc(o.outcome)}</li>`,
        )
        .join("");
      return `<div class="check"><b>${esc(c.id)}</b>, ${esc(c.reason)} <span class="n">${plural(c.offenders.length, "offending action")}</span><ul class="offenders">${offenders}</ul></div>`;
    })
    .join("");
  const sus = s.suspicions
    .map((x) => `<div class="suspicion">suspicion, needs a human: ${esc(x.note)}</div>`)
    .join("");
  return `<section class="scn ${state}"><h3>${esc(s.scenario.name)}</h3>${input}${err}${checks}${sus}</section>`;
}

export function renderHtml(report: ScanReport): string {
  const body = report.scenarios.map(scenarioHtml).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Tripwire report</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;color:#111;max-width:760px;margin:40px auto;padding:0 16px}
  h1{font-size:22px} h3{font-size:15px;margin:0 0 4px}
  .scn{border:1px solid #e2e2e2;border-left-width:4px;padding:14px 16px;margin:12px 0}
  .scn.broke{border-left-color:#c0392b} .scn.held{border-left-color:#2e7d32}
  .input{font-size:13px;color:#555;font-family:ui-monospace,Menlo,Consolas,monospace;margin:0 0 8px}
  .err{font-size:13px;color:#c0392b;margin:4px 0}
  .check{font-size:14px;margin:6px 0} .n{color:#c0392b}
  .offenders{margin:6px 0 0;padding-left:18px;font-size:13px;color:#333}
  .offenders code{background:#f4f4f4;padding:1px 4px}
  .suspicion{font-size:13px;color:#8a6116;margin-top:6px}
  .sum{font-size:16px;font-weight:700}
</style></head><body>
<h1>Tripwire scan</h1>
<p class="sum">${report.summary.violatedScenarios} of ${report.summary.totalScenarios} scenarios triggered a silent wrong action.</p>
${body}
</body></html>`;
}

export function writeHtmlReport(report: ScanReport, path: string): void {
  writeFileSync(path, renderHtml(report), "utf-8");
}
