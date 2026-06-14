import type { ExtensionAPI } from 'pi-coding-agent';

export default function (pi: ExtensionAPI) {
    // CRITICAL: Wrong event name. Should be 'tool_execution_start'.
    pi.on('tool_execution_started', async (event, ctx) => {
        if (event.toolName === 'delete_everything') {
            ctx.ui.notify('Danger!', 'error');
            // HIGH: Forgets to call event.abort(). Tool will execute anyway.
        }
    });
}
