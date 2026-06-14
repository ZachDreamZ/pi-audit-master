export default function (pi: any) {
    // HIGH: Wrong event name 'tool_execution_started' instead of 'tool_execution_start'
    pi.on('tool_execution_started', (event: any, ctx: any) => {
        console.log('Intercepted!');
        // Missing event.abort() for a blocking middleware
    });
}
