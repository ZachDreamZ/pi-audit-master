// Logger utility for pi-audit-master.

const PREFIX = "[pi-audit-master]";

export enum LogLevel {
	SILENT = 0,
	ERROR = 1,
	WARN = 2,
	INFO = 3,
	DEBUG = 4,
}

let currentLevel: LogLevel = LogLevel.INFO;

export function setLogLevel(level: LogLevel): void {
	currentLevel = level;
}

export function getLogLevel(): LogLevel {
	return currentLevel;
}

export function logInfo(message: string): void {
	if (currentLevel >= LogLevel.INFO) {
		console.log(`${PREFIX} ${message}`);
	}
}

export function logWarn(message: string): void {
	if (currentLevel >= LogLevel.WARN) {
		console.warn(`${PREFIX} ${message}`);
	}
}

export function logError(message: string): void {
	if (currentLevel >= LogLevel.ERROR) {
		console.error(`${PREFIX} ${message}`);
	}
}

export function logDebug(message: string): void {
	if (
		currentLevel >= LogLevel.DEBUG ||
		process.env.PI_DEBUG === "1" ||
		process.env.PI_AUDIT_MASTER_DEBUG === "1"
	) {
		console.log(`${PREFIX} [DEBUG] ${message}`);
	}
}
