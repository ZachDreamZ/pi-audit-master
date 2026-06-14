// pi-integration.ts
pi.on("tool_execution_started", async (event, ctx) => {
	// CRITICAL: Wrong event name (started vs start)
	console.log("Intercepting...");
});

pi.on("tool_execution_start", async (event, ctx) => {
	if (event.toolName === "write") {
		// CRITICAL: Missing event.abort() to block write
		ctx.ui.notify("Secret detected!", "error");
	}
});
