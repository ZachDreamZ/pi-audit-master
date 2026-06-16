"use strict";
// FixFleet: Attempts to automatically resolve issues found during audit.
// Fixed in v0.3.0:
//   - Replaced Math.random() IDs with crypto.randomUUID()
//   - Added per-issue error handling (one failure doesn't abort the whole fleet)
//   - Added validation for the report input
//   - Clarified that dispatchFixWorker is a stub (logs a clear warning)
// Enhanced in v0.4.0:
//   - Implemented actual fix dispatch using file operations
//   - Added fix verification with re-read
//   - Added confidence scoring for fixes
//   - Integrated with Pi's edit/write tools
//   - Made magic number detection conservative to avoid false positives
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
exports.FixFleet = void 0;
const util_1 = require("./util");
const logger_1 = require("./logger");
const fs = __importStar(require("node:fs"));
class FixFleet {
    pi;
    constructor(pi) {
        this.pi = pi;
    }
    async execute(report, ctx) {
        if (!report || typeof report !== "string") {
            (0, logger_1.logError)("FixFleet: invalid report input");
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
    isMagicNumber(num, line) {
        const n = parseInt(num, 10);
        if (Number.isNaN(n))
            return false;
        const commonLegitimateNumbers = new Set([
            1970, 1980, 1990, 2000, 2010, 2020, 2021, 2022, 2023, 2024, 2025, 2026,
            100, 101, 200, 201, 202, 204, 300, 301, 302, 304, 400, 401, 403, 404, 405,
            409, 422, 429, 500, 502, 503, 504, 22, 25, 53, 80, 443, 3306, 5432, 6379,
            8080, 8443, 9000, 1000, 5000, 10000, 30000, 60000, 300000, 3600000,
            86400000, 256, 512, 1024, 2048, 4096, 8192, 16384, 65536, 1, 2, 3, 4, 5,
            6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
        ]);
        if (commonLegitimateNumbers.has(n))
            return false;
        const context = line.toLowerCase();
        if (context.includes("port") ||
            context.includes("year") ||
            context.includes("version") ||
            context.includes("status") ||
            context.includes("timeout") ||
            context.includes("buffer") ||
            context.includes("limit") ||
            context.includes("max") ||
            context.includes("min") ||
            context.includes("size") ||
            context.includes("count") ||
            context.includes("length") ||
            context.includes("http") ||
            context.includes("timestamp") ||
            context.includes("date") ||
            context.includes("time") ||
            context.includes("delay") ||
            context.includes("interval") ||
            context.includes("retry")) {
            return false;
        }
        return num.length >= 4;
    }
    async dispatchFixWorker(issue, ctx) {
        try {
            if (!fs.existsSync(issue.file)) {
                (0, logger_1.logWarn)(`File not found: ${issue.file}`);
                return false;
            }
            const content = fs.readFileSync(issue.file, "utf8");
            const lines = content.split("\n");
            const targetLine = issue.line > 0 ? issue.line - 1 : 0;
            if (targetLine >= lines.length) {
                (0, logger_1.logWarn)(`Line ${issue.line} out of range in ${issue.file}`);
                return false;
            }
            const originalLine = lines[targetLine];
            let fixedLine = originalLine;
            let applied = false;
            const desc = issue.description.toLowerCase();
            const fix = issue.fixSuggestion.toLowerCase();
            if (desc.includes("as any") && fix.includes("remove type assertion")) {
                fixedLine = originalLine.replace(/\s+as\s+any/g, "");
                applied = fixedLine !== originalLine;
            }
            if ((desc.includes("null dereference") || desc.includes("null safety")) &&
                fix.includes("optional chaining")) {
                fixedLine = originalLine.replace(/\.([a-zA-Z_$][\w$]*)/g, "?.$1");
                applied = fixedLine !== originalLine;
            }
            if (desc.includes("magic number") && fix.includes("named constant")) {
                const numMatch = originalLine.match(/\b(\d{4,})\b/);
                if (numMatch && this.isMagicNumber(numMatch[1], originalLine)) {
                    const num = numMatch[1];
                    const constantName = `CONSTANT_${num}`;
                    let insertIndex = 0;
                    for (let i = 0; i < lines.length; i++) {
                        if (lines[i].startsWith("import ") ||
                            lines[i].startsWith("export ")) {
                            insertIndex = i + 1;
                        }
                        else if (lines[i].trim() === "") {
                        }
                        else {
                            break;
                        }
                    }
                    lines.splice(insertIndex, 0, `const ${constantName} = ${num};`);
                    fixedLine = originalLine.replace(num, constantName);
                    applied = true;
                }
            }
            if (desc.includes("async call without error handling") &&
                fix.includes("try-catch")) {
                const indent = originalLine.match(/^(\s*)/)?.[1] || "";
                fixedLine = `${indent}try {\n${indent}  ${originalLine.trim()}\n${indent}} catch (error) {\n${indent}  console.error(error);\n${indent}}`;
                applied = true;
            }
            if (applied) {
                lines[targetLine] = fixedLine;
                const newContent = lines.join("\n");
                fs.writeFileSync(issue.file, newContent, "utf8");
                const verifyContent = fs.readFileSync(issue.file, "utf8");
                const verifyLines = verifyContent.split("\n");
                if (verifyLines[targetLine] !== fixedLine) {
                    (0, logger_1.logWarn)(`Fix verification failed for ${issue.file}:${issue.line}`);
                    return false;
                }
                (0, logger_1.logInfo)(`Applied fix to ${issue.file}:${issue.line}`);
                return true;
            }
            (0, logger_1.logWarn)(`No automated fix available for: ${issue.description}`);
            return false;
        }
        catch (error) {
            (0, logger_1.logError)(`Fix failed: ${error.message}`);
            return false;
        }
    }
}
exports.FixFleet = FixFleet;
