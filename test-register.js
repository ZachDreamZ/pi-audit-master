// Test script to verify tool registration works
const path = require("path");
const fs = require("fs");

// Load the compiled extension module
const extPath = path.join(__dirname, "dist", "extensions", "index.js");
console.log("Loading extension from:", extPath);

if (!fs.existsSync(extPath)) {
	console.error("ERROR: dist/extensions/index.js not found!");
	console.error("Run: npm run build");
	process.exit(1);
}

// Check package.json for keys
const pkg = require("./package.json");
console.log("\n--- package.json check ---");
console.log("name:", pkg.name);
console.log("version:", pkg.version);
console.log("keywords:", pkg.keywords);
console.log("pi manifest:", JSON.stringify(pkg.pi));
console.log("main field:", pkg.main || "(none)");
console.log("files:", pkg.files);

// Create a mock Pi API
const registeredTools = [];

const mockPi = {
	registerTool: (config) => {
		console.log("\n--- registerTool called! ---");
		console.log("Tool name:", config.name);
		console.log("Has handler:", typeof config.handler === "function");
		console.log("Has parameters:", !!config.parameters);
		registeredTools.push(config);
	},
	subagents: {
		parallel: async (opts) => {
			console.log("subagents.parallel called (mock)");
			return [];
		},
	},
	events: {
		on: (name, handler) => {
			console.log("events.on called for:", name);
		},
	},
};

// Load the module
try {
	const ext = require(extPath);
	console.log("\n--- Module loaded successfully ---");
	console.log("Module exports:", Object.keys(ext));
	console.log("default export type:", typeof ext.default);

	if (typeof ext.default === "function") {
		console.log("\n--- Calling factory function ---");
		let result;
		if (ext.default.constructor.name === "AsyncFunction") {
			console.log("Factory is async");
			result = ext.default(mockPi);
		} else {
			console.log("Factory is sync");
			result = ext.default(mockPi);
		}

		if (result instanceof Promise) {
			result
				.then(() => {
					console.log("\n--- Factory completed (async) ---");
					console.log("Tools registered:", registeredTools.length);
					registeredTools.forEach((t) => console.log("  -", t.name));
				})
				.catch((err) => {
					console.error("\n--- Factory failed ---");
					console.error(err);
				});
		} else {
			console.log("\n--- Factory completed (sync) ---");
			console.log("Tools registered:", registeredTools.length);
			registeredTools.forEach((t) => console.log("  -", t.name));
		}
	} else {
		console.log("ERROR: No default export function found!");
		process.exit(1);
	}
} catch (err) {
	console.error("\n--- Failed to load module ---");
	console.error(err);
	process.exit(1);
}
