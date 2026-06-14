# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0] - 2026-06-14
### Stability & TUI Integration
- **TUI Visibility**: Added `registerCommand` to make `/audit` visible in the Pi command palette.
- **Packaging Fix**: Switched to source-shipping (`./extensions`) to ensure seamless loading via Pi's jiti runtime.
- **Runtime Fix**: Updated factory function to `async` for compatibility with latest Pi extension loader.
- **LSP Clean**: Resolved type mismatch issues for `ExtensionAPI` and `UIContext`.

## [0.1.0] - 2026-06-14
### Initial Release
- Implemented a multi-agent parallel audit framework.
- Added 5 specialized audit personas (Type, Logic, Performance, Integration, Quality).
- Implemented `ProjectMapper` for intelligent codebase mapping.
- Added `AuditSynthesizer` for professional report generation.
- Implemented `FixFleet` for automated issue resolution.
- Added comprehensive verification suite with "Buggy Project" tests.
