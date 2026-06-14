"use strict";
// AuditManager: Orchestrates the full audit cycle.
// Fixed in v0.3.0:
//   - Fixed import style (now uses node: protocol for ESM consistency)
//   - Replaced non-existent pi.subagents.parallel API with a clear stub + warning
//   - Added error handling to file writes
//   - Report now written to the AUDITED project's path, not process.cwd()
//   - Removed dead code in resolveConfig
//   - Added input validation throughout
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
        // 1. Project mapping
        const mapper = new project_mapper_1.ProjectMapper(options.path);
        const coreFiles = await mapper.mapCoreLogic(config.depth);
        if (coreFiles.length === 0) {
            throw new Error("No core logic files found to audit in the specified path.");
        }
        // 2. Parallel audit dispatch (currently stubbed - see dispatchAuditAgents)
        const reports = await this.dispatchAuditAgents(coreFiles);
        // 3. Synthesis
        const synthesizer = new synthesizer_1.AuditSynthesizer(options.path);
        const finalReport = await synthesizer.synthesize(reports);
        // 4. Output handling
        const output = await this.handleOutput(finalReport, config.format, options.path);
        // 5. Optional Fix-Fleet
        if (config.fix) {
            const fleet = new fix_fleet_1.FixFleet(this.pi);
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
    resolveConfig(options) {
        const VALID_DEPTHS = ["surface", "deep"];
        const VALID_FORMATS = ["chat", "file", "hybrid"];
        const depth = options.depth && VALID_DEPTHS.includes(options.depth) ? options.depth : "deep";
        const format = options.format && VALID_FORMATS.includes(options.format) ? options.format : "hybrid";
        const fix = typeof options.fix === "boolean" ? options.fix : false;
        return { depth, format, fix };
    }
    /**
     * Dispatches audit tasks to specialized agents.
     * NOTE: This is a stub. In a full implementation, this would use
     * the subagent tool or a similar mechanism to run AGENT_PROMPTS in parallel.
     * Currently returns placeholder reports so the rest of the pipeline works.
     */
    async dispatchAuditAgents(files) {
        const personas = Object.keys(types_1.AGENT_PROMPTS);
        console.warn(`[pi-audit-master] dispatchAuditAgents is a stub. Would dispatch ${personas.length} agents to audit ${files.length} files.`);
        // Return empty reports so the synthesizer doesn't crash
        // In a full implementation, this would call subagent workers
        return personas.map((persona) => `# ${persona} Audit\n\n_No findings (subagent dispatch not yet implemented)._\n\n| Severity | File:Line | Description | Fix Suggestion |\n| :--- | :--- | :--- | :--- |\n`);
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
