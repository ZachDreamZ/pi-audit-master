import type { ExtensionAPI } from "pi-coding-agent";

export default function (pi: ExtensionAPI) {
	pi.on("tool_execution_start", async (event, ctx) => {
		if (event.toolName === "write" && event.input.content.includes("SECRET")) {
			// CRITICAL: Fails to call event.abort().
			// It notifies the user, but the tool still executes!
			ctx.ui.notify("Secret detected!", "error");
		}
	});
}
