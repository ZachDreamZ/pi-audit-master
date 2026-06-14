import * as fs from "fs";
import * as path from "path";

export class ProjectMapper {
	constructor(private rootPath: string) {}

	/**
	 * Maps the project and returns a list of files that contain core logic.
	 * @param depth 'surface' for limited scan, 'deep' for full core scan.
	 */
	public async mapCoreLogic(depth: "surface" | "deep"): Promise<string[]> {
		const absoluteRoot = path.resolve(this.rootPath);

		if (!fs.existsSync(absoluteRoot)) {
			throw new Error(`Root path does not exist: ${absoluteRoot}`);
		}

		if (depth === "surface") {
			return this.mapSurface(absoluteRoot);
		}

		return this.mapDeep(absoluteRoot);
	}

	private mapSurface(root: string): string[] {
		// Surface mode returns a very limited set of entry points
		const entryPoints = ["extensions/index.ts", "src/index.ts", "index.ts"];
		const found: string[] = [];

		for (const ep of entryPoints) {
			const fullPath = path.join(root, ep);
			if (fs.existsSync(fullPath)) {
				found.push(fullPath);
			}
		}

		return found;
	}

	private mapDeep(root: string): string[] {
		const coreFiles: string[] = [];
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

		const walk = (dir: string) => {
			if (coreFiles.length >= maxFiles) return;

			const entries = fs.readdirSync(dir, { withFileTypes: true });

			for (const entry of entries) {
				if (coreFiles.length >= maxFiles) break;

				const fullPath = path.join(dir, entry.name);

				if (entry.isDirectory()) {
					if (excludeDirs.has(entry.name)) continue;
					walk(fullPath);
				} else if (entry.isFile()) {
					const ext = path.extname(entry.name);
					if (!allowedExts.has(ext)) continue;
					if (excludeFiles.has(entry.name)) continue;

					const isPriority = priorityDirs.has(
						path.basename(path.dirname(fullPath)),
					);

					if (isPriority) {
						coreFiles.push(fullPath);
					}
				}
			}
		};

		walk(root);

		if (coreFiles.length < 10) {
			const allFiles: string[] = [];
			const walkAll = (dir: string) => {
				const entries = fs.readdirSync(dir, { withFileTypes: true });
				for (const entry of entries) {
					const fullPath = path.join(dir, entry.name);
					if (entry.isDirectory()) {
						if (!excludeDirs.has(entry.name)) walkAll(fullPath);
					} else if (entry.isFile()) {
						if (
							allowedExts.has(path.extname(entry.name)) &&
							!excludeFiles.has(entry.name)
						) {
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
