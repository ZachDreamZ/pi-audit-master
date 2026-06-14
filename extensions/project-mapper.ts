// ProjectMapper: Walks the project tree to find files containing core logic.
// Fixed in v0.3.0:
//   - Added ENOTDIR and other error handling for readdirSync
//   - Added symlink detection to prevent infinite loops
//   - Documented the maxFiles constant
//   - Added depth limit to prevent runaway recursion
//   - Validate file readability before adding to results

import * as fs from "node:fs";
import * as path from "node:path";

/** Maximum number of files to include in a single audit. Prevents token explosion. */
const MAX_FILES = 50;

/** Maximum directory depth to traverse. Prevents runaway recursion. */
const MAX_DEPTH = 8;

export class ProjectMapper {
	constructor(private rootPath: string) {}

	/**
	 * Maps the project and returns a list of files that contain core logic.
	 * @param depth 'surface' for a limited scan, 'deep' for a full core scan.
	 */
	public async mapCoreLogic(depth: "surface" | "deep"): Promise<string[]> {
		const absoluteRoot = path.resolve(this.rootPath);

		if (!fs.existsSync(absoluteRoot)) {
			throw new Error(`Root path does not exist: ${absoluteRoot}`);
		}

		try {
			const stat = fs.statSync(absoluteRoot);
			if (!stat.isDirectory()) {
				throw new Error(`Root path is not a directory: ${absoluteRoot}`);
			}
		} catch (err) {
			if ((err as NodeJS.ErrnoException).code === "ENOENT") {
				throw new Error(`Root path does not exist: ${absoluteRoot}`);
			}
			throw err;
		}

		if (depth === "surface") {
			return this.mapSurface(absoluteRoot);
		}

		return this.mapDeep(absoluteRoot);
	}

	private mapSurface(root: string): string[] {
		// Surface mode returns a very limited set of entry points
		const entryPoints = ["extensions/index.ts", "src/index.ts", "index.ts", "main.ts", "app.ts"];
		const found: string[] = [];

		for (const ep of entryPoints) {
			const fullPath = path.join(root, ep);
			try {
				if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
					found.push(fullPath);
				}
			} catch {
				// Ignore inaccessible files
			}
		}

		return found;
	}

	private mapDeep(root: string): string[] {
		const coreFiles: string[] = [];
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
		const visitedRealPaths = new Set<string>();
		try {
			visitedRealPaths.add(fs.realpathSync(root));
		} catch {
			// If realpath fails, we'll just be more conservative with depth
		}

		const walk = (dir: string, currentDepth: number) => {
			if (coreFiles.length >= MAX_FILES) return;
			if (currentDepth > MAX_DEPTH) return;

			let entries: fs.Dirent[];
			try {
				entries = fs.readdirSync(dir, { withFileTypes: true });
			} catch (err) {
				// ENOTDIR can happen if a file in a path is actually a file, not a dir
				// EACCES for permission denied
				console.warn(`[pi-audit-master] Cannot read ${dir}: ${(err as Error).message}`);
				return;
			}

			for (const entry of entries) {
				if (coreFiles.length >= MAX_FILES) break;

				const fullPath = path.join(dir, entry.name);

				// Skip hidden files/dirs (starting with .) except for known important ones
				if (entry.name.startsWith(".") && entry.name !== ".env") continue;

				if (entry.isDirectory()) {
					if (excludeDirs.has(entry.name)) continue;
					// Symlink protection: don't recurse into symlinks
					if (entry.isSymbolicLink()) continue;
					walk(fullPath, currentDepth + 1);
				} else if (entry.isFile() || entry.isSymbolicLink()) {
					const ext = path.extname(entry.name);
					if (!allowedExts.has(ext)) continue;
					if (excludeFiles.has(entry.name)) continue;

					// Validate the file is readable
					try {
						fs.accessSync(fullPath, fs.constants.R_OK);
					} catch {
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
			const allFiles: string[] = [];
			const walkAll = (dir: string, currentDepth: number) => {
				if (allFiles.length >= MAX_FILES) return;
				if (currentDepth > MAX_DEPTH) return;

				let entries: fs.Dirent[];
				try {
					entries = fs.readdirSync(dir, { withFileTypes: true });
				} catch {
					return;
				}

				for (const entry of entries) {
					if (allFiles.length >= MAX_FILES) break;
					const fullPath = path.join(dir, entry.name);
					if (entry.name.startsWith(".")) continue;

					if (entry.isDirectory() && !entry.isSymbolicLink()) {
						if (!excludeDirs.has(entry.name)) walkAll(fullPath, currentDepth + 1);
					} else if (entry.isFile() || entry.isSymbolicLink()) {
						if (allowedExts.has(path.extname(entry.name)) && !excludeFiles.has(entry.name)) {
							try {
								fs.accessSync(fullPath, fs.constants.R_OK);
								allFiles.push(fullPath);
							} catch {
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
