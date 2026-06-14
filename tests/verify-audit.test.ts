import { AuditManager } from "../extensions/audit-manager";
import * as path from "path";
import type { ExtensionAPI } from "pi-coding-agent";

// Mocks
const mockPi = {
	on: jest.fn(),
	registerTool: jest.fn(),
	subagents: {
		parallel: jest.fn(),
	},
} as unknown as ExtensionAPI;

const mockCtx = {
	ui: {
		notify: jest.fn(),
	},
};

describe("AuditManager Verification", () => {
	let manager: AuditManager;
	const projectPath = path.join(__dirname, "buggy-project");

	beforeEach(() => {
		manager = new AuditManager(mockPi);
		jest.clearAllMocks();
	});

	it("should detect critical and high bugs in buggy-project", async () => {
		const spy = jest
			.spyOn(manager, "dispatchAuditAgents")
			.mockResolvedValue([
				`| CRITICAL | src/api.ts:10 | Null access on data.profile | Add null guard |`,
				`| HIGH | src/auth.ts:12 | Login called before init | Add initialization check |`,
				`| MEDIUM | src/utils.ts:8 | O(n^2) loop in findDuplicates | Use a Map for O(n) |`,
				`| CRITICAL | extensions/my-ext.ts:7 | Missing event.abort() | Call event.abort() to block tool |`,
				`| LOW | src/legacy.ts:5 | Magic number 5000 | Move to constant |`,
			]);

		const finalResult = await manager.runAudit({
			path: projectPath,
			depth: "deep",
			format: "file",
			fix: false,
			ctx: mockCtx as any,
		});

		expect(finalResult.report).toContain("CRITICAL");
		expect(finalResult.report).toContain("HIGH");
		expect(finalResult.report).toContain("MEDIUM");
		expect(finalResult.report).toContain("src/api.ts");
		expect(finalResult.report).toContain("extensions/my-ext.ts");

		spy.mockRestore();
	});

	it("should attempt fix and report honest status (FixFleet is a stub)", async () => {
		const spy = jest
			.spyOn(manager, "dispatchAuditAgents")
			.mockResolvedValue([
				`| CRITICAL | src/api.ts:10 | Null access | Add guard |`,
			]);

		const result = await manager.runAudit({
			path: projectPath,
			depth: "deep",
			format: "chat",
			fix: true,
			ctx: mockCtx as any,
		});

		// FixFleet is a stub. It honestly returns FAILED because it cannot
		// actually apply patches. The user must apply the fix manually.
		expect(result.fixes).toBeDefined();
		expect(result.fixes.length).toBe(1);
		expect(result.fixes[0].status).toBe("FAILED");
		expect(result.fixes[0].details).toMatch(/Worker|confirm|did not/);

		spy.mockRestore();
	});
});
