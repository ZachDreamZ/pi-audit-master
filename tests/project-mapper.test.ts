import { ProjectMapper } from "../extensions/project-mapper";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "path";

describe("ProjectMapper", () => {
	const TMP = path.join(os.tmpdir(), `pi-audit-mapper-${Date.now()}`);

	beforeAll(() => {
		fs.mkdirSync(TMP, { recursive: true });
		// Create a fake project structure
		fs.mkdirSync(path.join(TMP, "extensions"));
		fs.mkdirSync(path.join(TMP, "src"));
		fs.mkdirSync(path.join(TMP, "node_modules"));
		fs.mkdirSync(path.join(TMP, "node_modules", "some-pkg"));
		fs.writeFileSync(path.join(TMP, "extensions", "index.ts"), "// ts");
		fs.writeFileSync(path.join(TMP, "extensions", "util.ts"), "// ts");
		fs.writeFileSync(path.join(TMP, "src", "main.ts"), "// ts");
		fs.writeFileSync(path.join(TMP, "node_modules", "some-pkg", "index.js"), "// js");
		fs.writeFileSync(path.join(TMP, "package-lock.json"), "{}");
		fs.writeFileSync(path.join(TMP, "README.md"), "# readme");
	});

	afterAll(() => {
		fs.rmSync(TMP, { recursive: true, force: true });
	});

	test("throws on non-existent path", async () => {
		const mapper = new ProjectMapper("/nonexistent/path/xyz");
		await expect(mapper.mapCoreLogic("deep")).rejects.toThrow(/does not exist/);
	});

	test("throws on file (not directory)", async () => {
		const filePath = path.join(TMP, "README.md");
		const mapper = new ProjectMapper(filePath);
		await expect(mapper.mapCoreLogic("deep")).rejects.toThrow(/not a directory/);
	});

	test("deep mode excludes node_modules", async () => {
		const mapper = new ProjectMapper(TMP);
		const files = await mapper.mapCoreLogic("deep");
		const inNodeModules = files.some((f) => f.includes("node_modules"));
		expect(inNodeModules).toBe(false);
	});

	test("deep mode includes priority dirs (extensions, src)", async () => {
		const mapper = new ProjectMapper(TMP);
		const files = await mapper.mapCoreLogic("deep");
		const hasExtensions = files.some((f) => f.includes("extensions"));
		const hasSrc = files.some((f) => f.includes(path.join("src", "main.ts")));
		expect(hasExtensions || hasSrc).toBe(true);
	});

	test("deep mode excludes lock files", async () => {
		const mapper = new ProjectMapper(TMP);
		const files = await mapper.mapCoreLogic("deep");
		const hasLock = files.some((f) => f.includes("package-lock.json"));
		expect(hasLock).toBe(false);
	});

	test("surface mode returns entry points", async () => {
		// Create an entry point
		fs.writeFileSync(path.join(TMP, "extensions", "index.ts"), "// entry");
		const mapper = new ProjectMapper(TMP);
		const files = await mapper.mapCoreLogic("surface");
		expect(files).toContain(path.join(TMP, "extensions", "index.ts"));
	});

	test("surface mode returns empty when no entry points exist", async () => {
		const emptyDir = path.join(os.tmpdir(), `pi-audit-empty-${Date.now()}`);
		fs.mkdirSync(emptyDir, { recursive: true });
		try {
			const mapper = new ProjectMapper(emptyDir);
			const files = await mapper.mapCoreLogic("surface");
			expect(files).toEqual([]);
		} finally {
			fs.rmSync(emptyDir, { recursive: true, force: true });
		}
	});
});
