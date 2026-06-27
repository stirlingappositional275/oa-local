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
║          版本: ${VERSION}                                  ║
╚══════════════════════════════════════════════════╝
`);

let failed = false;

// ═══════════════════════════════════════════
// Step 1: Build Server
// ═══════════════════════════════════════════
if (BUILD_ALL || SERVER_ONLY) {
  console.log('━'.repeat(50));
  console.log('📦 [1/3] 构建服务器安装包...');
  console.log('━'.repeat(50));
  
  try {
    const serverDir = path.join(ROOT, 'server');
    execSync(`node build.js --version ${VERSION}`, {
      cwd: serverDir,
      stdio: 'inherit',
    });
    console.log('✅ 服务器安装包构建完成\n');
  } catch (e) {
    console.error('❌ 服务器构建失败:', e.message);
    failed = true;
  }
}

// ═══════════════════════════════════════════
// Step 2: Build Web Client
// ═══════════════════════════════════════════
if (BUILD_ALL || CLIENT_ONLY) {
  console.log('━'.repeat(50));
  console.log('📦 [2/3] 构建 Web 前端...');
  console.log('━'.repeat(50));
  
  try {
    const clientDir = path.join(ROOT, 'client');
    execSync('npm run build', {
      cwd: clientDir,
      stdio: 'inherit',
    });
    console.log('✅ Web 前端构建完成\n');
  } catch (e) {
    console.error('❌ Web 前端构建失败:', e.message);
    failed = true;
  }
}

// ═══════════════════════════════════════════
// Step 3: Build Desktop Client
// ═══════════════════════════════════════════
if (BUILD_ALL || CLIENT_ONLY) {
  console.log('━'.repeat(50));
  console.log('📦 [3/3] 构建桌面客户端...');
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
      console.log('✅ Windows 桌面客户端构建完成');
    } else if (process.platform === 'darwin') {
      execSync('npm run build:mac', { cwd: desktopDir, stdio: 'inherit' });
      console.log('✅ macOS 桌面客户端构建完成');
    } else {
      console.log('⚠️  桌面客户端构建仅支持 Windows 和 macOS');
      console.log('   在目标平台上运行: cd desktop && npm run build:win 或 npm run build:mac');
    }
    console.log('');
  } catch (e) {
    console.error('❌ 桌面客户端构建失败:', e.message);
    console.error('   请确保已安装 electron 和 electron-builder');
    console.error('   cd desktop && npm install && npm run build:win');
    failed = true;
  }
}

// ═══════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════
console.log('═'.repeat(50));
console.log(failed ? '⚠️  部分构建失败，请查看上方日志' : '🎉 全部构建完成！');
console.log('═'.repeat(50));
console.log('');
console.log('输出文件:');
console.log('  服务器:   server/dist-package/oa-server-v' + VERSION + '.zip');
console.log('  Web前端:  client/dist/');
console.log('  桌面端:   desktop/dist-package/');
console.log('');

if (!failed) {
  console.log('部署步骤:');
  console.log('  1. 将 oa-server-v' + VERSION + '.zip 复制到服务器并解压');
  console.log('  2. 双击 install.bat 完成服务器安装');
  console.log('  3. 编辑 .env 配置 Azure AD 和 SMTP');
  console.log('  4. 分发桌面客户端安装包给用户');
  console.log('  5. 用户安装后自动连接服务器');
}

function getArg(name) {
  const idx = process.argv.indexOf(name);
  return idx !== -1 ? process.argv[idx + 1] : null;
}
