import { AuditManager } from "./extensions/audit-manager";
import * as path from "path";

async function verify() {
	console.log("🚀 Starting pi-audit-master verification...");

	const mockPi = { on: {}, registerTool: {} } as any;
	const mockCtx = { ui: { notify: () => {} } } as any;
	const manager = new AuditManager(mockPi);
	const projectPath = path.join(__dirname, "tests/buggy-project");

	// Mock the agent dispatch to simulate findings
	const spy = ((manager as any).dispatchAuditAgents = async () => [
		`| CRITICAL | src/api.ts:10 | Null access | Add guard |`,
		`| HIGH | src/auth.ts:12 | Logic flow | Add check |`,
		`| MEDIUM | src/utils.ts:8 | O(n^2) | Use Map |`,
		`| CRITICAL | extensions/my-ext.ts:7 | No abort | Call abort |`,
	]);

	try {
		const result = await manager.runAudit({
			path: projectPath,
			depth: "deep",
			format: "file",
			fix: false,
			ctx: mockCtx,
		});

		console.log("✅ Audit result received:");
		console.log(result.report);

		if (result.report.includes("CRITICAL") && result.report.includes("HIGH")) {
			console.log("🎯 SUCCESS: Critical and High bugs detected!");
		} else {
			console.error("❌ FAILURE: Bugs not detected in report.");
			process.exit(1);
		}
	} catch (e: any) {
		console.error("❌ Error during verification:", e);
		process.exit(1);
	}
}

verify();
