# Session Persistence Documentation

**Note**: This data directory is no longer used for session storage. Sessions are now stored in the same directory as the server configuration file (`config.json`) for better organization in development mode.

## Current Session Storage

Sessions are now stored as `api-sessions.json` in the executable/configuration directory with the following improvements:

### Security Enhancements
- **Encrypted Passwords**: User passwords are encrypted using AES-GCM with the JWT secret key
- **Secure Storage**: Both in-memory and disk storage use encrypted passwords
- **Key Derivation**: Uses PBKDF2 with 100,000 iterations for secure key derivation

### File Location
- **Development**: Same directory as `config.json`
- **Production**: Same directory as the executable

### File Structure
```json
[
  {
    "username": "user1",
    "password": "AES-GCM_encrypted_base64_string",
    "tokens": {
      "accessToken": "jwt_token",
      "refreshToken": "refresh_token", 
      "expirationDate": "2025-07-28T12:00:00.000Z"
    }
  }
]
```

### Security Features
- **Encryption**: Passwords encrypted with Web Crypto API (AES-GCM)
- **Key Management**: Uses JWT secret from configuration
- **Salt**: Fixed salt 'wappops-sessions' for consistent key derivation
- **IV**: Random 12-byte initialization vector per encryption

### Automatic Management
- Sessions loaded automatically on server startup
- Expired sessions filtered out during load
- Passwords decrypted transparently in memory
- Periodic saves with encrypted passwords
- Cleanup of expired sessions
