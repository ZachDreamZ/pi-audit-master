declare module 'pi-coding-agent' {
    export interface ExtensionAPI {
        on(event: string, handler: Function): void;
        registerTool(options: any): void;
        subagents: any;
    }
    export interface ExtensionCommandContext {
        ui: {
            notify(message: string, level: string): void;
        };
        askUserQuestion(question: any): Promise<any>;
    }
}
