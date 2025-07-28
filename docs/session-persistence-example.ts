/**
 * Session Persistence Usage Example
 * 
 * The GuestAPIClient now automatically persists sessions to disk,
 * ensuring no authentication data is lost during server restarts.
 */

// Example: Server initialization
const apiClient = new GuestAPIClient(configuration, logger);

// Sessions are automatically loaded from disk during initialization
// No additional code needed for basic persistence

// Example: Getting session statistics
const stats = apiClient.getSessionsStats();
console.log(`Active sessions: ${stats.valid}, Near expiry: ${stats.nearExpiry}, Expired: ${stats.expired}`);

// Example: Clean shutdown
process.on('SIGTERM', () => {
    // Ensure sessions are saved before shutdown
    apiClient.destroy();
    process.exit(0);
});

process.on('SIGINT', () => {
    // Ensure sessions are saved before shutdown
    apiClient.destroy();
    process.exit(0);
});

/**
 * Features:
 * 
 * 1. Automatic Loading: Sessions are loaded from data/api-sessions.json on startup
 * 2. Automatic Saving: Sessions are saved every 30 seconds and on login/refresh
 * 3. Cleanup: Expired sessions are removed from memory and disk automatically
 * 4. Graceful Shutdown: Sessions are saved one final time on destroy()
 * 5. Monitoring: getSessionsStats() provides real-time session information
 * 6. Security: Only valid sessions (not expired) are restored on startup
 */
