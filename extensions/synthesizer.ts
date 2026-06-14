import * as fs from "fs";
import * as path from "path";

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

		for (const report of reports) {
			allFindings.push(...this.parseReport(report));
		}

		const deduplicated = this.deduplicate(allFindings);
		const sorted = this.sortFindings(deduplicated);

		return this.generateMarkdown(sorted);
	}

	private parseReport(report: string): AuditFinding[] {
		const findings: AuditFinding[] = [];
		const lines = report.split("\n");

		// Simple regex-based table parsing
		const findingRegex =
			/\| (CRITICAL|HIGH|MEDIUM|LOW) \| ([^|]+) \| ([^|]+) \| ([^|]+) \|/i;

		lines.forEach((line, index) => {
			const match = line.match(findingRegex);
			if (match) {
				const [_, severity, fileLine, description, fix] = match;
				const [file, lineNum] = fileLine.split(":");
				findings.push({
					id: `find-${Math.random().toString(36).substr(2, 9)}`,
					file: file?.trim() || "unknown",
					line: parseInt(lineNum?.trim() || "0"),
					severity: severity.toUpperCase() as any,
					description: description.trim(),
					fixSuggestion: fix.trim(),
					agent: "AuditAgent",
				});
			}
		});

		return findings;
	}

	private deduplicate(findings: AuditFinding[]): AuditFinding[] {
		const seen = new Set<string>();
		return findings.filter((f) => {
			const key = `${f.file}:${f.line}:${f.description}`;
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		});
	}

	private sortFindings(findings: AuditFinding[]): AuditFinding[] {
		const weight = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
		return findings.sort((a, b) => weight[a.severity] - weight[b.severity]);
	}

	private generateMarkdown(findings: AuditFinding[]): string {
		const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
		findings.forEach((f) => counts[f.severity]++);

		let md = `# 🛡️ Audit Report\n\n`;
		md += `## Executive Summary\n`;
		md += `- **Critical**: ${counts.CRITICAL}\n- **High**: ${counts.HIGH}\n- **Medium**: ${counts.MEDIUM}\n- **Low**: ${counts.LOW}\n\n`;

		md += `## Findings\n\n`;
		md += `| Severity | Location | Description | Fix Suggestion |\n`;
		md += `| :--- | :--- | :--- | :--- |\n`;

		findings.forEach((f) => {
			md += `| ${f.severity} | ${f.file}:${f.line} | ${f.description} | ${f.fixSuggestion} |\n`;
		});

		md += `\n## Next Steps\n`;
		md += `1. Review Critical and High issues immediately.\n`;
		md += `2. Deploy Fix-Fleet to resolve identified bugs.\n`;
		md += `3. Run full test suite to verify stability.`;

		return md;
	}
}
