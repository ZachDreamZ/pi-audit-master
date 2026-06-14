# Changelog

## [0.3.0] - 2026-06-14
### Major Stability & Error Handling Overhaul

#### Bug Fixes (21 total)
- **CRITICAL**: Fixed `this.pi.subagents.parallel` non-existent API call. Now returns a clear stub with warning.
- **CRITICAL**: Fixed CJS-style `import * as fs from "fs"` to Node.js ESM `node:fs` and `node:path`.
- **HIGH**: Replaced `Math.random().toString(36).substr(2, 9)` IDs with `crypto.randomUUID()` (collision-resistant).
- **HIGH**: Fixed Windows path parsing — use `lastIndexOf(":")` to correctly handle `C:\path\file.ts:42`.
- **HIGH**: Fixed line number validation — now uses `parseInt` + `Number.isNaN` check + clamping to 0 minimum.
- **HIGH**: Fixed severity counting to only count finding lines (was counting the word "CRITICAL" in summary text).
- **HIGH**: Fixed `FixFleet` to honestly return `FAILED` instead of lying with a fake `RESOLVED`.
- **HIGH**: Removed emoji `🛡️` from the report heading (user requested no emojis).
- **MEDIUM**: Fixed report path — now written to the AUDITED project's directory, not `process.cwd()`.
- **MEDIUM**: Fixed symlink loops in `ProjectMapper` — now detects and skips symbolic links.
- **MEDIUM**: Added `ENOTDIR`, `EACCES` error handling to `readdirSync` calls.
- **MEDIUM**: Added `MAX_DEPTH` limit to prevent runaway recursion in project mapping.
- **MEDIUM**: Added file readability check (`fs.accessSync` with `R_OK`) before including files.
- **MEDIUM**: Improved deduplication — normalizes whitespace and case in dedup keys.
- **MEDIUM**: Fixed dead code in `resolveConfig` (input validation now strict).
- **MEDIUM**: Fixed pipe escaping in finding content (preserves markdown table structure).
- **LOW**: Replaced deprecated `substr` with `substring`.
- **LOW**: Fixed `0` line numbers being silently swallowed.

#### New Features
- **New `util.ts` module**: Shared utilities (`generateId`, `parseFileLine`, `safeWriteFile`, `findingDedupKey`).
- **Input validation**: All tool handlers now validate inputs and return clean error responses.
- **Defensive coding**: `synthesize()` handles null/undefined report inputs gracefully.
- **Honest stub warnings**: `dispatchAuditAgents` and `FixFleet` log clear messages about their limitations.

#### Test Coverage
- Expanded from 9 tests to **39 tests** across 6 test suites.
- New: `tests/util.test.ts` (13 tests)
- New: `tests/synthesizer.test.ts` (8 tests)
- New: `tests/project-mapper.test.ts` (7 tests)
- New: `tests/fix-fleet.test.ts` (4 tests)
- New: `tests/audit-manager.test.ts` (5 tests)
- Updated: `tests/verify-audit.test.ts` (2 tests, with honest expectations)

## [0.2.0] - 2026-06-14
### Professionalization Release
- Source-shipping pattern (`./extensions`)
- TUI visibility (`/audit` command)
- Modern async factory function
- LSP clean

## [0.1.0] - 2026-06-14
### Initial Release
- Multi-agent parallel audit framework
- 5 specialized audit personas
- ProjectMapper for intelligent codebase mapping
- AuditSynthesizer for professional report generation
- FixFleet for automated issue resolution
- Comprehensive verification suite
