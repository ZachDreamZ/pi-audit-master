import { generateId, parseFileLine, safeWriteFile, findingDedupKey } from "../extensions/util";

describe("util", () => {
	describe("generateId()", () => {
		test("returns a unique ID with prefix", () => {
			const id = generateId("find");
			expect(id).toMatch(/^find-[0-9a-f-]{36}$/);
		});

		test("returns unique IDs on multiple calls", () => {
			const ids = new Set([generateId("x"), generateId("x"), generateId("x")]);
			expect(ids.size).toBe(3);
		});

		test("uses default prefix when none provided", () => {
			const id = generateId();
			expect(id).toMatch(/^find-/);
		});
	});

	describe("parseFileLine()", () => {
		test("parses simple file:line", () => {
			const result = parseFileLine("src/auth.ts:42");
			expect(result.file).toBe("src/auth.ts");
			expect(result.line).toBe(42);
		});

		test("parses Windows path with colons", () => {
			const result = parseFileLine("C:\Users\dev\src\auth.ts:42");
			expect(result.file).toBe("C:\Users\dev\src\auth.ts");
			expect(result.line).toBe(42);
		});

		test("returns 0 for missing line number", () => {
			const result = parseFileLine("src/auth.ts");
			expect(result.file).toBe("src/auth.ts");
			expect(result.line).toBe(0);
		});

		test("returns 0 for invalid line number", () => {
			const result = parseFileLine("src/auth.ts:abc");
			expect(result.file).toBe("src/auth.ts");
			expect(result.line).toBe(0);
		});

		test("clamps negative line to 0", () => {
			const result = parseFileLine("src/auth.ts:-5");
			expect(result.line).toBe(0);
		});

		test("handles empty string", () => {
			const result = parseFileLine("");
			expect(result.file).toBe("");
			expect(result.line).toBe(0);
		});
	});

	describe("safeWriteFile()", () => {
		const fs = require("node:fs") as typeof import("node:fs");
		const os = require("node:os") as typeof import("node:os");
		const path = require("node:path") as typeof import("node:path");
		const TMP = path.join(os.tmpdir(), `pi-audit-test-${Date.now()}`);

		beforeAll(() => fs.mkdirSync(TMP, { recursive: true }));
		afterAll(() => fs.rmSync(TMP, { recursive: true, force: true }));

		test("returns true on success", () => {
			const p = path.join(TMP, "ok.txt");
			expect(safeWriteFile(p, "hello")).toBe(true);
			expect(fs.readFileSync(p, "utf8")).toBe("hello");
		});

		test("returns false on invalid path", () => {
			expect(safeWriteFile("/nonexistent/dir/file.txt", "data")).toBe(false);
		});
	});

	describe("findingDedupKey()", () => {
		test("normalizes whitespace and case", () => {
			const a = findingDedupKey("SRC/auth.ts", 42, "Null  pointer");
			const b = findingDedupKey("src/auth.ts", 42, "null pointer");
			expect(a).toBe(b);
		});

		test("different lines produce different keys", () => {
			const a = findingDedupKey("src/auth.ts", 42, "issue");
			const b = findingDedupKey("src/auth.ts", 43, "issue");
			expect(a).not.toBe(b);
		});
	});
});
