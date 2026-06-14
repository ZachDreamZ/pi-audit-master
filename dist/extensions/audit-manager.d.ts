import type { ExtensionAPI, ExtensionCommandContext } from "pi-coding-agent";
export interface AuditOptions {
    path: string;
    depth?: "surface" | "deep";
    format?: "chat" | "file" | "hybrid";
    fix?: boolean;
    ctx: ExtensionCommandContext;
}
export interface AuditConfig {
    depth: "surface" | "deep";
    format: "chat" | "file" | "hybrid";
    fix: boolean;
}
export declare class AuditManager {
    private pi;
    constructor(pi: ExtensionAPI);
    /**
     * Main entry point for the audit process.
     */
    runAudit(options: AuditOptions): Promise<any>;
    private resolveConfig;
    /**
     * Dispatches audit tasks to specialized agents.
     * NOTE: This is a stub. In a full implementation, this would use
     * the subagent tool or a similar mechanism to run AGENT_PROMPTS in parallel.
     * Currently returns placeholder reports so the rest of the pipeline works.
     */
    dispatchAuditAgents(files: string[]): Promise<string[]>;
    private handleOutput;
}
