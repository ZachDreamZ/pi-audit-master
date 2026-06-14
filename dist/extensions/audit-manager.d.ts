import type { ExtensionAPI, ExtensionCommandContext } from "pi-coding-agent";
export interface AuditOptions {
    path: string;
    depth?: "surface" | "deep";
    format?: "chat" | "file" | "hybrid";
    fix?: boolean;
    ctx: ExtensionCommandContext;
}
export declare class AuditManager {
    private pi;
    constructor(pi: ExtensionAPI);
    /**
     * Main entry point for the audit process.
     */
    runAudit(options: AuditOptions): Promise<any>;
    private resolveConfig;
    dispatchAuditAgents(files: string[]): Promise<string[]>;
    private handleOutput;
}
