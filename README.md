# 🛡️ pi-audit-master

**Professional Multi-Agent Codebase Auditing & Automated Repair Engine**

[![Pi Package](https://img.shields.io/badge/Pi-Package-blue)](https://pi.dev/packages)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/pi-audit-master.svg)](https://www.npmjs.com/package/pi-audit-master)

`pi-audit-master` is a high-precision quality assurance tool for Pi extensions. Instead of generic code reviews, it deploys a coordinated fleet of specialized AI agents to identify critical bugs, logical gaps, and performance bottlenecks using industry-standard analysis techniques.

## 🚀 Core Features

### 🧬 The "Specialized Five" Audit Personas

The engine dispatches five parallel agents, each with a unique mental model:

| Persona | Focus | Technique |
| :--- | :--- | :--- |
| **Type Sentinel** | Null/Undefined Safety | **Taint Analysis**: Tracks data from source → flow → sink. |
| **Logic Architect** | Algorithmic Correctness | **State-Machine Analysis**: Finds race conditions and flow gaps. |
| **Performance Oracle** | Efficiency & Scaling | **Complexity Analysis**: Identifies O(n²) loops and leaks. |
| **Ecosystem Integrator** | Pi API Compatibility | **Contract Analysis**: Verifies Event and Factory patterns. |
| **Quality Guardian** | Maintainability | **Smell Detection**: Finds technical debt and redundant logic. |

### ⚙️ Advanced Capabilities

- **Intelligent Mapping**: The `ProjectMapper` identifies "Core Logic" files to maximize token efficiency and avoid auditing boilerplate.
- **Hybrid Reporting**: Generates a professional `audit-report.md` for the repository and a concise summary for the chat.
- **Automated Fix-Fleet**: Optionally deploys a second wave of "Fixer" agents to resolve identified issues and verifies them via the project's test suite.
- **Passive Mode**: Automatically audits files after modifications (v0.4.0+)
- **AI-Powered Analysis**: Uses Pi's `complete()` function for intelligent code review
- **Static Analysis Fallback**: Works offline with pattern-based detection
- **Timeout & Progress**: Configurable timeouts and progress callbacks for long audits (v0.5.0+)
- **Path Traversal Protection**: Input sanitization to prevent path traversal attacks (v0.5.0+)
- **Conservative Magic Number Detection**: Avoids false positives on legitimate constants (v0.5.0+)

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

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `depth` | `"surface" \| "deep"` | `"deep"` | Audit depth. Surface: entry points only. Deep: full core logic scan. |
| `format` | `"chat" \| "file" \| "hybrid"` | `"hybrid"` | Report format. Chat: summary only. File: markdown report. Hybrid: both. |
| `fix` | `boolean` | `false` | Enable automated Fix-Fleet to resolve issues. |
| `timeoutMs` | `number` | `300000` | Optional timeout in milliseconds for the entire audit operation. |
| `onProgress` | `(stage: string, progress: number, total: number) => void` | `undefined` | Optional progress callback for UI updates. |

## 📈 Pipeline Flow

`Command` → `Config` → `Project Mapping` → `Parallel Audit` → `Chief Synthesis` → `(Optional) Fix-Fleet` → `Verification`.

## 📊 Version 0.5.0 Highlights

- **All console output unified through logger utility** — consistent formatting, configurable log levels
- **Timeout mechanism** — prevents hanging audits on large codebases
- **Progress reporting** — callbacks for UI integration
- **Input sanitization** — `sanitizePath()` prevents path traversal
- **Conservative magic number fixes** — avoids false positives on years, ports, HTTP codes, etc.
- **TypeScript `isolatedModules: true`** — eliminated TS151002 warnings

## 📄 License

MIT
