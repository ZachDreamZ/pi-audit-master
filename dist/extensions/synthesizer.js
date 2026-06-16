"use strict";
// AuditSynthesizer: Consolidates raw audit reports from multiple agents into a unified markdown report.
// Fixed in v0.3.0:
//   - Replaced Math.random() IDs with crypto.randomUUID()
//   - Fixed Windows path parsing (use lastIndexOf(":"))
//   - Validated line numbers (was silently setting to 0)
//   - Removed emojis from report (user requested)
//   - Fixed severity counting to only match finding lines, not summary text
//   - Robust deduplication with normalized keys
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditSynthesizer = void 0;
const util_1 = require("./util");
const logger_1 = require("./logger");
class AuditSynthesizer {
    rootPath;
    constructor(rootPath) {
        this.rootPath = rootPath;
    }
    async synthesize(reports) {
        const allFindings = [];
        for (let i = 0; i < reports.length; i++) {
            const report = reports[i];
            if (!report || typeof report !== "string") {
                (0, logger_1.logWarn)(`Skipping invalid report at index ${i}`);
                continue;
            }
            try {
                allFindings.push(...this.parseReport(report));
            }
            catch (err) {
                (0, logger_1.logError)(`Failed to parse report ${i}: ${err.message}`);
            }
        }
        const deduplicated = this.deduplicate(allFindings);
        const sorted = this.sortFindings(deduplicated);
        return this.generateMarkdown(sorted);
    }
    parseReport(report) {
        const findings = [];
        const lines = report.split("\n");
        // Match markdown table rows: | Severity | File:Line | Description | Fix |
        const findingRegex = /^\|\s*(CRITICAL|HIGH|MEDIUM|LOW)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*$/i;
        for (const line of lines) {
            const match = line.match(findingRegex);
            if (!match)
                continue;
            const [, severity, fileLine, description, fix] = match;
            const { file, line: lineNum } = (0, util_1.parseFileLine)(fileLine);
            findings.push({
                id: (0, util_1.generateId)("find"),
                file,
                line: lineNum,
                severity: severity.toUpperCase(),
                description: description.trim(),
                fixSuggestion: fix.trim(),
                agent: "AuditAgent",
            });
        }
        return findings;
    }
    deduplicate(findings) {
        const seen = new Set();
        return findings.filter((f) => {
            const key = (0, util_1.findingDedupKey)(f.file, f.line, f.description);
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        });
    }
    sortFindings(findings) {
        const weight = {
            CRITICAL: 0,
            HIGH: 1,
            MEDIUM: 2,
            LOW: 3,
        };
        return findings.sort((a, b) => {
            const w = weight[a.severity] - weight[b.severity];
            if (w !== 0)
                return w;
            // Secondary sort: by file, then line
            if (a.file !== b.file)
                return a.file.localeCompare(b.file);
            return a.line - b.line;
        });
    }
    generateMarkdown(findings) {
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
        }
        else {
            md += `## Findings\n\n`;
            md += `| Severity | Location | Description | Fix Suggestion |\n`;
            md += `| :--- | :--- | :--- | :--- |\n`;
            for (const f of findings) {
                const location = f.line > 0 ? `${f.file}:${f.line}` : f.file;
                // Escape pipe characters in cell content
                const desc = f.description.replace(/\|/g, "|");
                const fix = f.fixSuggestion.replace(/\|/g, "|");
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
exports.AuditSynthesizer = AuditSynthesizer;
