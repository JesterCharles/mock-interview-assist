export async function register() {
    // Only run the setup logic on the Node.js server, not in Edge functions
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { assertProductionEnv } = await import('./lib/env');
        assertProductionEnv();

        const { runCleanupJob } = await import('./lib/cleanupService');
        
        // Execute a garbage collection / cleanup immediately on boot
        runCleanupJob();
        
        // Create an interval to run cleanup every 12 hours
        const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
        setInterval(() => {
            runCleanupJob();
        }, TWELVE_HOURS_MS);
    }
}
