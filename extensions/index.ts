import type { ExtensionAPI, ExtensionCommandContext } from "pi-coding-agent";
import { AuditManager } from "./audit-manager";

/**
 * pi-audit-master
 * Professional multi-agent auditing and repair engine.
 */
export default async function piAuditMaster(pi: ExtensionAPI) {
	const auditManager = new AuditManager(pi);

	// Register the 'audit' tool for AI function-calling
	pi.registerTool({
		name: "audit",
		description:
			"Perform a comprehensive multi-agent audit of a directory. Options: depth (surface/deep), format (chat/file/hybrid), fix (on/off).",
		parameters: {
			type: "object",
			properties: {
				path: {
					type: "string",
					description:
						"Path to the directory or file to audit. Defaults to current directory.",
				},
				depth: {
					type: "string",
					enum: ["surface", "deep"],
					description:
						"Audit depth. Surface: specified files only. Deep: entire project core logic.",
				},
				format: {
					type: "string",
					enum: ["chat", "file", "hybrid"],
					description:
						"Report format. Chat: concise summary. File: detailed .md report. Hybrid: both.",
				},
				fix: {
					type: "boolean",
					description:
						"Enable the Fix-Fleet to automatically resolve issues after auditing.",
				},
			},
		},
		handler: async (ctx: ExtensionCommandContext, args: any) => {
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
			} catch (error: any) {
				ctx.ui.notify(`Audit failed: ${error.message}`, "error");
				return { error: error.message };
			}
		},
	});

	// Register as a user-facing slash command for TUI visibility
	// registerCommand is a real Pi runtime method (not in type declarations yet)
	const piAny = pi as any;
	if (typeof piAny.registerCommand === "function") {
		piAny.registerCommand("audit", {
			description: "Perform a comprehensive multi-agent codebase audit",
			handler: async (ctx: ExtensionCommandContext) => {
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
				} catch (error: any) {
					ctx.ui.notify(`Audit failed: ${error.message}`, "error");
					return `Error: ${error.message}`;
				}
			},
		});
	}

	console.log(
		"[pi-audit-master] Extension loaded. Use /audit to start a comprehensive audit.",
	);
}
