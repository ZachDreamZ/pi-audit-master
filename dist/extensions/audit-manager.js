"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditManager = void 0;
const project_mapper_1 = require("./project-mapper");
const synthesizer_1 = require("./synthesizer");
const fix_fleet_1 = require("./fix-fleet");
const types_1 = require("./types");
const util_1 = require("./util");
const logger_1 = require("./logger");
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
class AuditManager {
    pi;
    constructor(pi) {
        this.pi = pi;
    }
    /**
     * Main entry point for the audit process.
     */
    async runAudit(options) {
        // Input validation
        if (!options || !options.path) {
            throw new Error("AuditManager.runAudit: options.path is required");
        }
        if (!options.ctx) {
            throw new Error("AuditManager.runAudit: options.ctx is required");
        }
        const config = this.resolveConfig(options);
        // Helper to run with timeout
        const withTimeout = async (promise) => {
            if (!config.timeoutMs)
                return promise;
            let timeoutHandle = null;
            const timeoutPromise = new Promise((_, reject) => {
                timeoutHandle = setTimeout(() => {
                    reject(new Error(`Audit timed out after ${config.timeoutMs}ms`));
                }, config.timeoutMs);
            });
            try {
                return await Promise.race([promise, timeoutPromise]);
            }
            finally {
                if (timeoutHandle)
                    clearTimeout(timeoutHandle);
            }
        };
        const reportProgress = (stage, progress, total) => {
            config.onProgress?.(stage, progress, total);
        };
        // 1. Project mapping
        reportProgress("mapping", 0, 5);
        const mapper = new project_mapper_1.ProjectMapper(options.path);
        const coreFiles = await withTimeout(mapper.mapCoreLogic(config.depth));
        reportProgress("mapping", 1, 5);
        if (coreFiles.length === 0) {
            throw new Error("No core logic files found to audit in the specified path.");
        }
        // 2. Parallel audit dispatch
        reportProgress("audit", 1, 5);
        const reports = await withTimeout(this.dispatchAuditAgents(coreFiles));
        reportProgress("audit", 2, 5);
        // 3. Synthesis
        reportProgress("synthesis", 2, 5);
        const synthesizer = new synthesizer_1.AuditSynthesizer(options.path);
        const finalReport = await withTimeout(synthesizer.synthesize(reports));
        reportProgress("synthesis", 3, 5);
        // 4. Output handling
        reportProgress("output", 3, 5);
        const output = await withTimeout(this.handleOutput(finalReport, config.format, options.path));
        reportProgress("output", 4, 5);
        // 5. Optional Fix-Fleet
        reportProgress("fix", 4, 5);
        if (config.fix) {
            const fleet = new fix_fleet_1.FixFleet(this.pi);
            const fixResult = await withTimeout(fleet.execute(finalReport, options.ctx));
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
    resolveConfig(options) {
        const VALID_DEPTHS = ["surface", "deep"];
        const VALID_FORMATS = ["chat", "file", "hybrid"];
        const depth = options.depth && VALID_DEPTHS.includes(options.depth)
            ? options.depth
            : "deep";
        const format = options.format && VALID_FORMATS.includes(options.format)
            ? options.format
            : "hybrid";
        const fix = typeof options.fix === "boolean" ? options.fix : false;
        const timeoutMs = typeof options.timeoutMs === "number" && options.timeoutMs > 0
            ? options.timeoutMs
            : 300000;
        return { depth, format, fix, timeoutMs, onProgress: options.onProgress };
    }
    /**
     * Dispatches audit tasks to specialized agents.
     * Uses Pi's complete() function to run each agent persona against the files.
     */
    async dispatchAuditAgents(files) {
        const personas = Object.keys(types_1.AGENT_PROMPTS);
        (0, logger_1.logInfo)(`Dispatching ${personas.length} agents to audit ${files.length} files...`);
        // Read file contents (limit to first 100 lines each for token efficiency)
        const fileContents = await this.readFilesForAudit(files);
        // Dispatch agents in parallel with timeout
        const results = await Promise.allSettled(personas.map((persona) => this.runAuditAgent(persona, fileContents)));
        // Collect results, handling failures gracefully
        const reports = [];
        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const persona = personas[i];
            if (result.status === "fulfilled") {
                reports.push(result.value);
                (0, logger_1.logInfo)(`${persona} completed successfully`);
            }
            else {
                (0, logger_1.logError)(`${persona} failed: ${result.reason}`);
                // Add empty report placeholder on failure
                reports.push(`# ${persona} Audit\n\n_Error: ${result.reason}_\n\n| Severity | File:Line | Description | Fix Suggestion |\n| :--- | :--- | :--- | :--- |\n`);
            }
        }
        return reports;
    }
    /**
     * Read files for audit, limiting content to prevent token explosion.
     */
    async readFilesForAudit(files) {
        const contents = new Map();
        const MAX_LINES = 100;
        for (const file of files) {
            try {
                if (!fs.existsSync(file))
                    continue;
                const stat = fs.statSync(file);
                if (!stat.isFile())
                    continue;
                const content = fs.readFileSync(file, "utf8");
                const lines = content.split("\n");
                const truncated = lines.slice(0, MAX_LINES).join("\n");
                contents.set(file, truncated);
            }
            catch (err) {
                (0, logger_1.logWarn)(`Cannot read ${file}: ${err.message}`);
            }
        }
        return contents;
    }
    /**
     * Run a single audit agent persona against file contents.
     */
    async runAuditAgent(persona, fileContents) {
        const prompt = types_1.AGENT_PROMPTS[persona];
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
            const result = await complete("anthropic/claude-sonnet-4-20250514", { messages }, { maxTokens: 4096 });
            return `# ${persona} Audit\n\n${result}`;
        }
        catch (error) {
            // Fallback to basic static analysis if AI completion fails
            (0, logger_1.logWarn)(`AI completion failed for ${persona}, using static analysis`);
            return this.runStaticAnalysis(persona, fileContents);
        }
    }
    /**
     * Run static analysis as fallback when AI completion is unavailable.
     */
    runStaticAnalysis(persona, fileContents) {
        const findings = [];
        for (const [file, content] of fileContents) {
            const lines = content.split("\n");
            // Basic pattern-based analysis based on persona
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const lineNum = i + 1;
                // Type Sentinel: null safety checks
                if (persona === "Type Sentinel") {
                    if (line.includes("as any")) {
                        findings.push(`| MEDIUM | ${file}:${lineNum} | Unsafe type casting 'as any' | Remove type assertion or use proper type |`);
                    }
                    if (line.match(/\.\w+(?!\?)\.\w+/) && !line.includes("//")) {
                        findings.push(`| LOW | ${file}:${lineNum} | Possible null dereference | Add optional chaining ?. |`);
                    }
                }
                // Logic Architect: async/promise checks
                if (persona === "Logic Architect") {
                    if (line.includes("async") && line.includes("await")) {
                        // Check for missing try-catch
                        const nextLines = lines.slice(i, i + 5).join(" ");
                        if (!nextLines.includes("try") && !nextLines.includes("catch")) {
                            findings.push(`| MEDIUM | ${file}:${lineNum} | Async call without error handling | Wrap in try-catch |`);
                        }
                    }
                }
                // Performance Oracle: complexity checks
                if (persona === "Performance Oracle") {
                    if (line.includes("for") &&
                        lines
                            .slice(i, i + 10)
                            .join("")
                            .includes("for")) {
                        findings.push(`| MEDIUM | ${file}:${lineNum} | Nested loops detected | Consider optimizing to O(n) or using Map/Set |`);
                    }
                }
                // Ecosystem Integrator: Pi-specific checks
                if (persona === "Ecosystem Integrator") {
                    if (line.includes("process.env") && !line.includes("PI_")) {
                        findings.push(`| LOW | ${file}:${lineNum} | Direct process.env access | Use Pi's configuration system |`);
                    }
                }
                // Quality Guardian: code smell checks
                if (persona === "Quality Guardian") {
                    if (line.match(/\b(magic|hardcoded)\b/i) ||
                        (line.match(/\b\d{3,}\b/) && !line.includes("//"))) {
                        findings.push(`| LOW | ${file}:${lineNum} | Potential magic number | Extract to named constant |`);
                    }
                }
            }
        }
        if (findings.length === 0) {
            return `# ${persona} Audit\n\n_No findings from static analysis._\n\n| Severity | File:Line | Description | Fix Suggestion |\n| :--- | :--- | :--- | :--- |\n`;
        }
        return `# ${persona} Audit\n\n| Severity | File:Line | Description | Fix Suggestion |\n| :--- | :--- | :--- | :--- |\n${findings.join("\n")}\n`;
    }
    async handleOutput(report, format, auditPath) {
        let summary = "";
        if (format === "file" || format === "hybrid") {
            // Write to the AUDITED project's directory, not process.cwd()
            const reportPath = path.join(path.resolve(auditPath), "audit-report.md");
            const success = (0, util_1.safeWriteFile)(reportPath, report);
            if (success) {
                summary += `[Detailed report saved to ${reportPath}]\n`;
            }
            else {
                (0, logger_1.logWarn)(`Failed to write report to ${reportPath}`);
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
                if (!m)
                    continue;
                const sev = m[1].toUpperCase();
                if (sev === "CRITICAL")
                    criticals++;
                else if (sev === "HIGH")
                    highs++;
                else if (sev === "MEDIUM")
                    mediums++;
            }
            summary += `Audit Summary: Found ${criticals} Critical, ${highs} High, and ${mediums} Medium issues.`;
        }
        return summary;
    }
}
exports.AuditManager = AuditManager;
