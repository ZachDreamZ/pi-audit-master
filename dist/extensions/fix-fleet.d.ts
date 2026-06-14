import type { ExtensionAPI } from "pi-coding-agent";
export interface FixResult {
    issueId: string;
    status: "RESOLVED" | "FAILED" | "SKIPPED";
    details: string;
}
export declare class FixFleet {
    private pi;
    constructor(pi: ExtensionAPI);
    execute(report: string, ctx: any): Promise<FixResult[]>;
    private parseCriticalIssues;
    private dispatchFixWorker;
}
