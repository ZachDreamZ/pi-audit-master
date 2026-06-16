"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = piAuditMaster;
const audit_manager_1 = require("./audit-manager");
const logger_1 = require("./logger");
/**
 * pi-audit-master
 * Professional multi-agent auditing and repair engine.
 *
 * v0.4.0 Features:
 * - Active audit via /audit command
 * - Passive mode: auto-audit on file changes
 * - Integration with other Pi packages
 */
async function piAuditMaster(pi) {
    const auditManager = new audit_manager_1.AuditManager(pi);
    // Track recently modified files for passive audit
    const recentFiles = new Set();
    let passiveAuditTimeout = null;
    /**
     * Passive audit: triggered after file modifications.
     * Debounces rapid edits and audits only when user pauses.
     */
    const triggerPassiveAudit = (filePath) => {
        recentFiles.add(filePath);
        // Debounce: wait 2 seconds after last edit
        if (passiveAuditTimeout) {
            clearTimeout(passiveAuditTimeout);
        }
        passiveAuditTimeout = setTimeout(async () => {
            if (recentFiles.size === 0)
                return;
            (0, logger_1.logInfo)(`Passive audit triggered for ${recentFiles.size} files`);
            // Get unique directories from modified files
            const dirs = new Set();
            for (const file of recentFiles) {
                dirs.add(require("node:path").dirname(file));
            }
            // Run quick surface audit on each directory
            for (const dir of dirs) {
                try {
                    const result = await auditManager.runAudit({
                        path: dir,
                        depth: "surface",
                        format: "chat",
                        fix: false,
                        ctx: { ui: { notify: (msg) => console.log(msg) } },
                    });
                    // Notify user of critical findings
                    if (result.summary && result.summary.includes("Critical")) {
                        (0, logger_1.logWarn)(`Critical issues found in ${dir}`);
                    }
                }
                catch (err) {
                    (0, logger_1.logWarn)(`Passive audit failed: ${err.message}`);
                }
            }
            recentFiles.clear();
        }, 2000);
    };
    // Register the 'audit' tool for AI function-calling
    pi.registerTool({
        name: "audit",
        description: "Perform a comprehensive multi-agent audit of a directory. Options: depth (surface/deep), format (chat/file/hybrid), fix (on/off).",
        parameters: {
            type: "object",
            properties: {
                path: {
                    type: "string",
                    description: "Path to the directory or file to audit. Defaults to current directory.",
                },
                depth: {
                    type: "string",
                    enum: ["surface", "deep"],
                    description: "Audit depth. Surface: specified files only. Deep: entire project core logic.",
                },
                format: {
                    type: "string",
                    enum: ["chat", "file", "hybrid"],
                    description: "Report format. Chat: concise summary. File: detailed .md report. Hybrid: both.",
                },
                fix: {
                    type: "boolean",
                    description: "Enable the Fix-Fleet to automatically resolve issues after auditing.",
                },
            },
        },
        handler: async (ctx, args) => {
            const targetPath = args.path || ".";
            try {
                const result = await auditManager.runAudit({
                    path: targetPath,
                    depth: args.depth,
                    format: args.format,
                    fix: args.fix,
                    ctx: ctx,
                });
                return result;
            }
            catch (error) {
                ctx.ui.notify(`Audit failed: ${error.message}`, "error");
                return { error: error.message };
            }
        },
    });
    // Register as a user-facing slash command for TUI visibility
    // registerCommand is a real Pi runtime method (not in type declarations yet)
    const piAny = pi;
    if (typeof piAny.registerCommand === "function") {
        piAny.registerCommand("audit", {
            description: "Perform a comprehensive multi-agent codebase audit",
            handler: async (ctx) => {
                ctx.ui.notify("Starting deep audit of the current project...", "info");
                try {
                    const result = await auditManager.runAudit({
                        path: process.cwd(),
                        depth: "deep",
                        format: "hybrid",
                        fix: false,
                        ctx: ctx,
                    });
                    return JSON.stringify(result, null, 2);
                }
                catch (error) {
                    ctx.ui.notify(`Audit failed: ${error.message}`, "error");
                    return `Error: ${error.message}`;
                }
            },
        });
    }
    // Register passive mode hooks for auto-audit on file changes
    // Hook into tool execution to track file modifications
    if (typeof pi.on === "function") {
        // Listen for write/edit operations
        pi.on("tool_execution_end", (event) => {
            const toolName = event.toolName || event.tool;
            const args = event.args || event.parameters;
            // Track file modifications
            if (toolName === "write" || toolName === "edit") {
                const filePath = args?.path || args?.filePath;
                if (filePath) {
                    triggerPassiveAudit(filePath);
                }
            }
            // Also track bash commands that modify files
            if (toolName === "bash") {
                const command = args?.command || "";
                if (command.includes(" > ") ||
                    command.includes(" >> ") ||
                    command.includes("mv ")) {
                    // Extract file path from command (simplified)
                    const pathMatch = command.match(/(?:>|>>|mv)\s+(\S+)/);
                    if (pathMatch) {
                        triggerPassiveAudit(pathMatch[1]);
                    }
                }
            }
        });
        (0, logger_1.logInfo)("Passive mode enabled. Files will be auto-audited after modifications.");
    }
    (0, logger_1.logInfo)("Extension loaded. Use /audit to start a comprehensive audit.");
}
