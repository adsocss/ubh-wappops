# WAPPOPS Monorepo

This is a Bun monorepo containing the WAPPOPS application ecosystem.

## Structure

- `wappops-app/` - Frontend application built with Lit and Vite
- `wappops-server/` - Backend server built with Bun and TypeScript

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) >= 1.0.0

### Installation

```bash
# Quick setup for development (installs dependencies and sets up config)
bun run dev:setup

# Or manually:
# Install all dependencies for the monorepo
bun install

# Copy the development config file for the server
cp ztest/config.json wappops-server/config.json
```

### Development

```bash
# Start both app and server in development mode
bun run dev

# Start only the frontend app
bun run dev:app

# Start only the backend server
bun run dev:server
```

#### Network Access

Both development servers are configured to accept connections from the network:

- **Frontend**: Accessible from any device on the network (Vite's `host: true`)
- **Backend**: Binds to `0.0.0.0:3000` to accept external connections
- **Mobile Testing**: Use your machine's IP address to access from mobile devices

Example URLs when your machine's IP is `192.168.1.100`:
- Frontend: `http://192.168.1.100:5173/`
- Backend API: `http://192.168.1.100:3000/api/`

The app automatically detects network access and adjusts API calls accordingly.

### Building

```bash
# Build both app and server
bun build-all

# Build only the frontend app
bun build:app

# Build only the backend server (Linux)
bun build:server

# Build backend server for Windows
bun build:server:win
```

> **Note**: The build script was renamed from `build` to `build-all` to avoid conflicts with Bun's built-in bundler command.

### Other Commands

```bash
# Preview the built frontend app
bun run preview:app

# Show development URLs for network access
bun run dev:info

# Clean all build artifacts and node_modules
bun run clean

# Reinstall all dependencies
bun run install:all
```

## Development API Configuration

The monorepo is configured to automatically handle API endpoints based on the environment:

### Development Mode
- **Frontend**: Runs on `http://localhost:5173/` (or next available port)
- **Backend**: Runs on `http://localhost:3000/`
- **API Calls**: Automatically proxied from frontend to backend via Vite proxy
- **Configuration**: Uses empty API URL (relative paths) with Vite handling the proxy

### Production Mode
- **Frontend & Backend**: Served from the same origin
- **API Calls**: Direct calls to the same server
- **Configuration**: Uses `window.location.origin` as API base URL

The API URL is automatically determined based on:
1. `VITE_API_URL` environment variable (if set)
2. Development detection (Vite dev server ports)
3. Fallback to production configuration

## Workspace Management

This monorepo uses Bun workspaces to manage dependencies across packages. Each package maintains its own `package.json` but shares common development dependencies at the root level.

### Adding Dependencies

```bash
# Add a dependency to the root workspace
bun add <package-name>

# Add a dependency to a specific workspace
bun add <package-name> --cwd wappops-app
bun add <package-name> --cwd wappops-server
```

### Running Commands in Workspaces

```bash
# Run a command in a specific workspace
bun run --cwd wappops-app <command>
bun run --cwd wappops-server <command>
```

## Version

Current version: 0.7.0-beta
