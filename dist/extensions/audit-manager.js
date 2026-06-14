"use strict";
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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class AuditManager {
    pi;
    constructor(pi) {
        this.pi = pi;
    }
    /**
     * Main entry point for the audit process.
     */
    async runAudit(options) {
        const config = await this.resolveConfig(options);
        const mapper = new project_mapper_1.ProjectMapper(options.path);
        const coreFiles = await mapper.mapCoreLogic(config.depth);
        if (coreFiles.length === 0) {
            throw new Error("No core logic files found to audit in the specified path.");
        }
        // 3. Parallel Audit Dispatch
        const reports = await this.dispatchAuditAgents(coreFiles);
        // 4. Synthesis
        const synthesizer = new synthesizer_1.AuditSynthesizer(options.path);
        const finalReport = await synthesizer.synthesize(reports);
        // 5. Output Handling
        const output = await this.handleOutput(finalReport, config.format, options.ctx);
        // 6. Optional Fix-Fleet
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
    async resolveConfig(options) {
        if (options.depth &&
            options.format !== undefined &&
            options.fix !== undefined) {
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
    async dispatchAuditAgents(files) {
        const tasks = Object.entries(types_1.AGENT_PROMPTS).map(([persona, prompt]) => ({
            agent: "worker",
            task: `## ${persona} Audit\\n\\n${prompt}\\n\\nTarget Files:\\n${files.join("\\n")}\\n\\nProvide a markdown table with: | Severity | File:Line | Description | Fix Suggestion |`,
            output: `audit-${persona.toLowerCase().replace(" ", "-")}.md`,
        }));
        const results = await this.pi.subagents.parallel({
            tasks,
            concurrency: 5,
        });
        return results.map((r) => r.output || "No report generated.");
    }
    async handleOutput(report, format, _ctx) {
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
exports.AuditManager = AuditManager;
