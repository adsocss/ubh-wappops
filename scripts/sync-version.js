#!/usr/bin/env node

/**
 * Synchronizes version across all workspace packages
 * Usage: node scripts/sync-version.js [version]
 */

import { readFileSync, writeFileSync } from 'fs';

const workspaces = ['wappops-app', 'wappops-server'];

function syncVersions(newVersion) {
  // Read root package.json
  const rootPkg = JSON.parse(readFileSync('package.json', 'utf8'));
  
  // Update root version if provided
  if (newVersion) {
    rootPkg.version = newVersion;
    writeFileSync('package.json', JSON.stringify(rootPkg, null, 2) + '\n');
    console.log(`✅ Updated root package to version ${newVersion}`);
  }
  
  // Sync all workspace packages
  workspaces.forEach(workspace => {
    const pkgPath = `${workspace}/package.json`;
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    
    if (pkg.version !== rootPkg.version) {
      pkg.version = rootPkg.version;
      writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
      console.log(`✅ Updated ${workspace} to version ${rootPkg.version}`);
    } else {
      console.log(`📋 ${workspace} already at version ${rootPkg.version}`);
    }
  });
  
  console.log(`🎯 All packages synchronized to version ${rootPkg.version}`);
}

// Get version from command line argument
const newVersion = process.argv[2];
syncVersions(newVersion);
