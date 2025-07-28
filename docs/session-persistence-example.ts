/**
 * Session Persistence Usage Example (Updated)
 * 
 * The GuestAPIClient now automatically persists encrypted sessions to disk
 * in the same directory as config.json, ensuring no authentication data 
 * is lost during server restarts.
 */

// Example: Server initialization
const apiClient = new GuestAPIClient(configuration, logger);

// Sessions are automatically loaded from executable/config directory
// Passwords are encrypted using the JWT secret from configuration
// No additional code needed for basic persistence

// Example: Getting session statistics
const stats = apiClient.getSessionsStats();
console.log(`Active sessions: ${stats.valid}, Near expiry: ${stats.nearExpiry}, Expired: ${stats.expired}`);

// Example: Clean shutdown
process.on('SIGTERM', () => {
    // Ensure encrypted sessions are saved before shutdown
    apiClient.destroy();
    process.exit(0);
});

process.on('SIGINT', () => {
    // Ensure encrypted sessions are saved before shutdown
    apiClient.destroy();
    process.exit(0);
});

/**
 * Enhanced Features:
 * 
 * 1. **Secure Storage**: Passwords encrypted with AES-GCM using JWT secret
 * 2. **Better Location**: Sessions stored in config directory (same as config.json)
 * 3. **Automatic Loading**: Encrypted sessions loaded and decrypted on startup
 * 4. **Automatic Saving**: Sessions encrypted and saved every 30 seconds
 * 5. **Key Management**: Uses configuration.security.secret for encryption
 * 6. **Error Handling**: Graceful handling of decryption failures
 * 7. **Cleanup**: Expired sessions automatically removed
 * 8. **Monitoring**: Real-time session statistics via getSessionsStats()
 * 
 * Security Implementation:
 * - AES-GCM encryption with 256-bit keys
 * - PBKDF2 key derivation with 100,000 iterations  
 * - Random 12-byte IV per encryption
 * - Base64 encoding for storage
 * - Memory contains decrypted passwords for operation
 * - Disk storage contains only encrypted passwords
 */
