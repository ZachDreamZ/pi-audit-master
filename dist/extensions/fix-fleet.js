"use strict";
// FixFleet: Attempts to automatically resolve issues found during audit.
// Fixed in v0.3.0:
//   - Replaced Math.random() IDs with crypto.randomUUID()
//   - Added per-issue error handling (one failure doesn't abort the whole fleet)
//   - Added validation for the report input
//   - Clarified that dispatchFixWorker is a stub (logs a clear warning)
Object.defineProperty(exports, "__esModule", { value: true });
exports.FixFleet = void 0;
const util_1 = require("./util");
class FixFleet {
    pi;
    constructor(pi) {
        this.pi = pi;
    }
    async execute(report, ctx) {
        if (!report || typeof report !== "string") {
            console.error("[pi-audit-master] FixFleet: invalid report input");
            return [];
        }
        const issues = this.parseCriticalIssues(report);
        const results = [];
        for (const issue of issues) {
            try {
                const resolved = await this.dispatchFixWorker(issue, ctx);
                results.push({
                    issueId: issue.id,
                    severity: issue.severity,
                    file: issue.file,
                    status: resolved ? "RESOLVED" : "FAILED",
                    details: resolved
                        ? "Fixed and verified by automated worker"
                        : "Worker completed but did not confirm a fix",
                });
            }
            catch (e) {
                // One failure does NOT abort the whole fleet
                results.push({
                    issueId: issue.id,
                    severity: issue.severity,
                    file: issue.file,
                    status: "FAILED",
                    details: `Exception: ${e.message || String(e)}`,
                });
            }
        }
        return results;
    }
    parseCriticalIssues(report) {
        const findings = [];
        const lines = report.split("\n");
        const regex = /^\|\s*(CRITICAL|HIGH)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*$/i;
        for (const line of lines) {
            const match = line.match(regex);
            if (!match)
                continue;
            const [, severity, fileLine, description, fix] = match;
            const { file, line: lineNum } = (0, util_1.parseFileLine)(fileLine);
            findings.push({
                id: (0, util_1.generateId)("issue"),
                file,
                line: lineNum,
                severity: severity.toUpperCase(),
                description: description.trim(),
                fixSuggestion: fix.trim(),
                agent: "FixFleet",
            });
        }
        return findings;
    }
    async dispatchFixWorker(issue, _ctx) {
        // NOTE: This is currently a stub. In a full implementation, this would:
        // 1. Read the file at issue.file
        // 2. Use the agent (or LLM) to apply a patch based on issue.fixSuggestion
        // 3. Write the patched file back
        // 4. Optionally run tests to verify
        //
        // For now, we return false to be honest about the limitation.
        // The user can manually apply fixes using the suggestion in the report.
        console.warn(`[pi-audit-master] FixFleet is a stub. Issue ${issue.id} in ${issue.file}:${issue.line} requires manual fixing.`);
        return false;
    }
}
exports.FixFleet = FixFleet;
