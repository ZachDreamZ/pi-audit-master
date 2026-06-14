import { AuditManager } from "../extensions/audit-manager";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "path";

describe("AuditManager", () => {
	const TMP = path.join(os.tmpdir(), `pi-audit-mgr-${Date.now()}`);

	beforeAll(() => {
		fs.mkdirSync(TMP, { recursive: true });
		fs.mkdirSync(path.join(TMP, "extensions"));
		fs.writeFileSync(path.join(TMP, "extensions", "index.ts"), "// entry");
	});

	afterAll(() => {
		fs.rmSync(TMP, { recursive: true, force: true });
	});

	test("throws on missing path", async () => {
		const mgr = new AuditManager({} as any);
		await expect(mgr.runAudit({ path: "", ctx: {} as any })).rejects.toThrow(
			/required/,
		);
	});

	test("throws on missing ctx", async () => {
		const mgr = new AuditManager({} as any);
		await expect(mgr.runAudit({ path: TMP, ctx: null as any })).rejects.toThrow(
			/ctx is required/,
		);
	});

	test("throws on non-existent path", async () => {
		const mgr = new AuditManager({} as any);
		await expect(
			mgr.runAudit({ path: "/nonexistent/xyz", ctx: {} as any }),
		).rejects.toThrow(/does not exist/);
	});

	test("runs successfully on a valid project", async () => {
		const mgr = new AuditManager({} as any);
		const result = await mgr.runAudit({
			path: TMP,
			depth: "surface",
			format: "chat",
			fix: false,
			ctx: {} as any,
		});
		expect(result.message).toContain("Audit complete");
		expect(result.report).toContain("Audit Report");
		expect(result.summary).toBeDefined();
	});

	test("report is written to the audited project, not process.cwd()", async () => {
		const mgr = new AuditManager({} as any);
		await mgr.runAudit({
			path: TMP,
			depth: "surface",
			format: "file",
			fix: false,
			ctx: {} as any,
		});
		const reportPath = path.join(TMP, "audit-report.md");
		expect(fs.existsSync(reportPath)).toBe(true);
		// Clean up
		fs.unlinkSync(reportPath);
	});
});
