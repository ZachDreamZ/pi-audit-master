"use strict";
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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class ProjectMapper {
    rootPath;
    constructor(rootPath) {
        this.rootPath = rootPath;
    }
    /**
     * Maps the project and returns a list of files that contain core logic.
     * @param depth 'surface' for limited scan, 'deep' for full core scan.
     */
    async mapCoreLogic(depth) {
        const absoluteRoot = path.resolve(this.rootPath);
        if (!fs.existsSync(absoluteRoot)) {
            throw new Error(`Root path does not exist: ${absoluteRoot}`);
        }
        if (depth === "surface") {
            return this.mapSurface(absoluteRoot);
        }
        return this.mapDeep(absoluteRoot);
    }
    mapSurface(root) {
        // Surface mode returns a very limited set of entry points
        const entryPoints = ["extensions/index.ts", "src/index.ts", "index.ts"];
        const found = [];
        for (const ep of entryPoints) {
            const fullPath = path.join(root, ep);
            if (fs.existsSync(fullPath)) {
                found.push(fullPath);
            }
        }
        return found;
    }
    mapDeep(root) {
        const coreFiles = [];
        const maxFiles = 50;
        const excludeDirs = new Set([
            "node_modules",
            "dist",
            ".git",
            ".vscode",
            "coverage",
        ]);
        const priorityDirs = new Set(["extensions", "src", "lib", "core"]);
        const allowedExts = new Set([".ts", ".tsx", ".js", ".jsx"]);
        const excludeFiles = new Set([
            "package-lock.json",
            "yarn.lock",
            "pnpm-lock.yaml",
        ]);
        const walk = (dir) => {
            if (coreFiles.length >= maxFiles)
                return;
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (coreFiles.length >= maxFiles)
                    break;
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    if (excludeDirs.has(entry.name))
                        continue;
                    walk(fullPath);
                }
                else if (entry.isFile()) {
                    const ext = path.extname(entry.name);
                    if (!allowedExts.has(ext))
                        continue;
                    if (excludeFiles.has(entry.name))
                        continue;
                    const isPriority = priorityDirs.has(path.basename(path.dirname(fullPath)));
                    if (isPriority) {
                        coreFiles.push(fullPath);
                    }
                }
            }
        };
        walk(root);
        if (coreFiles.length < 10) {
            const allFiles = [];
            const walkAll = (dir) => {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    if (entry.isDirectory()) {
                        if (!excludeDirs.has(entry.name))
                            walkAll(fullPath);
                    }
                    else if (entry.isFile()) {
                        if (allowedExts.has(path.extname(entry.name)) &&
                            !excludeFiles.has(entry.name)) {
                            allFiles.push(fullPath);
                        }
                    }
                }
            };
            walkAll(root);
            const finalSet = new Set([...coreFiles, ...allFiles]);
            return Array.from(finalSet).slice(0, maxFiles);
        }
        return coreFiles.slice(0, maxFiles);
    }
}
exports.ProjectMapper = ProjectMapper;
