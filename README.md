# 🛡️ pi-audit-master

**Professional Multi-Agent Codebase Auditing & Automated Repair Engine**

`pi-audit-master` is a high-precision quality assurance tool for Pi extensions. Instead of generic code reviews, it deploys a coordinated fleet of specialized AI agents to identify critical bugs, logical gaps, and performance bottlenecks using industry-standard analysis techniques.

## 🚀 Core Features

### 🧬 The "Specialized Five" Audit Personas
The engine dispatches five parallel agents, each with a unique mental model:

| Persona | Focus | Technique |
| :--- | :--- | :--- |
| **Type Sentinel** | Null/Undefined Safety | **Taint Analysis**: Tracks data from source $\to$ flow $\to$ sink. |
| **Logic Architect** | Algorithmic Correctness | **State-Machine Analysis**: Finds race conditions and flow gaps. |
| **Performance Oracle** | Efficiency & Scaling | **Complexity Analysis**: Identifies $O(n^2)$ loops and leaks. |
| **Ecosystem Integrator** | Pi API Compatibility | **Contract Analysis**: Verifies Event and Factory patterns. |
| **Quality Guardian** | Maintainability | **Smell Detection**: Finds technical debt and redundant logic. |

### ⚙️ Advanced Capabilities
- **Intelligent Mapping**: The `ProjectMapper` identifies "Core Logic" files to maximize token efficiency and avoid auditing boilerplate.
- **Hybrid Reporting**: Generates a professional `audit-report.md` for the repository and a concise summary for the chat.
- **Automated Fix-Fleet**: Optionally deploys a second wave of "Fixer" agents to resolve identified issues and verifies them via the project's test suite.

## 🛠️ Usage

### Installation
```bash
pi install npm:pi-audit-master
```

### Running an Audit
Invoke the tool via natural language or the direct command:

**Natural Language:**
*"Audit this project and fix any critical bugs."*

**Direct Command:**
```bash
/audit { 
  "path": ".", 
  "depth": "deep", 
  "format": "hybrid", 
  "fix": true 
}
```

### Configuration Options
- **`depth`**: `surface` (entry points only) or `deep` (full core logic scan).
- **`format`**: `chat` (summary only), `file` (markdown report), or `hybrid` (both).
- **`fix`**: `true` (enable automated Fix-Fleet) or `false` (diagnosis only).

## 📈 Pipeline Flow
`Command` $\to$ `Config` $\to$ `Project Mapping` $\to$ `Parallel Audit` $\to$ `Chief Synthesis` $\to$ `(Optional) Fix-Fleet` $\to$ `Verification`.

## 📄 License
MIT
