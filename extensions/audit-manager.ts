import type { ExtensionAPI, ExtensionCommandContext } from "pi-coding-agent";
import { ProjectMapper } from "./project-mapper";
import { AuditSynthesizer } from "./synthesizer";
import { FixFleet } from "./fix-fleet";
import { AGENT_PROMPTS } from "./types";
import * as fs from "fs";
import * as path from "path";

export interface AuditOptions {
	path: string;
	depth?: "surface" | "deep";
	format?: "chat" | "file" | "hybrid";
	fix?: boolean;
	ctx: ExtensionCommandContext;
}

export class AuditManager {
	constructor(private pi: ExtensionAPI) {}

	/**
	 * Main entry point for the audit process.
	 */
	public async runAudit(options: AuditOptions): Promise<any> {
		const config = await this.resolveConfig(options);

		const mapper = new ProjectMapper(options.path);
		const coreFiles = await mapper.mapCoreLogic(config.depth);

		if (coreFiles.length === 0) {
			throw new Error(
				"No core logic files found to audit in the specified path.",
			);
		}

		// 3. Parallel Audit Dispatch
		const reports = await this.dispatchAuditAgents(coreFiles);

		// 4. Synthesis
		const synthesizer = new AuditSynthesizer(options.path);
		const finalReport = await synthesizer.synthesize(reports);

		// 5. Output Handling
		const output = await this.handleOutput(
			finalReport,
			config.format,
			options.ctx,
		);

		// 6. Optional Fix-Fleet
		if (config.fix) {
			const fleet = new FixFleet(this.pi);
			const fixResult = await fleet.execute(finalReport, options.ctx);
			return {
				message: "Audit and Fix cycle complete.",
				report: finalReport,
				fixes: fixResult,
				summary: output,
			};
		}

		return {
			message: "Audit complete.",
			report: finalReport,
			summary: output,
		};
	}

	private async resolveConfig(options: AuditOptions): Promise<{
		depth: "surface" | "deep";
		format: "chat" | "file" | "hybrid";
		fix: boolean;
	}> {
		if (
			options.depth &&
			options.format !== undefined &&
			options.fix !== undefined
		) {
			return {
				depth: options.depth,
				format: options.format,
				fix: options.fix,
			};
		}

		return {
			depth: options.depth || "deep",
			format: options.format || "hybrid",
			fix: options.fix || false,
		};
	}

	public async dispatchAuditAgents(files: string[]): Promise<string[]> {
		const tasks = Object.entries(AGENT_PROMPTS).map(([persona, prompt]) => ({
			agent: "worker",
			task: `## ${persona} Audit\\n\\n${prompt}\\n\\nTarget Files:\\n${files.join("\\n")}\\n\\nProvide a markdown table with: | Severity | File:Line | Description | Fix Suggestion |`,
			output: `audit-${persona.toLowerCase().replace(" ", "-")}.md`,
		}));

		const results = await this.pi.subagents.parallel({
			tasks,
			concurrency: 5,
		});

		return results.map((r: any) => r.output || "No report generated.");
	}

	private async handleOutput(
		report: string,
		format: string,
		_ctx: ExtensionCommandContext,
	): Promise<string> {
		let summary = "";

		if (format === "file" || format === "hybrid") {
			const reportPath = path.join(process.cwd(), "audit-report.md");
			fs.writeFileSync(reportPath, report);
			summary += `[Detailed report saved to ${reportPath}]\\n`;
		}

		if (format === "chat" || format === "hybrid") {
			const criticals = (report.match(/CRITICAL/gi) || []).length;
			const highs = (report.match(/HIGH/gi) || []).length;
			const mediums = (report.match(/MEDIUM/gi) || []).length;
			summary += `Audit Summary: Found ${criticals} Critical, ${highs} High, and ${mediums} Medium issues.`;
		}

		return summary;
	}
}
