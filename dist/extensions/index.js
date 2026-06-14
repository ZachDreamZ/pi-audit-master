"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
const audit_manager_1 = require("./audit-manager");
/**
 * pi-audit-master
 * Professional multi-agent auditing and repair engine.
 */
function default_1(pi) {
    const auditManager = new audit_manager_1.AuditManager(pi);
    // Register the 'audit' tool
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
            // If depth/format/fix are missing, we will use ask_user_question inside the manager
            // to make the experience interactive if the tool is called generically.
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
    console.log("[pi-audit-master] Extension loaded. Use /audit to start a comprehensive audit.");
}
