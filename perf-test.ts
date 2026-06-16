/**
 * Performance Tests for pi-audit-master
 * Tests: Project mapping, report synthesis, fix dispatch, and agent dispatch
 */

import { ProjectMapper } from "./extensions/project-mapper";
import { AuditSynthesizer } from "./extensions/synthesizer";
import { FixFleet } from "./extensions/fix-fleet";
import { AuditManager } from "./extensions/audit-manager";
import * as fs from "node:fs";
import * as path from "node:path";

interface PerfResult {
  name: string;
  iterations: number;
  totalTime: number;
  avgTime: number;
  opsPerSec: number;
}

function formatTime(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

async function benchmark(
  name: string,
  fn: () => Promise<void> | void,
  iterations: number = 100,
): Promise<PerfResult> {
  // Warmup
  for (let i = 0; i < Math.min(10, iterations); i++) {
    await fn();
  }

  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    await fn();
  }
  const totalTime = performance.now() - start;
  const avgTime = totalTime / iterations;
  const opsPerSec = (1000 / avgTime) * iterations;

  return { name, iterations, totalTime, avgTime, opsPerSec };
}

async function runPerformanceTests() {
  console.log("🚀 Starting Performance Tests for pi-audit-master\n");

  const results: PerfResult[] = [];

  // Test 1: Project Mapping - Surface
  console.log("📊 Test 1: Project Mapping (Surface)");
  const mapper = new ProjectMapper(".");
  const surfaceResult = await benchmark(
    "ProjectMapper.surface",
    async () => {
      await mapper.mapCoreLogic("surface");
    },
    50,
  );
  results.push(surfaceResult);
  console.log(
    `  ✓ ${surfaceResult.iterations} iterations in ${formatTime(surfaceResult.totalTime)}`,
  );
  console.log(`  ✓ Average: ${formatTime(surfaceResult.avgTime)}/call`);
  console.log(`  ✓ Throughput: ${Math.round(surfaceResult.opsPerSec)} calls/sec\n`);

  // Test 2: Project Mapping - Deep
  console.log("📊 Test 2: Project Mapping (Deep)");
  const deepResult = await benchmark(
    "ProjectMapper.deep",
    async () => {
      await mapper.mapCoreLogic("deep");
    },
    20,
  );
  results.push(deepResult);
  console.log(
    `  ✓ ${deepResult.iterations} iterations in ${formatTime(deepResult.totalTime)}`,
  );
  console.log(`  ✓ Average: ${formatTime(deepResult.avgTime)}/call`);
  console.log(`  ✓ Throughput: ${Math.round(deepResult.opsPerSec)} calls/sec\n`);

  // Test 3: Report Synthesis
  console.log("📊 Test 3: Report Synthesis");
  const synthesizer = new AuditSynthesizer(".");
  const mockReports = [
    `# Type Sentinel Audit\n\n| CRITICAL | src/auth.ts:42 | Missing null check | Add guard |\n| HIGH | src/api.ts:10 | Unsafe cast | Remove as any |\n`,
    `# Logic Architect Audit\n\n| MEDIUM | src/utils.ts:55 | Race condition | Use mutex |\n| LOW | src/index.ts:20 | Unused variable | Remove |\n`,
  ];
  const synthResult = await benchmark(
    "AuditSynthesizer.synthesize",
    async () => {
      await synthesizer.synthesize(mockReports);
    },
    100,
  );
  results.push(synthResult);
  console.log(
    `  ✓ ${synthResult.iterations} iterations in ${formatTime(synthResult.totalTime)}`,
  );
  console.log(`  ✓ Average: ${formatTime(synthResult.avgTime)}/call`);
  console.log(`  ✓ Throughput: ${Math.round(synthResult.opsPerSec)} calls/sec\n`);

  // Test 4: Fix Fleet Parsing
  console.log("📊 Test 4: Fix Fleet Issue Parsing");
  const fixFleet = new FixFleet({} as any);
  const mockReport = `# Audit Report\n\n| CRITICAL | src/auth.ts:42 | Missing null check | Add guard |\n| HIGH | src/api.ts:10 | Unsafe cast | Remove as any |\n| MEDIUM | src/utils.ts:55 | Race condition | Use mutex |\n`.repeat(
    10,
  );
  const fixResult = await benchmark(
    "FixFleet.parseCriticalIssues",
    async () => {
      (fixFleet as any).parseCriticalIssues(mockReport);
    },
    200,
  );
  results.push(fixResult);
  console.log(
    `  ✓ ${fixResult.iterations} iterations in ${formatTime(fixResult.totalTime)}`,
  );
  console.log(`  ✓ Average: ${formatTime(fixResult.avgTime)}/call`);
  console.log(`  ✓ Throughput: ${Math.round(fixResult.opsPerSec)} calls/sec\n`);

  // Test 5: Agent Dispatch (mock)
  console.log("📊 Test 5: Agent Prompt Loading");
  const { AGENT_PROMPTS } = await import("./extensions/types");
  const agentResult = await benchmark(
    "AGENT_PROMPTS.load",
    () => {
      const personas = Object.keys(AGENT_PROMPTS);
      for (const persona of personas) {
        const prompt = AGENT_PROMPTS[persona];
        if (!prompt) throw new Error(`Missing prompt for ${persona}`);
      }
    },
    1000,
  );
  results.push(agentResult);
  console.log(
    `  ✓ ${agentResult.iterations} iterations in ${formatTime(agentResult.totalTime)}`,
  );
  console.log(`  ✓ Average: ${formatTime(agentResult.avgTime)}/call`);
  console.log(`  ✓ Throughput: ${Math.round(agentResult.opsPerSec)} calls/sec\n`);

  // Summary
  console.log("=" .repeat(60));
  console.log("📊 Performance Summary\n");
  console.log("Test".padEnd(35) + "Avg Time".padEnd(15) + "Ops/sec");
  console.log("-".repeat(60));
  for (const r of results) {
    console.log(
      r.name.padEnd(35) +
        formatTime(r.avgTime).padEnd(15) +
        Math.round(r.opsPerSec).toString(),
    );
  }
  console.log("=".repeat(60));

  // Performance assertions
  console.log("\n✅ Performance Assertions:");
  const assertions = [
    { name: "Surface mapping", result: surfaceResult, maxMs: 100 },
    { name: "Deep mapping", result: deepResult, maxMs: 500 },
    { name: "Report synthesis", result: synthResult, maxMs: 50 },
    { name: "Fix parsing", result: fixResult, maxMs: 10 },
    { name: "Agent loading", result: agentResult, maxMs: 1 },
  ];

  let allPassed = true;
  for (const a of assertions) {
    const passed = a.result.avgTime < a.maxMs;
    console.log(`  ${passed ? "✅" : "❌"} ${a.name}: ${formatTime(a.result.avgTime)} < ${a.maxMs}ms`);
    if (!passed) allPassed = false;
  }

  console.log(
    `\n${allPassed ? "✅ All performance tests passed!" : "❌ Some performance tests failed!"}`,
  );
}

runPerformanceTests().catch(console.error);
