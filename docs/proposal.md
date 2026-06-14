# Proposal: pi-audit-master

## 1. Objective
`pi-audit-master` is a high-precision auditing tool for Pi extensions. It automates the "5-Dimension Audit" workflow to identify critical bugs, logical gaps, and performance bottlenecks before they reach production.

## 2. Core Workflow
The tool operates as a pipeline:
1. **Configuration**: User selects Audit Depth, Report Format, and Fix-Fleet preference.
2. **Mapping**: The tool maps the codebase and identifies "Core Logic" files.
3. **Execution**: 5 specialized subagents audit the core in parallel.
4. **Synthesis**: A "Chief Auditor" agent consolidates findings into a `audit-report.md`.
5. **Resolution (Optional)**: A "Fix-Fleet" of agents applies fixes and verifies them via the project's test suite.

## 3. The Audit Personas
Each agent is given a specialized "Checklist" and "Mental Model":

| Persona | Focus | Key Technique |
| :--- | :--- | :--- |
| **Type Sentinel** | Null/Undefined safety | **Taint Analysis**: Track source $\to$ flow $\to$ sink. |
| **Logic Architect** | Algorithmic correctness | **Edge-Case Synthesis**: Find state-machine violations. |
| **Performance Oracle** | Efficiency & Scaling | **Complexity Analysis**: Identify $O(n^2)$ or memory leaks. |
| **Ecosystem Integrator** | Pi API Compatibility | **Contract Analysis**: Verify event usage and factory patterns. |
| **Quality Guardian** | Maintainability | **Smell Detection**: Find redundant logic and technical debt. |

## 4. Interactive Configuration Options
The tool will prompt the user for the following:

### A. Audit Depth
- `Surface`: Audit only specified files.
- `Deep`: Audit the entire project, prioritizing core logic.

### B. Report Format
- `Chat`: High-density summary in the chat.
- `File`: Detailed `audit-report.md` in the root.
- `Hybrid`: Both.

### C. Fix-Fleet
- `Off`: Diagnosis only.
- `On`: Automated fix deployment followed by test verification.

## 5. Technical Implementation
- **Language**: TypeScript / Node.js.
- **Orchestration**: `pi-subagents` for parallel execution.
- **Input**: Target directory path.
- **Output**: `audit-report.md` and chat summary.

## 6. Acceptance Criteria
- [ ] User can configure the audit mode via prompts.
- [ ] All 5 agents execute in parallel and return structured reports.
- [ ] The Chief Auditor removes duplicates and sorts by severity.
- [ ] The "Fix-Fleet" can resolve at least 80% of "Medium/High" issues without regressions.
- [ ] The process is fully logged in the session context.
