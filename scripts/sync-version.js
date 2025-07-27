#!/usr/bin/env bun

/**
 * Synchronizes version across all workspace packages
 * Usage: bun scripts/sync-version.js [version|patch|minor|major]
 */

import { readFileSync, writeFileSync } from 'fs';

const workspaces = ['wappops-app', 'wappops-server'];

function incrementVersion(currentVersion, type) {
  const parts = currentVersion.split('.');
  const major = parseInt(parts[0]);
  const minor = parseInt(parts[1]);
  const patch = parseInt(parts[2].split('-')[0]);
  const prerelease = parts[2].includes('-') ? '-' + parts[2].split('-')[1] : '';
  
  switch (type) {
    case 'major':
      return `${major + 1}.0.0${prerelease}`;
    case 'minor':
      return `${major}.${minor + 1}.0${prerelease}`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}${prerelease}`;
    default:
      return type; // Assume it's a specific version
  }
}

function syncVersions(versionOrType) {
  // Read root package.json
  const rootPkg = JSON.parse(readFileSync('package.json', 'utf8'));
  
  let newVersion;
  if (versionOrType && ['patch', 'minor', 'major'].includes(versionOrType)) {
    newVersion = incrementVersion(rootPkg.version, versionOrType);
  } else if (versionOrType) {
    newVersion = versionOrType;
  } else {
    newVersion = rootPkg.version; // Just sync existing version
  }
  
  // Update root version if changed
  if (newVersion !== rootPkg.version) {
    rootPkg.version = newVersion;
    writeFileSync('package.json', JSON.stringify(rootPkg, null, 2) + '\n');
    console.log(`✅ Updated root package to version ${newVersion}`);
  }
  
  // Sync all workspace packages
  workspaces.forEach(workspace => {
    const pkgPath = `${workspace}/package.json`;
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    
    if (pkg.version !== newVersion) {
      pkg.version = newVersion;
      writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
      console.log(`✅ Updated ${workspace} to version ${newVersion}`);
    } else {
      console.log(`📋 ${workspace} already at version ${newVersion}`);
    }
  });
  
  console.log(`🎯 All packages synchronized to version ${newVersion}`);
}

// Get version from command line argument
const versionOrType = process.argv[2];
syncVersions(versionOrType);
