import { FixFleet } from "../extensions/fix-fleet";

describe("FixFleet", () => {
	// Mock the ExtensionAPI since FixFleet only uses it in dispatchFixWorker (a stub)
	const mockPi: any = {};

	test("returns empty array for invalid report", async () => {
		const fleet = new FixFleet(mockPi);
		const result = await fleet.execute("", null);
		expect(result).toEqual([]);
	});

	test("returns empty array for null report", async () => {
		const fleet = new FixFleet(mockPi);
		const result = await fleet.execute(null as any, null);
		expect(result).toEqual([]);
	});

	test("parses CRITICAL and HIGH issues from valid report", async () => {
		const fleet = new FixFleet(mockPi);
		const report = `
| Severity | File:Line | Description | Fix Suggestion |
| :--- | :--- | :--- | :--- |
| CRITICAL | src/a.ts:1 | Critical issue | Fix it |
| HIGH | src/b.ts:2 | High issue | Fix it |
| MEDIUM | src/c.ts:3 | Medium issue (skipped) | Fix it |
`;
		const results = await fleet.execute(report, null);
		// Should have 2 results (CRITICAL and HIGH), not MEDIUM
		expect(results.length).toBe(2);
		expect(results.every((r) => r.status === "FAILED")).toBe(true); // Stub returns false
	});

	test("each result has a valid ID", async () => {
		const fleet = new FixFleet(mockPi);
		const report = `
| Severity | File:Line | Description | Fix Suggestion |
| :--- | :--- | :--- | :--- |
| CRITICAL | src/a.ts:1 | Issue | Fix |
`;
		const results = await fleet.execute(report, null);
		expect(results[0].issueId).toMatch(/^issue-[0-9a-f-]{36}$/);
	});
});
