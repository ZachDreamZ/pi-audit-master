export interface AuditFinding {
    id: string;
    file: string;
    line: number;
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    description: string;
    fixSuggestion: string;
    agent: string;
}
export declare class AuditSynthesizer {
    private rootPath;
    constructor(rootPath: string);
    synthesize(reports: string[]): Promise<string>;
    private parseReport;
    private deduplicate;
    private sortFindings;
    private generateMarkdown;
}
