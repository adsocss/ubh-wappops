# Data Directory

This directory contains persistent data files for the WAPPOPS server.

## Files

- `api-sessions.json` - Persisted API sessions for the Guest PMS client
  - Contains encrypted tokens and user credentials
  - Automatically managed by GuestAPIClient
  - Sessions are cleaned up when expired
  - **DO NOT commit this file to version control**

## Structure

The session file contains an array of serialized sessions:

```json
[
  {
    "username": "user1",
    "password": "encrypted_password",
    "tokens": {
      "accessToken": "jwt_token",
      "refreshToken": "refresh_token",
      "expirationDate": "2025-07-28T12:00:00.000Z"
    }
  }
]
```

## Maintenance

- Sessions are automatically saved every 30 seconds
- Expired sessions are cleaned up during save operations
- Sessions are loaded automatically on server startup
- Manual cleanup can be triggered via the API client methods
