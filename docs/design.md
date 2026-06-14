# Design: pi-audit-master

## 1. System Architecture
The system is implemented as a Pi extension that orchestrates subagents. It follows a "Fan-Out/Fan-In" pattern.

### Pipeline Flow
`Command` $\to$ `ConfigManager` $\to$ `ProjectMapper` $\to$ `ParallelAudit` $\to$ `ChiefSynthesizer` $\to$ `(Optional) FixFleet` $\to$ `Verification`.

## 2. Component Design

### A. ConfigManager
Handles user preferences via `ask_user_question`.
- **State**: Stores `depth`, `format`, and `fixFleet` (boolean).
- **Logic**: If no config exists, trigger prompt. Otherwise, use session-saved preferences.

### B. ProjectMapper
Prevents token waste by identifying "Core Logic" vs "Boilerplate".
- **Logic**:
  - Exclude: `node_modules`, `dist`, `.git`, `tests` (unless requested).
  - Prioritize: `.ts`, `.tsx`, `.js` files in `extensions/`, `src/`, `lib/`.
  - Output: A sorted list of file paths for the agents.

### C. The Parallel Audit (The "Specialized Five")
Five subagents are launched with the following constraints:
- **Context**: `fresh` (to avoid parent bias).
- **Input**: List of core files + specialized checklist.

#### Agent Personas & Checklists:
1. **Type Sentinel**:
   - Search for: `any` types, missing null checks on API returns, unsafe casting.
   - Technique: Taint analysis (Source $\to$ Flow $\to$ Sink).
2. **Logic Architect**:
   - Search for: Race conditions in `async` handlers, missing `await`, incorrect loop boundaries.
   - Technique: State-machine violation search.
3. **Performance Oracle**:
   - Search for: $O(n^2)$ loops in large file processing, memory leaks in long-running listeners.
   - Technique: Big-O complexity check.
4. **Ecosystem Integrator**:
   - Search for: Incorrect `pi.on` event names, missing `event.abort()` logic, outdated Extension API usage.
   - Technique: Pi API Contract validation.
5. **Quality Guardian**:
   - Search for: Redundant logic, "Magic Numbers", inconsistent naming, dead code.
   - Technique: Clean Code / SOLID principles.

### D. Chief Synthesizer
The "Fan-In" point.
- **Input**: 5 markdown reports.
- **Logic**: 
  - De-duplicate findings (e.g., if Type Sentinel and Logic Architect both find the same null bug).
  - Assign a unified severity score: `CRITICAL` $\to$ `HIGH` $\to$ `MEDIUM` $\to$ `LOW`.
  - Format into a professional table in `audit-report.md`.

### E. Fix-Fleet (The Loop)
If `fixFleet: true`, the system enters a repair loop:
1. **Dispatch**: One worker per "Critical/High" issue.
2. **Apply**: Worker edits the file.
3. **Verify**: System runs the project's `npm test` or `tsc`.
4. **Loop**: If test fails, the worker tries again. If it passes, the issue is marked `RESOLVED`.

## 3. Data Schema

### Audit Finding
```typescript
interface Finding {
  id: string;
  file: string;
  line: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  fixSuggestion: string;
  agent: string; // Which persona found it
}
```

## 4. Verification Plan
Create a "Buggy-Project" with 10 intentional flaws across the 5 dimensions.
- Success = 100% detection of Critical/High issues.
- Success = 0% false positives on UUIDs/Paths.
- Success = All Criticals resolved by Fix-Fleet and verified by tests.
