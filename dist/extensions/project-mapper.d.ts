export declare class ProjectMapper {
    private rootPath;
    constructor(rootPath: string);
    /**
     * Maps the project and returns a list of files that contain core logic.
     * @param depth 'surface' for limited scan, 'deep' for full core scan.
     */
    mapCoreLogic(depth: "surface" | "deep"): Promise<string[]>;
    private mapSurface;
    private mapDeep;
}
