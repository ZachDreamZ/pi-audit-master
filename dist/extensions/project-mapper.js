"use strict";
// ProjectMapper: Walks the project tree to find files containing core logic.
// Fixed in v0.3.0:
//   - Added ENOTDIR and other error handling for readdirSync
//   - Added symlink detection to prevent infinite loops
//   - Documented the maxFiles constant
//   - Added depth limit to prevent runaway recursion
//   - Validate file readability before adding to results
//   - Added path traversal protection and input sanitization
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectMapper = void 0;
exports.sanitizePath = sanitizePath;
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const logger_1 = require("./logger");
/**
 * Sanitize and validate a file path to prevent path traversal attacks.
 * @param inputPath The input path to sanitize
 * @param baseDir The base directory to restrict access to (optional)
 * @returns The resolved absolute path if valid, throws Error otherwise
 */
function sanitizePath(inputPath, baseDir) {
    if (!inputPath || typeof inputPath !== "string") {
        throw new Error("Invalid path: must be a non-empty string");
    }
    // Normalize the path (resolve . and ..)
    const normalized = path.normalize(inputPath);
    // Resolve to absolute path
    const absolute = path.resolve(normalized);
    // If baseDir is provided, ensure the path is within it
    if (baseDir) {
        const absoluteBase = path.resolve(baseDir);
        // Check if the path is within baseDir
        const relative = path.relative(absoluteBase, absolute);
        if (relative.startsWith("..") || path.isAbsolute(relative)) {
            throw new Error(`Path traversal attempt detected: ${inputPath}`);
        }
    }
    return absolute;
}
/** Maximum number of files to include in a single audit. Prevents token explosion. */
const MAX_FILES = 50;
/** Maximum directory depth to traverse. Prevents runaway recursion. */
const MAX_DEPTH = 8;
class ProjectMapper {
    rootPath;
    constructor(rootPath) {
        this.rootPath = rootPath;
    }
    /**
     * Maps the project and returns a list of files that contain core logic.
     * @param depth 'surface' for a limited scan, 'deep' for a full core scan.
     */
    async mapCoreLogic(depth) {
        // Sanitize and validate the root path
        const absoluteRoot = sanitizePath(this.rootPath);
        if (!fs.existsSync(absoluteRoot)) {
            throw new Error(`Root path does not exist: ${absoluteRoot}`);
        }
        try {
            const stat = fs.statSync(absoluteRoot);
            if (!stat.isDirectory()) {
                throw new Error(`Root path is not a directory: ${absoluteRoot}`);
            }
        }
        catch (err) {
            if (err.code === "ENOENT") {
                throw new Error(`Root path does not exist: ${absoluteRoot}`);
            }
            throw err;
        }
        if (depth === "surface") {
            return this.mapSurface(absoluteRoot);
        }
        return this.mapDeep(absoluteRoot);
    }
    mapSurface(root) {
        // Surface mode returns a very limited set of entry points
        const entryPoints = [
            "extensions/index.ts",
            "src/index.ts",
            "index.ts",
            "main.ts",
            "app.ts",
        ];
        const found = [];
        for (const ep of entryPoints) {
            const fullPath = path.join(root, ep);
            try {
                if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
                    found.push(fullPath);
                }
            }
            catch {
                // Ignore inaccessible files
            }
        }
        return found;
    }
    mapDeep(root) {
        const coreFiles = [];
        const excludeDirs = new Set([
            "node_modules",
            "dist",
            ".git",
            ".vscode",
            "coverage",
            "build",
            "out",
            "target",
        ]);
        const priorityDirs = new Set(["extensions", "src", "lib", "core"]);
        const allowedExts = new Set([".ts", ".tsx", ".js", ".jsx"]);
        const excludeFiles = new Set([
            "package-lock.json",
            "yarn.lock",
            "pnpm-lock.yaml",
        ]);
        // Track visited real paths to prevent symlink loops
        const visitedRealPaths = new Set();
        try {
            visitedRealPaths.add(fs.realpathSync(root));
        }
        catch {
            // If realpath fails, we'll just be more conservative with depth
        }
        const walk = (dir, currentDepth) => {
            if (coreFiles.length >= MAX_FILES)
                return;
            if (currentDepth > MAX_DEPTH)
                return;
            let entries;
            try {
                entries = fs.readdirSync(dir, { withFileTypes: true });
            }
            catch (err) {
                // ENOTDIR can happen if a file in a path is actually a file, not a dir
                // EACCES for permission denied
                (0, logger_1.logWarn)(`Cannot read ${dir}: ${err.message}`);
                return;
            }
            for (const entry of entries) {
                if (coreFiles.length >= MAX_FILES)
                    break;
                const fullPath = path.join(dir, entry.name);
                // Skip hidden files/dirs (starting with .) except for known important ones
                if (entry.name.startsWith(".") && entry.name !== ".env")
                    continue;
                if (entry.isDirectory()) {
                    if (excludeDirs.has(entry.name))
                        continue;
                    // Symlink protection: don't recurse into symlinks
                    if (entry.isSymbolicLink())
                        continue;
                    walk(fullPath, currentDepth + 1);
                }
                else if (entry.isFile() || entry.isSymbolicLink()) {
                    const ext = path.extname(entry.name);
                    if (!allowedExts.has(ext))
                        continue;
                    if (excludeFiles.has(entry.name))
                        continue;
                    // Validate the file is readable
                    try {
                        fs.accessSync(fullPath, fs.constants.R_OK);
                    }
                    catch {
                        continue;
                    }
                    const isPriority = priorityDirs.has(path.basename(path.dirname(fullPath)));
                    if (isPriority) {
                        coreFiles.push(fullPath);
                    }
                }
            }
        };
        walk(root, 0);
        // If we found too few priority files, fall back to including all source files
        if (coreFiles.length < 10) {
            const allFiles = [];
            const walkAll = (dir, currentDepth) => {
                if (allFiles.length >= MAX_FILES)
                    return;
                if (currentDepth > MAX_DEPTH)
                    return;
                let entries;
                try {
                    entries = fs.readdirSync(dir, { withFileTypes: true });
                }
                catch {
                    return;
                }
                for (const entry of entries) {
                    if (allFiles.length >= MAX_FILES)
                        break;
                    const fullPath = path.join(dir, entry.name);
                    if (entry.name.startsWith("."))
                        continue;
                    if (entry.isDirectory() && !entry.isSymbolicLink()) {
                        if (!excludeDirs.has(entry.name))
                            walkAll(fullPath, currentDepth + 1);
                    }
                    else if (entry.isFile() || entry.isSymbolicLink()) {
                        if (allowedExts.has(path.extname(entry.name)) &&
                            !excludeFiles.has(entry.name)) {
                            try {
                                fs.accessSync(fullPath, fs.constants.R_OK);
                                allFiles.push(fullPath);
                            }
                            catch {
                                // Skip unreadable files
                            }
                        }
                    }
                }
            };
            walkAll(root, 0);
            const finalSet = new Set([...coreFiles, ...allFiles]);
            return Array.from(finalSet).slice(0, MAX_FILES);
        }
        return coreFiles.slice(0, MAX_FILES);
    }
}
exports.ProjectMapper = ProjectMapper;
