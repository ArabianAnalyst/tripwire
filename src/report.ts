import { writeFileSync } from "node:fs";
import type { ScanReport, ScenarioResult } from "./scanner.ts";

export function renderTerminal(report: ScanReport): string {
  const lines: string[] = [];
  lines.push(
    `Tripwire scan: ${report.summary.violatedScenarios} of ${report.summary.totalScenarios} scenarios triggered a silent wrong action.`,
  );
  for (const s of report.scenarios) {
    const broken = s.checks.filter((c) => !c.held);
    if (broken.length === 0 && !s.ranWithError) continue;
    lines.push(`\n  scenario: ${s.scenario.name}`);
    if (s.ranWithError) lines.push(`    ran with error: ${s.ranWithError}`);
    for (const c of broken) {
      lines.push(`    BROKE ${c.id} :: ${c.reason} (${c.offenders.length} offending action)`);
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
  const checks = broken
    .map(
      (c) =>
        `<div class="check"><b>${esc(c.id)}</b> — ${esc(c.reason)} <span class="n">${c.offenders.length} offending action</span></div>`,
    )
    .join("");
  const sus = s.suspicions
    .map((x) => `<div class="suspicion">suspicion, needs a human: ${esc(x.note)}</div>`)
    .join("");
  return `<section class="scn ${state}"><h3>${esc(s.scenario.name)}</h3>${checks}${sus}</section>`;
}

export function renderHtml(report: ScanReport): string {
  const body = report.scenarios.map(scenarioHtml).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Tripwire report</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;color:#111;max-width:760px;margin:40px auto;padding:0 16px}
  h1{font-size:22px} h3{font-size:15px;margin:0 0 6px}
  .scn{border:1px solid #e2e2e2;border-left-width:4px;padding:14px 16px;margin:12px 0}
  .scn.broke{border-left-color:#c0392b} .scn.held{border-left-color:#2e7d32}
  .check{font-size:14px;margin:4px 0} .n{color:#c0392b}
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
