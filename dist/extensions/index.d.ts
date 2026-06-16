import type { ExtensionAPI } from "pi-coding-agent";
/**
 * pi-audit-master
 * Professional multi-agent auditing and repair engine.
 *
 * v0.4.0 Features:
 * - Active audit via /audit command
 * - Passive mode: auto-audit on file changes
 * - Integration with other Pi packages
 */
export default function piAuditMaster(pi: ExtensionAPI): Promise<void>;
