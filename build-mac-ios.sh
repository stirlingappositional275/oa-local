#!/bin/bash
# ═══════════════════════════════════════════════════════════
# OA审批系统 - macOS/iOS 一键构建脚本
# 在你的 MacBook Pro 上运行此脚本
# ═══════════════════════════════════════════════════════════
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║     OA 审批系统 - Mac / iOS 构建脚本              ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ━━ Check Prerequisites ━━
check_cmd() {
    if ! command -v "$1" &>/dev/null; then
        echo -e "${RED}❌ 缺少 $1，请先安装${NC}"
        exit 1
    fi
}

check_cmd node
check_cmd npm
echo -e "${GREEN}✅ Node.js $(node --version)${NC}"
echo -e "${GREEN}✅ npm $(npm --version)${NC}"
echo ""

# ━━ Step 1: Build Web Frontend ━━
echo "📦 [1/4] 构建 Web 前端..."
cd "$PROJECT_DIR/client"
if [ ! -d "node_modules" ]; then npm install; fi
npm run build
echo -e "${GREEN}✅ Web 前端构建完成${NC}"

# ━━ Step 2: Build Mac Desktop Client (.dmg) ━━
echo ""
echo "📦 [2/4] 构建 Mac 桌面客户端..."
cd "$PROJECT_DIR/desktop"
if [ ! -d "node_modules" ]; then npm install; fi

# Copy client dist
rm -rf client-dist
cp -r "$PROJECT_DIR/client/dist" client-dist

# Update version
VERSION="${1:-1.0.0}"
node -e "const p=require('./package.json');p.version='$VERSION';require('fs').writeFileSync('./package.json',JSON.stringify(p,null,2))"

echo "   正在打包 (可能需要 5-10 分钟)..."
npx electron-builder --mac --universal

DMG_FILE=$(find dist-package -name "*.dmg" | head -1)
if [ -n "$DMG_FILE" ]; then
    echo -e "${GREEN}✅ Mac 桌面客户端: $(realpath "$DMG_FILE")${NC}"
    ls -lh "$DMG_FILE"
else
    echo -e "${YELLOW}⚠️  DMG 文件未找到，检查 dist-package/ 目录${NC}"
    ls -la dist-package/*.dmg 2>/dev/null || echo "无 .dmg 文件"
fi

# ━━ Step 3: Build iOS App (.ipa) ━━
echo ""
echo "📦 [3/4] 构建 iOS 客户端..."
cd "$PROJECT_DIR/mobile"
if [ ! -d "node_modules" ]; then npm install; fi

# Add iOS platform if not exists
if [ ! -d "ios" ]; then
    echo "   初始化 iOS 工程..."
    npx cap add ios
fi

# Sync web assets
npx cap sync ios
echo -e "${GREEN}✅ iOS 工程已同步${NC}"

# Open Xcode
echo ""
echo "┌──────────────────────────────────────────────────────┐"
echo "│   iOS 构建需要 Xcode 手动完成最后一步:                │"
echo "│                                                      │"
echo "│   1. 打开 Xcode 项目:                                 │"
echo "│      open $PROJECT_DIR/mobile/ios/App/App.xcworkspace │"
echo "│                                                      │"
echo "│   2. 选择 Product → Archive                          │"
echo "│   3. 在 Organizer 中 Distribute App                   │"
echo "│                                                      │"
echo "│   需要 Apple Developer 账号 ($99/年)                    │"
echo "└──────────────────────────────────────────────────────┘"
echo ""

# Auto-open Xcode
read -p "是否现在打开 Xcode? [Y/n] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    open "$PROJECT_DIR/mobile/ios/App/App.xcworkspace" 2>/dev/null || \
    open "$PROJECT_DIR/mobile/ios/App.xcworkspace" 2>/dev/null || \
    echo "请手动打开: $PROJECT_DIR/mobile/ios/App/"
fi

# ━━ Step 4: Summary ━━
echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  🎉 Mac/iOS 构建完成！                           ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║                                                  ║"
echo "║  📦 Mac 桌面:  desktop/dist-package/*.dmg         ║"
echo "║  📱 iOS 工程:  mobile/ios/ (Xcode 构建)           ║"
echo "║                                                  ║"
echo "║  分发给用户:                                       ║"
echo "║  - Mac 用户: 双击 .dmg 拖入 Applications           ║"
echo "║  - iOS 用户: 通过 App Store 或 MDM 分发             ║"
echo "╚══════════════════════════════════════════════════╝"

# ━━ Copy all outputs to one directory ━━
OUTPUT_DIR="$PROJECT_DIR/dist-all"
mkdir -p "$OUTPUT_DIR"

# Copy Mac dmg
if [ -n "$DMG_FILE" ] && [ -f "$DMG_FILE" ]; then
    cp "$DMG_FILE" "$OUTPUT_DIR/"
fi

# Copy instructions
cat > "$OUTPUT_DIR/README.txt" << 'EOF'
OA审批系统 v1.0.0 - 客户端安装包

📦 包含:
  - OA审批系统_Mac.dmg        Mac 桌面客户端
  - OA审批系统.ipa            iPhone/iPad 客户端 (需从 Xcode 导出)

📱 iOS 安装方式:
  1. App Store 分发 (推荐)
  2. TestFlight 测试
  3. 企业证书内部分发
  4. 开发模式: Xcode 直接安装到设备

🖥️ Mac 安装方式:
  双击 .dmg → 拖入 Applications → 完成

🔗 服务器连接:
  首次启动时客户端自动连接默认服务器地址。
  如需修改: 终端运行
  /Applications/OA审批系统.app/Contents/MacOS/OA审批系统 --server=http://你的服务器IP:3001
EOF

echo ""
echo -e "${GREEN}所有安装包已汇总到: $OUTPUT_DIR${NC}"
ls -lh "$OUTPUT_DIR/"
