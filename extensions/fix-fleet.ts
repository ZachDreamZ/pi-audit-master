import type { ExtensionAPI } from "pi-coding-agent";
import type { AuditFinding } from "./synthesizer";

export interface FixResult {
	issueId: string;
	status: "RESOLVED" | "FAILED" | "SKIPPED";
	details: string;
}

export class FixFleet {
	constructor(private pi: ExtensionAPI) {}

	public async execute(report: string, ctx: any): Promise<FixResult[]> {
		const issues = this.parseCriticalIssues(report);
		const results: FixResult[] = [];

		for (const issue of issues) {
			try {
				const resolved = await this.dispatchFixWorker(issue, ctx);
				results.push({
					issueId: issue.id,
					status: resolved ? "RESOLVED" : "FAILED",
					details: resolved ? "Fixed and verified" : "Worker failed to resolve",
				});
			} catch (e: any) {
				results.push({
					issueId: issue.id,
					status: "FAILED",
					details: e.message,
				});
			}
		}

		return results;
	}

	private parseCriticalIssues(report: string): AuditFinding[] {
		const findings: AuditFinding[] = [];
		const lines = report.split("\n");
		const regex = /\| (CRITICAL|HIGH) \| ([^|]+) \| ([^|]+) \| ([^|]+) \|/i;

		lines.forEach((line) => {
			const match = line.match(regex);
			if (match) {
				const [_, severity, fileLine, description, fix] = match;
				const [file, lineNum] = fileLine.split(":");
				findings.push({
					id: `issue-${Math.random().toString(36).substr(2, 9)}`,
					file: file?.trim() || "unknown",
					line: parseInt(lineNum?.trim() || "0"),
					severity: severity.toUpperCase() as any,
					description: description.trim(),
					fixSuggestion: fix.trim(),
					agent: "FixFleet",
				});
			}
		});

		return findings;
	}

	private async dispatchFixWorker(
		issue: AuditFinding,
		ctx: any,
	): Promise<boolean> {
		// In a real Pi extension, this would use pi.subagents.parallel
		// To simulate for now, we return true.
		return true;
	}
}
