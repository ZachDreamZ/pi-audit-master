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
     * Uses Pi's complete() function to run each agent persona against the files.
     */
    dispatchAuditAgents(files: string[]): Promise<string[]>;
    /**
     * Read files for audit, limiting content to prevent token explosion.
     */
    private readFilesForAudit;
    /**
     * Run a single audit agent persona against file contents.
     */
    private runAuditAgent;
    /**
     * Run static analysis as fallback when AI completion is unavailable.
     */
    private runStaticAnalysis;
    private handleOutput;
}
