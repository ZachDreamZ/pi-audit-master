// AuditManager: Orchestrates the full audit cycle.
// Fixed in v0.3.0:
//   - Fixed import style (now uses node: protocol for ESM consistency)
//   - Replaced non-existent pi.subagents.parallel API with a clear stub + warning
//   - Added error handling to file writes
//   - Report now written to the AUDITED project's path, not process.cwd()
//   - Removed dead code in resolveConfig
//   - Added input validation throughout

import type { ExtensionAPI, ExtensionCommandContext } from "pi-coding-agent";
import { ProjectMapper } from "./project-mapper";
import { AuditSynthesizer } from "./synthesizer";
import { FixFleet } from "./fix-fleet";
import { AGENT_PROMPTS } from "./types";
import { safeWriteFile } from "./util";
import * as fs from "node:fs";
import * as path from "node:path";

export interface AuditOptions {
	path: string;
	depth?: "surface" | "deep";
	format?: "chat" | "file" | "hybrid";
	fix?: boolean;
	ctx: ExtensionCommandContext;
}

export interface AuditConfig {
	depth: "surface" | "deep";
	format: "chat" | "file" | "hybrid";
	fix: boolean;
}

export class AuditManager {
	constructor(private pi: ExtensionAPI) {}

	/**
	 * Main entry point for the audit process.
	 */
	public async runAudit(options: AuditOptions): Promise<any> {
		// Input validation
		if (!options || !options.path) {
			throw new Error("AuditManager.runAudit: options.path is required");
		}
		if (!options.ctx) {
			throw new Error("AuditManager.runAudit: options.ctx is required");
		}

		const config = this.resolveConfig(options);

		// 1. Project mapping
		const mapper = new ProjectMapper(options.path);
		const coreFiles = await mapper.mapCoreLogic(config.depth);

		if (coreFiles.length === 0) {
			throw new Error("No core logic files found to audit in the specified path.");
		}

		// 2. Parallel audit dispatch (currently stubbed - see dispatchAuditAgents)
		const reports = await this.dispatchAuditAgents(coreFiles);

		// 3. Synthesis
		const synthesizer = new AuditSynthesizer(options.path);
		const finalReport = await synthesizer.synthesize(reports);

		// 4. Output handling
		const output = await this.handleOutput(finalReport, config.format, options.path);

		// 5. Optional Fix-Fleet
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

	private resolveConfig(options: AuditOptions): AuditConfig {
		const VALID_DEPTHS: AuditConfig["depth"][] = ["surface", "deep"];
		const VALID_FORMATS: AuditConfig["format"][] = ["chat", "file", "hybrid"];

		const depth: AuditConfig["depth"] =
			options.depth && VALID_DEPTHS.includes(options.depth) ? options.depth : "deep";
		const format: AuditConfig["format"] =
			options.format && VALID_FORMATS.includes(options.format) ? options.format : "hybrid";
		const fix = typeof options.fix === "boolean" ? options.fix : false;

		return { depth, format, fix };
	}

	/**
	 * Dispatches audit tasks to specialized agents.
	 * NOTE: This is a stub. In a full implementation, this would use
	 * the subagent tool or a similar mechanism to run AGENT_PROMPTS in parallel.
	 * Currently returns placeholder reports so the rest of the pipeline works.
	 */
	public async dispatchAuditAgents(files: string[]): Promise<string[]> {
		const personas = Object.keys(AGENT_PROMPTS);
		console.warn(
			`[pi-audit-master] dispatchAuditAgents is a stub. Would dispatch ${personas.length} agents to audit ${files.length} files.`,
		);

		// Return empty reports so the synthesizer doesn't crash
		// In a full implementation, this would call subagent workers
		return personas.map(
			(persona) =>
				`# ${persona} Audit\n\n_No findings (subagent dispatch not yet implemented)._\n\n| Severity | File:Line | Description | Fix Suggestion |\n| :--- | :--- | :--- | :--- |\n`,
		);
	}

	private async handleOutput(
		report: string,
		format: string,
		auditPath: string,
	): Promise<string> {
		let summary = "";

		if (format === "file" || format === "hybrid") {
			// Write to the AUDITED project's directory, not process.cwd()
			const reportPath = path.join(path.resolve(auditPath), "audit-report.md");
			const success = safeWriteFile(reportPath, report);
			if (success) {
				summary += `[Detailed report saved to ${reportPath}]\n`;
			} else {
				summary += `[Warning: Failed to write report to ${reportPath}]\n`;
			}
		}

		if (format === "chat" || format === "hybrid") {
			// Count directly from finding lines, not arbitrary text matches
			const lines = report.split("\n");
			let criticals = 0, highs = 0, mediums = 0;
			const findingRegex = /^\|\s*(CRITICAL|HIGH|MEDIUM|LOW)\s*\|/i;
			for (const line of lines) {
				const m = line.match(findingRegex);
				if (!m) continue;
				const sev = m[1].toUpperCase();
				if (sev === "CRITICAL") criticals++;
				else if (sev === "HIGH") highs++;
				else if (sev === "MEDIUM") mediums++;
			}
			summary += `Audit Summary: Found ${criticals} Critical, ${highs} High, and ${mediums} Medium issues.`;
		}

		return summary;
	}
}
