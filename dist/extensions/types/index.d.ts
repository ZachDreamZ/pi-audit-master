export interface AuditFinding {
    id: string;
    file: string;
    line: number;
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    description: string;
    fixSuggestion: string;
    agent: string;
}
export interface AuditConfig {
    depth: "surface" | "deep";
    format: "chat" | "file" | "hybrid";
    fix: boolean;
}
export interface AuditResult {
    summary: string;
    report: string;
    fixes?: any[];
}
export declare const AGENT_PROMPTS: Record<string, string>;
