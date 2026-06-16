// Shared utility functions for pi-audit-master.

import { randomUUID } from "node:crypto";
import { logError } from "./logger";

/**
 * Generate a collision-resistant ID for a finding or issue.
 */
export function generateId(prefix: string = "find"): string {
	return `${prefix}-${randomUUID()}`;
}

/**
 * Parse a "file:line" string into separate parts, handling Windows paths.
 * @param input The "file:line" string (e.g., "src/auth.ts:42" or "C:\path\file.ts:42")
 * @returns A tuple of [file, lineNumber] where lineNumber is 0 if invalid.
 */
export function parseFileLine(input: string): { file: string; line: number } {
	const trimmed = input.trim();
	// Find the last colon (handles Windows paths like C:\foo\bar.ts:42)
	const lastColon = trimmed.lastIndexOf(":");
	if (lastColon === -1) {
		return { file: trimmed, line: 0 };
	}
	const file = trimmed.substring(0, lastColon);
	const lineStr = trimmed.substring(lastColon + 1);
	const line = parseInt(lineStr, 10);
	return {
		file: file.trim() || "unknown",
		line: Number.isNaN(line) ? 0 : Math.max(0, line),
	};
}

/**
 * Safely write a file with error handling. Returns true on success, false on failure.
 */
export function safeWriteFile(filePath: string, content: string): boolean {
	try {
		const fs = require("node:fs") as typeof import("node:fs");
		fs.writeFileSync(filePath, content, "utf8");
		return true;
	} catch (err) {
		logError(`Failed to write file ${filePath}: ${(err as Error).message}`);
		return false;
	}
}

/**
 * Create a deduplication key from a finding's properties.
 */
export function findingDedupKey(
	file: string,
	line: number,
	description: string,
): string {
	// Normalize: trim, collapse whitespace, lowercase
	const normFile = file.trim().toLowerCase();
	const normDesc = description.trim().replace(/\s+/g, " ").toLowerCase();
	return `${normFile}:${line}:${normDesc}`;
}
