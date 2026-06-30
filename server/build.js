/**
 * OA Server - Build & Package Script
 * 
 * Creates a distributable server package:
 * 1. Compiles TypeScript → dist/
 * 2. Packages into oa-server-{version}.zip
 * 3. Generates Windows installer script (install.bat)
 * 4. Optionally downloads portable Node.js for fully offline deployment
 * 
 * Usage: node build.js [--portable] [--version 1.0.0]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { createWriteStream } = require('fs');
const https = require('https');
const http = require('http');
const { pipeline } = require('stream/promises');

const ROOT = path.resolve(__dirname);
const DIST = path.join(ROOT, 'dist-package');
const VERSION = process.argv.includes('--version') 
  ? process.argv[process.argv.indexOf('--version') + 1] 
  : '1.0.0';
const PORTABLE = process.argv.includes('--portable');

const PACKAGE_NAME = `oa-server-v${VERSION}`;
const PACKAGE_DIR = path.join(DIST, PACKAGE_NAME);

// ━━ Step 1: Compile TypeScript ━━
console.log('📦 Step 1: Compiling TypeScript...');
try {
  execSync('npx tsc', { cwd: ROOT, stdio: 'inherit' });
  console.log('  ✅ TypeScript compiled to dist/');
} catch (e) {
  console.error('  ❌ TypeScript compilation failed');
  process.exit(1);
}

// ━━ Step 2: Create package directory ━━
console.log('📦 Step 2: Creating package directory...');
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(PACKAGE_DIR, { recursive: true });

// Copy compiled files
const distSrc = path.join(ROOT, 'dist');
const distDest = path.join(PACKAGE_DIR, 'dist');
copyDir(distSrc, distDest);

// Copy package.json and .env.example
fs.copyFileSync(path.join(ROOT, 'package.json'), path.join(PACKAGE_DIR, 'package.json'));
fs.copyFileSync(path.join(ROOT, '.env.example'), path.join(PACKAGE_DIR, '.env.example'));

// Create minimal package.json for production (remove devDeps before install)
const packJson = JSON.parse(fs.readFileSync(path.join(PACKAGE_DIR, 'package.json'), 'utf8'));
delete packJson.devDependencies;
packJson.scripts = {
  start: 'node dist/index.js',
  'setup': 'node setup.js',
};
fs.writeFileSync(path.join(PACKAGE_DIR, 'package.json'), JSON.stringify(packJson, null, 2));

// Create data and uploads directories
fs.mkdirSync(path.join(PACKAGE_DIR, 'data'), { recursive: true });
fs.mkdirSync(path.join(PACKAGE_DIR, 'uploads'), { recursive: true });

console.log('  ✅ Package directory created');

// ━━ Step 3: Create setup script ━━
console.log('📦 Step 3: Creating setup script...');

const setupJs = `
/**
 * OA Server - First-run Setup
 * Generates .env with random secrets if not exists
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const envPath = path.join(__dirname, '.env');
const envExample = path.join(__dirname, '.env.example');

if (!fs.existsSync(envPath)) {
  console.log('🔧 First run detected. Generating .env with secure random keys...');
  
  let envContent = fs.readFileSync(envExample, 'utf8');
  
  // Generate random secrets
  const jwtSecret = crypto.randomBytes(32).toString('hex');
  const dbKey = crypto.randomBytes(32).toString('hex');
  const federationKey = 'sk-' + crypto.randomBytes(24).toString('hex');
  
  envContent = envContent
    .replace('your-jwt-secret-at-least-32-chars', jwtSecret)
    .replace('your-db-encryption-key-at-least-32-chars', dbKey)
    .replace('sk-change-me-to-random-string', federationKey);
  
  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env file created with secure random keys.');
  console.log('⚠️  Please edit .env to set MSAL_CLIENT_ID, MSAL_TENANT_ID, MSAL_CLIENT_SECRET');
  console.log('⚠️  Keep DB_ENCRYPTION_KEY safe — without it, encrypted data is unrecoverable.');
} else {
  console.log('✅ .env already exists, skipping generation.');
}
`;
fs.writeFileSync(path.join(PACKAGE_DIR, 'setup.js'), setupJs.trim());
console.log('  ✅ setup.js created');

// ━━ Step 4: Create Windows install.bat ━━
console.log('📦 Step 4: Creating Windows installer...');

const installBat = `@echo off
chcp 65001 >nul
title OA Approval System - Server Setup

echo.
echo ╔══════════════════════════════════════════════╗
echo ║     OA 审批系统 - 服务器安装程序              ║
echo ║     Version: ${VERSION}                                  ║
echo ╚══════════════════════════════════════════════╝
echo.

:: Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ 未找到 Node.js，请先Install Node.js 20+
    echo    Download: https://nodejs.org
    pause
    exit /b 1
)

echo ✅ Node.js Version:
node --version
echo.

:: Install dependencies
echo 📦 Installing dependencies...
call npm install --production --no-audit --no-fund
if %ERRORLEVEL% neq 0 (
    echo ❌ Dependency install failed
    pause
    exit /b 1
)
echo ✅ Dependencies installed
echo.

:: Run setup
echo 🔧 Initial configuration...
node setup.js
echo.

:: Ask for service installation
echo.
echo ┌──────────────────────────────────────────────┐
echo │  Install Options                                      │
echo ├──────────────────────────────────────────────┤
echo │  [1] Run in foreground (this window)                        │
echo │  [2] Install as Windows service (admin required)           │
echo │  [3] Create shortcut + auto-start                  │
echo └──────────────────────────────────────────────┘
set /p choice="请输入选项 (1/2/3): "

if "%choice%"=="1" goto run_foreground
if "%choice%"=="2" goto install_service
if "%choice%"=="3" goto create_shortcut
goto run_foreground

:run_foreground
echo.
echo 🚀 Starting server...
echo    URL: http://localhost:3001
echo    Press Ctrl+C to stop
echo.
node dist/index.js
goto end

:install_service
echo.
echo 🔧 Installing Windows service...
echo    Requires admin privileges
echo.
:: Check if pm2 is installed
call npm install -g pm2 >nul 2>&1
pm2 start dist/index.js --name oa-server
pm2 save
pm2 startup
echo ✅ Service installed, will auto-start on boot
echo.
echo 常用命令:
echo   Status: pm2 status
echo   Logs: pm2 logs oa-server
echo   Restart: pm2 restart oa-server
echo   Stop: pm2 stop oa-server
echo.
goto end

:create_shortcut
echo.
echo 🔧 Creating shortcut and auto-start...
:: Create VBS launcher
set LAUNCHER=%~dp0start-server.vbs
echo Set WshShell = CreateObject("WScript.Shell") > "%LAUNCHER%"
echo WshShell.Run "cmd /c cd /d %~dp0 && node dist\index.js", 0, False >> "%LAUNCHER%"

:: Create shortcut in Startup folder
set STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
echo Set oWS = WScript.CreateObject("WScript.Shell") > "%TEMP%\create_shortcut.vbs"
echo sLinkFile = "%STARTUP%\OA审批系统.lnk" >> "%TEMP%\create_shortcut.vbs"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%TEMP%\create_shortcut.vbs"
echo oLink.TargetPath = "%LAUNCHER%" >> "%TEMP%\create_shortcut.vbs"
echo oLink.WorkingDirectory = "%~dp0" >> "%TEMP%\create_shortcut.vbs"
echo oLink.Description = "OA审批系统服务器" >> "%TEMP%\create_shortcut.vbs"
echo oLink.Save >> "%TEMP%\create_shortcut.vbs"
cscript /nologo "%TEMP%\create_shortcut.vbs"
del "%TEMP%\create_shortcut.vbs"

echo ✅ Auto-start configured

:: Also create desktop shortcut
echo Set oWS = WScript.CreateObject("WScript.Shell") > "%TEMP%\create_desktop.vbs"
echo sLinkFile = oWS.SpecialFolders("Desktop") + "\OA审批系统.lnk" >> "%TEMP%\create_desktop.vbs"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%TEMP%\create_desktop.vbs"
echo oLink.TargetPath = "%~dp0start-server.vbs" >> "%TEMP%\create_desktop.vbs"
echo oLink.WorkingDirectory = "%~dp0" >> "%TEMP%\create_desktop.vbs"
echo oLink.Description = "OA审批系统服务器" >> "%TEMP%\create_desktop.vbs"
echo oLink.Save >> "%TEMP%\create_desktop.vbs"
cscript /nologo "%TEMP%\create_desktop.vbs"
del "%TEMP%\create_desktop.vbs"

echo ✅ Desktop shortcut created
echo.
echo Server will start automatically on next boot.
echo To start now, double-click「OA审批系统」shortcut.
echo.

:end
echo.
echo ┌──────────────────────────────────────────────┐
echo │  Installation complete！                                    │
echo ├──────────────────────────────────────────────┤
echo │  1. Edit .env to configure Azure AD                │
echo │  2. Access http://localhost:3001          │
echo └──────────────────────────────────────────────┘
echo.
pause
`;
fs.writeFileSync(path.join(PACKAGE_DIR, 'install.bat'), installBat.replace(/\r\n/g, '\n'));
console.log('  ✅ install.bat created');

// ━━ Step 5: Create Linux install.sh ━━
const installSh = `#!/bin/bash
set -e

echo "╔══════════════════════════════════════════════╗"
echo "║     OA 审批系统 - 服务器安装程序              ║"
echo "║     Version: ${VERSION}                                  ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 未找到 Node.js，请先Install Node.js 20+"
    echo "   Ubuntu: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs"
    exit 1
fi

echo "✅ Node.js $(node --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production --no-audit --no-fund
echo "✅ Dependencies installed"
echo ""

# Run setup
echo "🔧 Initial configuration..."
node setup.js
echo ""

# Systemd service
read -p "是否安装为 systemd 服务 (开机自启)? [y/N] " -n 1 -r
echo
if [[ \$REPLY =~ ^[Yy]$ ]]; then
    SERVICE_FILE="/etc/systemd/system/oa-server.service"
    sudo tee \$SERVICE_FILE > /dev/null << EOF
[Unit]
Description=OA Approval System Server
After=network.target

[Service]
Type=simple
User=\$USER
WorkingDirectory=$(pwd)
ExecStart=$(which node) $(pwd)/dist/index.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
    sudo systemctl daemon-reload
    sudo systemctl enable oa-server
    sudo systemctl start oa-server
    echo "✅ systemd 服务已安装并启动"
    echo ""
    echo "常用命令:"
    echo "  查看状态: sudo systemctl status oa-server"
    echo "  查看日志: sudo journalctl -u oa-server -f"
    echo "  重启服务: sudo systemctl restart oa-server"
    echo "  停止服务: sudo systemctl stop oa-server"
fi

echo ""
echo "┌──────────────────────────────────────────────┐"
echo "│  Installation complete！                                    │"
echo "├──────────────────────────────────────────────┤"
echo "│  1. Edit .env to configure Azure AD                │"
echo "│  2. Access http://localhost:3001          │"
echo "└──────────────────────────────────────────────┘"
`;
fs.writeFileSync(path.join(PACKAGE_DIR, 'install.sh'), installSh);
fs.chmodSync(path.join(PACKAGE_DIR, 'install.sh'), 0o755);
console.log('  ✅ install.sh created');

// ━━ Step 6: Create README ━━
const readme = `# OA 审批系统 - 服务器 ${VERSION}

## 快速安装

### Windows
双击 \`install.bat\` → 选择安装模式 → 编辑 .env → 完成

### Linux
\`\`\`bash
chmod +x install.sh
./install.sh
\`\`\`

## 安装后的步骤
1. 编辑 \`.env\` 文件，填入 Azure AD 配置
2. 配置 SMTP 邮件服务
3. 浏览器访问 http://localhost:3001

## 目录结构
- dist/      - 编译后的服务器代码
- node_modules/ - 生产依赖 (npm install 后生成)
- data/      - 数据库文件
- uploads/   - 附件存储
- .env       - 配置文件
- setup.js   - 首次运行密钥生成

## 外网访问
参考管理员指南第七章配置 Cloudflare Tunnel。
`;
fs.writeFileSync(path.join(PACKAGE_DIR, 'README.txt'), readme);
console.log('  ✅ README.txt created');

// ━━ Step 7: Create ZIP ━━
console.log('📦 Step 7: Creating ZIP archive...');
const zipFile = path.join(DIST, `${PACKAGE_NAME}.zip`);

// Use PowerShell for ZIP on Windows
try {
  execSync(`powershell -Command "Compress-Archive -Path '${PACKAGE_DIR}\\*' -DestinationPath '${zipFile}' -Force"`, { stdio: 'inherit' });
  console.log(`  ✅ ${PACKAGE_NAME}.zip created`);
} catch (e) {
  console.error('  ❌ ZIP creation failed (try installing 7-Zip or using PowerShell)');
}

// ━━ Step 8: Summary ━━
const stats = fs.statSync(zipFile);
console.log('');
console.log('╔══════════════════════════════════════════════╗');
console.log('║  🎉 Server packaging complete！                           ║');
console.log('╠══════════════════════════════════════════════╣');
console.log(`║  Output directory: ${DIST}`.padEnd(50) + '║');
console.log(`║  Package:   ${PACKAGE_NAME}.zip (${(stats.size/1024).toFixed(0)} KB)`.padEnd(50) + '║');
console.log(`║  Version:     ${VERSION}`.padEnd(50) + '║');
console.log('╠══════════════════════════════════════════════╣');
console.log('║  Deployment steps:                                     ║');
console.log('║  1. Extract ZIP to server                           ║');
console.log('║  2. Install Node.js 20+                          ║');
console.log('║  3. Run install.bat (or ./install.sh)        ║');
console.log('║  4. Edit .env for Azure AD + SMTP             ║');
console.log('║  5. Access http://SERVER_IP:3001                  ║');
console.log('╚══════════════════════════════════════════════╝');

// ━━ Helper ━━
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
