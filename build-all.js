#!/usr/bin/env node
/**
 * OA Local - Unified Build All Script
 * 
 * Builds and packages everything:
 * 1. Server → oa-server-v{version}.zip (distributable server package)
 * 2. Client Web → client/dist/ (React production build)
 * 3. Desktop → desktop/dist-package/ (Win/Mac installers)
 *
 * Usage:
 *   node build-all.js                    # Build all
 *   node build-all.js --server-only      # Server only
 *   node build-all.js --client-only      # Client (web + desktop) only
 *   node build-all.js --version 1.0.0    # Set version
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = __dirname;
const VERSION = getArg('--version') || '1.0.0';
const SERVER_ONLY = process.argv.includes('--server-only');
const CLIENT_ONLY = process.argv.includes('--client-only');
const BUILD_ALL = !SERVER_ONLY && !CLIENT_ONLY;

console.log(`
╔══════════════════════════════════════════════════╗
║          OA 审批系统 - 统一构建工具                ║
║          Version: ${VERSION}                                  ║
╚══════════════════════════════════════════════════╝
`);

let failed = false;

// ═══════════════════════════════════════════
// Step 1: Build Server
// ═══════════════════════════════════════════
if (BUILD_ALL || SERVER_ONLY) {
  console.log('━'.repeat(50));
  console.log('📦 [1/3] Building server package...');
  console.log('━'.repeat(50));
  
  try {
    const serverDir = path.join(ROOT, 'server');
    execSync(`node build.js --version ${VERSION}`, {
      cwd: serverDir,
      stdio: 'inherit',
    });
    console.log('✅ Server install构建完成\n');
  } catch (e) {
    console.error('❌ Server build failed:', e.message);
    failed = true;
  }
}

// ═══════════════════════════════════════════
// Step 2: Build Web Client
// ═══════════════════════════════════════════
if (BUILD_ALL || CLIENT_ONLY) {
  console.log('━'.repeat(50));
  console.log('📦 [2/3] Building Web frontend...');
  console.log('━'.repeat(50));
  
  try {
    const clientDir = path.join(ROOT, 'client');
    execSync('npm run build', {
      cwd: clientDir,
      stdio: 'inherit',
    });
    console.log('✅ Web frontend built\n');
  } catch (e) {
    console.error('❌ Web frontend build failed:', e.message);
    failed = true;
  }
}

// ═══════════════════════════════════════════
// Step 3: Build Desktop Client
// ═══════════════════════════════════════════
if (BUILD_ALL || CLIENT_ONLY) {
  console.log('━'.repeat(50));
  console.log('📦 [3/3] Building desktop client...');
  console.log('━'.repeat(50));
  
  try {
    const desktopDir = path.join(ROOT, 'desktop');
    
    // Update version in package.json
    const packPath = path.join(desktopDir, 'package.json');
    const packJson = JSON.parse(fs.readFileSync(packPath, 'utf8'));
    packJson.version = VERSION;
    fs.writeFileSync(packPath, JSON.stringify(packJson, null, 2));
    
    // Check platform
    if (process.platform === 'win32') {
      execSync('npm run build:win', { cwd: desktopDir, stdio: 'inherit' });
      console.log('✅ Windows Desktop client built');
    } else if (process.platform === 'darwin') {
      execSync('npm run build:mac', { cwd: desktopDir, stdio: 'inherit' });
      console.log('✅ macOS Desktop client built');
    } else {
      console.log('⚠️  Desktop build only available on Windows and macOS');
      console.log('   在目标平台上运行: cd desktop && npm run build:win 或 npm run build:mac');
    }
    console.log('');
  } catch (e) {
    console.error('❌ Desktop client build failed:', e.message);
    console.error('   Please install electron and electron-builder');
    console.error('   cd desktop && npm install && npm run build:win');
    failed = true;
  }
}

// ═══════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════
console.log('═'.repeat(50));
console.log(failed ? '⚠️  Some builds failed，请查看上方日志' : '🎉 Build complete！');
console.log('═'.repeat(50));
console.log('');
console.log('Output files:');
console.log('  Server:   server/dist-package/oa-server-v' + VERSION + '.zip');
console.log('  Web frontend:  client/dist/');
console.log('  Desktop:   desktop/dist-package/');
console.log('');

if (!failed) {
  console.log('Deployment steps:');
  console.log('  1. Copy oa-server-v' + VERSION + '.zip to server and extract');
  console.log('  2. Double-click install.bat to install');
  console.log('  3. Edit .env to configure Azure AD and SMTP');
  console.log('  4. 分发桌面客户端Package给用户');
  console.log('  5. Users connect to server automatically');
}

function getArg(name) {
  const idx = process.argv.indexOf(name);
  return idx !== -1 ? process.argv[idx + 1] : null;
}
