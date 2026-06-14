// AuditSynthesizer: Consolidates raw audit reports from multiple agents into a unified markdown report.
// Fixed in v0.3.0:
//   - Replaced Math.random() IDs with crypto.randomUUID()
//   - Fixed Windows path parsing (use lastIndexOf(":"))
//   - Validated line numbers (was silently setting to 0)
//   - Removed emojis from report (user requested)
//   - Fixed severity counting to only match finding lines, not summary text
//   - Robust deduplication with normalized keys

import * as fs from "node:fs";
import * as path from "node:path";
import { generateId, parseFileLine, findingDedupKey } from "./util";

export interface AuditFinding {
	id: string;
	file: string;
	line: number;
	severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
	description: string;
	fixSuggestion: string;
	agent: string;
}

export class AuditSynthesizer {
	constructor(private rootPath: string) {}

	public async synthesize(reports: string[]): Promise<string> {
		const allFindings: AuditFinding[] = [];

		for (let i = 0; i < reports.length; i++) {
			const report = reports[i];
			if (!report || typeof report !== "string") {
				console.warn(`[pi-audit-master] Skipping invalid report at index ${i}`);
				continue;
			}
			try {
				allFindings.push(...this.parseReport(report));
			} catch (err) {
				console.error(`[pi-audit-master] Failed to parse report ${i}: ${(err as Error).message}`);
			}
		}

		const deduplicated = this.deduplicate(allFindings);
		const sorted = this.sortFindings(deduplicated);
		return this.generateMarkdown(sorted);
	}

	private parseReport(report: string): AuditFinding[] {
		const findings: AuditFinding[] = [];
		const lines = report.split("\n");

		// Match markdown table rows: | Severity | File:Line | Description | Fix |
		const findingRegex = /^\|\s*(CRITICAL|HIGH|MEDIUM|LOW)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*$/i;

		for (const line of lines) {
			const match = line.match(findingRegex);
			if (!match) continue;

			const [, severity, fileLine, description, fix] = match;
			const { file, line: lineNum } = parseFileLine(fileLine);

			findings.push({
				id: generateId("find"),
				file,
				line: lineNum,
				severity: severity.toUpperCase() as AuditFinding["severity"],
				description: description.trim(),
				fixSuggestion: fix.trim(),
				agent: "AuditAgent",
			});
		}

		return findings;
	}

	private deduplicate(findings: AuditFinding[]): AuditFinding[] {
		const seen = new Set<string>();
		return findings.filter((f) => {
			const key = findingDedupKey(f.file, f.line, f.description);
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		});
	}

	private sortFindings(findings: AuditFinding[]): AuditFinding[] {
		const weight: Record<AuditFinding["severity"], number> = {
			CRITICAL: 0,
			HIGH: 1,
			MEDIUM: 2,
			LOW: 3,
		};
		return findings.sort((a, b) => {
			const w = weight[a.severity] - weight[b.severity];
			if (w !== 0) return w;
			// Secondary sort: by file, then line
			if (a.file !== b.file) return a.file.localeCompare(b.file);
			return a.line - b.line;
		});
	}

	private generateMarkdown(findings: AuditFinding[]): string {
		const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
		for (const f of findings) {
			counts[f.severity]++;
		}

		// Count directly from findings, not by searching the whole report
		// (previous version counted the word "CRITICAL" in summary text too)

		let md = `# Audit Report\n\n`;
		md += `## Executive Summary\n\n`;
		md += `| Severity | Count |\n`;
		md += `| :--- | :--- |\n`;
		md += `| CRITICAL | ${counts.CRITICAL} |\n`;
		md += `| HIGH | ${counts.HIGH} |\n`;
		md += `| MEDIUM | ${counts.MEDIUM} |\n`;
		md += `| LOW | ${counts.LOW} |\n`;
		md += `| **Total** | **${findings.length}** |\n\n`;

		if (findings.length === 0) {
			md += `No issues found.\n\n`;
		} else {
			md += `## Findings\n\n`;
			md += `| Severity | Location | Description | Fix Suggestion |\n`;
			md += `| :--- | :--- | :--- | :--- |\n`;

			for (const f of findings) {
				const location = f.line > 0 ? `${f.file}:${f.line}` : f.file;
				// Escape pipe characters in cell content
				const desc = f.description.replace(/\|/g, "\|");
				const fix = f.fixSuggestion.replace(/\|/g, "\|");
				md += `| ${f.severity} | ${location} | ${desc} | ${fix} |\n`;
			}
			md += "\n";
		}

		md += `## Next Steps\n\n`;
		md += `1. Review Critical and High issues immediately.\n`;
		md += `2. Deploy Fix-Fleet to resolve identified bugs.\n`;
		md += `3. Run full test suite to verify stability.\n`;

		return md;
	}
}
