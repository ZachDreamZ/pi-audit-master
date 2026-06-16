/**
 * Sanitize and validate a file path to prevent path traversal attacks.
 * @param inputPath The input path to sanitize
 * @param baseDir The base directory to restrict access to (optional)
 * @returns The resolved absolute path if valid, throws Error otherwise
 */
export declare function sanitizePath(inputPath: string, baseDir?: string): string;
export declare class ProjectMapper {
    private rootPath;
    constructor(rootPath: string);
    /**
     * Maps the project and returns a list of files that contain core logic.
     * @param depth 'surface' for a limited scan, 'deep' for a full core scan.
     */
    mapCoreLogic(depth: "surface" | "deep"): Promise<string[]>;
    private mapSurface;
    private mapDeep;
}
