# Environment Variables Configuration

This document describes the environment variables used to configure the WAPPOPS server for different deployment environments.

## Environment Variables

### `NODE_ENV`
**Purpose**: Determines the server operation mode  
**Values**: 
- `production` - Production mode (optimized, reduced logging)
- `development` or unset - Development mode (debug logging, colors)

**Default**: `development`

**Example**:
```bash
NODE_ENV=production
```

### `WAPPOPS_CONFIG_PATH`
**Purpose**: Path to the directory containing `config.json`  
**Default**: `../ztest`

**Examples**:
```bash
# Development
WAPPOPS_CONFIG_PATH=../ztest

# Production
WAPPOPS_CONFIG_PATH=/etc/wappops

# Docker
WAPPOPS_CONFIG_PATH=/app/config
```

### `WAPPOPS_PUBLIC_PATH`
**Purpose**: Path to static web files (client app)  
**Default**: `../ztest/public`

**Examples**:
```bash
# Development
WAPPOPS_PUBLIC_PATH=../ztest/public

# Production
WAPPOPS_PUBLIC_PATH=/var/www/wappops

# Docker
WAPPOPS_PUBLIC_PATH=/app/public
```

### `WAPPOPS_LOGS_PATH`
**Purpose**: Path to store log files  
**Default**: `../ztest/logs`

**Examples**:
```bash
# Development
WAPPOPS_LOGS_PATH=../ztest/logs

# Production
WAPPOPS_LOGS_PATH=/var/log/wappops

# Docker
WAPPOPS_LOGS_PATH=/app/logs
```

## Deployment Examples

### Development (.env file)
```bash
NODE_ENV=development
WAPPOPS_CONFIG_PATH=../ztest
WAPPOPS_PUBLIC_PATH=../ztest/public
WAPPOPS_LOGS_PATH=../ztest/logs
```

### Production (systemd service)
```bash
NODE_ENV=production
WAPPOPS_CONFIG_PATH=/etc/wappops
WAPPOPS_PUBLIC_PATH=/var/www/wappops
WAPPOPS_LOGS_PATH=/var/log/wappops
```

### Docker Compose
```yaml
services:
  wappops-server:
    image: wappops-server:latest
    environment:
      NODE_ENV: production
      WAPPOPS_CONFIG_PATH: /app/config
      WAPPOPS_PUBLIC_PATH: /app/public  
      WAPPOPS_LOGS_PATH: /app/logs
    volumes:
      - ./config:/app/config
      - ./public:/app/public
      - ./logs:/app/logs
```

### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: wappops-server
spec:
  template:
    spec:
      containers:
      - name: wappops-server
        image: wappops-server:latest
        env:
        - name: NODE_ENV
          value: "production"
        - name: WAPPOPS_CONFIG_PATH
          value: "/app/config"
        - name: WAPPOPS_PUBLIC_PATH
          value: "/app/public"
        - name: WAPPOPS_LOGS_PATH
          value: "/app/logs"
```

## Migration Guide

### Before (Hardcoded)
```typescript
const devMode = true; // Manual change needed
const devConfigPath = '../ztest';
```

### After (Environment-based)
```typescript
const devMode = process.env.NODE_ENV !== 'production';
const devConfigPath = process.env.WAPPOPS_CONFIG_PATH || '../ztest';
```

### Benefits
- ✅ No source code changes for deployment
- ✅ Same binary works in all environments
- ✅ Standard Docker/container practices
- ✅ Easier CI/CD pipeline configuration
- ✅ Environment-specific path configuration

## Session Storage Impact

With the new environment variables, session files will be stored relative to the configuration path:
- **Development**: `../ztest/api-sessions.json`
- **Production**: `/etc/wappops/api-sessions.json`
- **Docker**: `/app/config/api-sessions.json`

This ensures sessions are stored alongside configuration files in all environments.
