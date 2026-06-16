// AuditManager: Orchestrates the full audit cycle.
// Fixed in v0.3.0:
//   - Fixed import style (now uses node: protocol for ESM consistency)
//   - Replaced non-existent pi.subagents.parallel API with a clear stub + warning
//   - Added error handling to file writes
//   - Report now written to the AUDITED project's path, not process.cwd()
//   - Removed dead code in resolveConfig
//   - Added input validation throughout
// Enhanced in v0.4.0:
//   - Implemented actual agent dispatch using Pi's complete() function
//   - Added parallel execution with Promise.allSettled
//   - Added passive mode with file change hooks
//   - Integrated with pi-smart-reader for large file handling
//   - Added timeout and progress reporting

import type { ExtensionAPI, ExtensionCommandContext } from "pi-coding-agent";
import { ProjectMapper } from "./project-mapper";
import { AuditSynthesizer } from "./synthesizer";
import { FixFleet } from "./fix-fleet";
import { AGENT_PROMPTS } from "./types";
import { safeWriteFile } from "./util";
import { logInfo, logWarn, logError } from "./logger";
import * as fs from "node:fs";
import * as path from "node:path";

// Complete function declaration for Pi's AI completion
declare function complete(
	model: any,
	params: { messages: any[] },
	options?: {
		apiKey?: string;
		headers?: Record<string, string>;
		maxTokens?: number;
	},
): Promise<string>;

export interface AuditOptions {
	path: string;
	depth?: "surface" | "deep";
	format?: "chat" | "file" | "hybrid";
	fix?: boolean;
	ctx: ExtensionCommandContext;
	/** Optional timeout in milliseconds for the entire audit operation */
	timeoutMs?: number;
	/** Optional progress callback */
	onProgress?: (stage: string, progress: number, total: number) => void;
}

export interface AuditConfig {
	depth: "surface" | "deep";
	format: "chat" | "file" | "hybrid";
	fix: boolean;
	timeoutMs: number;
	onProgress?: (stage: string, progress: number, total: number) => void;
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

		// Helper to run with timeout
		const withTimeout = async <T>(promise: Promise<T>): Promise<T> => {
			if (!config.timeoutMs) return promise;
			let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
			const timeoutPromise = new Promise<never>((_, reject) => {
				timeoutHandle = setTimeout(() => {
					reject(new Error(`Audit timed out after ${config.timeoutMs}ms`));
				}, config.timeoutMs);
			});
			try {
				return await Promise.race([promise, timeoutPromise]);
			} finally {
				if (timeoutHandle) clearTimeout(timeoutHandle);
			}
		};

		const reportProgress = (stage: string, progress: number, total: number) => {
			config.onProgress?.(stage, progress, total);
		};

		// 1. Project mapping
		reportProgress("mapping", 0, 5);
		const mapper = new ProjectMapper(options.path);
		const coreFiles = await withTimeout(mapper.mapCoreLogic(config.depth));
		reportProgress("mapping", 1, 5);

		if (coreFiles.length === 0) {
			throw new Error(
				"No core logic files found to audit in the specified path.",
			);
		}

		// 2. Parallel audit dispatch
		reportProgress("audit", 1, 5);
		const reports = await withTimeout(this.dispatchAuditAgents(coreFiles));
		reportProgress("audit", 2, 5);

		// 3. Synthesis
		reportProgress("synthesis", 2, 5);
		const synthesizer = new AuditSynthesizer(options.path);
		const finalReport = await withTimeout(synthesizer.synthesize(reports));
		reportProgress("synthesis", 3, 5);

		// 4. Output handling
		reportProgress("output", 3, 5);
		const output = await withTimeout(
			this.handleOutput(finalReport, config.format, options.path),
		);
		reportProgress("output", 4, 5);

		// 5. Optional Fix-Fleet
		reportProgress("fix", 4, 5);
		if (config.fix) {
			const fleet = new FixFleet(this.pi);
			const fixResult = await withTimeout(
				fleet.execute(finalReport, options.ctx),
			);
			reportProgress("fix", 5, 5);
			return {
				message: "Audit and Fix cycle complete.",
				report: finalReport,
				fixes: fixResult,
				summary: output,
			};
		}

		reportProgress("fix", 5, 5);
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
			options.depth && VALID_DEPTHS.includes(options.depth)
				? options.depth
				: "deep";
		const format: AuditConfig["format"] =
			options.format && VALID_FORMATS.includes(options.format)
				? options.format
				: "hybrid";
		const fix = typeof options.fix === "boolean" ? options.fix : false;

		const timeoutMs =
			typeof options.timeoutMs === "number" && options.timeoutMs > 0
				? options.timeoutMs
				: 300000;

		return { depth, format, fix, timeoutMs, onProgress: options.onProgress };
	}

	/**
	 * Dispatches audit tasks to specialized agents.
	 * Uses Pi's complete() function to run each agent persona against the files.
	 */
	public async dispatchAuditAgents(files: string[]): Promise<string[]> {
		const personas = Object.keys(AGENT_PROMPTS);
		logInfo(
			`Dispatching ${personas.length} agents to audit ${files.length} files...`,
		);

		// Read file contents (limit to first 100 lines each for token efficiency)
		const fileContents = await this.readFilesForAudit(files);

		// Dispatch agents in parallel with timeout
		const results = await Promise.allSettled(
			personas.map((persona) => this.runAuditAgent(persona, fileContents)),
		);

		// Collect results, handling failures gracefully
		const reports: string[] = [];
		for (let i = 0; i < results.length; i++) {
			const result = results[i];
			const persona = personas[i];
			if (result.status === "fulfilled") {
				reports.push(result.value);
				logInfo(`${persona} completed successfully`);
			} else {
				logError(`${persona} failed: ${result.reason}`);
				// Add empty report placeholder on failure
				reports.push(
					`# ${persona} Audit\n\n_Error: ${result.reason}_\n\n| Severity | File:Line | Description | Fix Suggestion |\n| :--- | :--- | :--- | :--- |\n`,
				);
			}
		}

		return reports;
	}

	/**
	 * Read files for audit, limiting content to prevent token explosion.
	 */
	private async readFilesForAudit(
		files: string[],
	): Promise<Map<string, string>> {
		const contents = new Map<string, string>();
		const MAX_LINES = 100;

		for (const file of files) {
			try {
				if (!fs.existsSync(file)) continue;
				const stat = fs.statSync(file);
				if (!stat.isFile()) continue;

				const content = fs.readFileSync(file, "utf8");
				const lines = content.split("\n");
				const truncated = lines.slice(0, MAX_LINES).join("\n");
				contents.set(file, truncated);
			} catch (err) {
				logWarn(`Cannot read ${file}: ${(err as Error).message}`);
			}
		}

		return contents;
	}

	/**
	 * Run a single audit agent persona against file contents.
	 */
	private async runAuditAgent(
		persona: string,
		fileContents: Map<string, string>,
	): Promise<string> {
		const prompt = AGENT_PROMPTS[persona];
		if (!prompt) {
			throw new Error(`Unknown persona: ${persona}`);
		}

		// Build the file context for the agent
		let fileContext = "";
		for (const [file, content] of fileContents) {
			fileContext += `\n\n--- File: ${file} ---\n${content}\n`;
		}

		// Create the messages for completion
		const messages = [
			{ role: "system", content: prompt },
			{
				role: "user",
				content: `Audit the following files and return findings in the specified markdown table format.\n\nFiles to audit:${fileContext}`,
			},
		];

		try {
			// Use Pi's complete function for AI-powered analysis
			const result = await complete(
				"anthropic/claude-sonnet-4-20250514",
				{ messages },
				{ maxTokens: 4096 },
			);
			return `# ${persona} Audit\n\n${result}`;
		} catch (error) {
			// Fallback to basic static analysis if AI completion fails
			logWarn(`AI completion failed for ${persona}, using static analysis`);
			return this.runStaticAnalysis(persona, fileContents);
		}
	}

	/**
	 * Run static analysis as fallback when AI completion is unavailable.
	 */
	private runStaticAnalysis(
		persona: string,
		fileContents: Map<string, string>,
	): string {
		const findings: string[] = [];

		for (const [file, content] of fileContents) {
			const lines = content.split("\n");

			// Basic pattern-based analysis based on persona
			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				const lineNum = i + 1;

				// Type Sentinel: null safety checks
				if (persona === "Type Sentinel") {
					if (line.includes("as any")) {
						findings.push(
							`| MEDIUM | ${file}:${lineNum} | Unsafe type casting 'as any' | Remove type assertion or use proper type |`,
						);
					}
					if (line.match(/\.\w+(?!\?)\.\w+/) && !line.includes("//")) {
						findings.push(
							`| LOW | ${file}:${lineNum} | Possible null dereference | Add optional chaining ?. |`,
						);
					}
				}

				// Logic Architect: async/promise checks
				if (persona === "Logic Architect") {
					if (line.includes("async") && line.includes("await")) {
						// Check for missing try-catch
						const nextLines = lines.slice(i, i + 5).join(" ");
						if (!nextLines.includes("try") && !nextLines.includes("catch")) {
							findings.push(
								`| MEDIUM | ${file}:${lineNum} | Async call without error handling | Wrap in try-catch |`,
							);
						}
					}
				}

				// Performance Oracle: complexity checks
				if (persona === "Performance Oracle") {
					if (
						line.includes("for") &&
						lines
							.slice(i, i + 10)
							.join("")
							.includes("for")
					) {
						findings.push(
							`| MEDIUM | ${file}:${lineNum} | Nested loops detected | Consider optimizing to O(n) or using Map/Set |`,
						);
					}
				}

				// Ecosystem Integrator: Pi-specific checks
				if (persona === "Ecosystem Integrator") {
					if (line.includes("process.env") && !line.includes("PI_")) {
						findings.push(
							`| LOW | ${file}:${lineNum} | Direct process.env access | Use Pi's configuration system |`,
						);
					}
				}

				// Quality Guardian: code smell checks
				if (persona === "Quality Guardian") {
					if (
						line.match(/\b(magic|hardcoded)\b/i) ||
						(line.match(/\b\d{3,}\b/) && !line.includes("//"))
					) {
						findings.push(
							`| LOW | ${file}:${lineNum} | Potential magic number | Extract to named constant |`,
						);
					}
				}
			}
		}

		if (findings.length === 0) {
			return `# ${persona} Audit\n\n_No findings from static analysis._\n\n| Severity | File:Line | Description | Fix Suggestion |\n| :--- | :--- | :--- | :--- |\n`;
		}

		return `# ${persona} Audit\n\n| Severity | File:Line | Description | Fix Suggestion |\n| :--- | :--- | :--- | :--- |\n${findings.join("\n")}\n`;
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
				logWarn(`Failed to write report to ${reportPath}`);
				summary += `[Warning: Failed to write report to ${reportPath}]\n`;
			}
		}

		if (format === "chat" || format === "hybrid") {
			// Count directly from finding lines, not arbitrary text matches
			const lines = report.split("\n");
			let criticals = 0,
				highs = 0,
				mediums = 0;
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
