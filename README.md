# OA 审批系统 - 本地化部署方案

基于 Power Platform OA 审批系统（OA0624Final v1.0.0.7）改造的私有化部署版本。

## 系统架构

```
┌─────────────────────────────────────────────────────┐
│                   Client Layer                       │
│  Web PWA │ Electron Desktop (Win/Mac) │ Capacitor Mobile │
└─────────────────────┬───────────────────────────────┘
                      │ HTTPS (Cloudflare Tunnel)
┌─────────────────────┼───────────────────────────────┐
│              Server (Express + SQLite)               │
│  MSAL Auth │ Approval Engine │ Encrypted Export │ Federation │
└─────────────────────────────────────────────────────┘
```

## 快速开始

### 环境要求

- **Node.js** 20 LTS 或更高
- **npm** 9+
- （可选）**Python** 3.10+ 用于生成方案 PDF

### 1. 安装依赖

```bash
# 进入项目根目录
cd oa-local

# 安装服务器依赖
cd server
npm install

# 安装客户端依赖
cd ../client
npm install
```

### 2. 配置环境变量

```bash
# 复制环境变量模板
cd ../server
cp .env.example .env

# 编辑 .env 文件，填入实际配置
# 必填项：
#   MSAL_CLIENT_ID     - Azure AD 应用注册的客户端 ID
#   MSAL_TENANT_ID     - Azure AD 租户 ID
#   MSAL_CLIENT_SECRET - Azure AD 客户端密钥
#   JWT_SECRET         - JWT 签名密钥（至少32字符随机字符串）
#   DB_ENCRYPTION_KEY  - 数据库加密密钥（至少32字符随机字符串）
```

### 3. 启动开发模式

```bash
# 终端 1：启动服务器
cd server
npm run dev

# 终端 2：启动前端
cd client
npm run dev
```

服务器运行在 `http://localhost:3001`，前端运行在 `http://localhost:5173`。

> **开发模式**：系统默认启用 DEV_MODE，无需配置 Azure AD 即可使用模拟登录。在 `client/src/auth/MsalProvider.tsx` 中将 `DEV_MODE` 设为 `false` 即可启用真实 MSAL 认证。

### 4. 生产构建

```bash
# 构建前端
cd client
npm run build

# 构建后端
cd ../server
npm run build

# 启动生产服务
npm start
```

生产模式下服务器在 `http://localhost:3001` 同时提供 API 和前端静态文件。

## 目录结构

```
oa-local/
├── server/                     # 后端服务
│   ├── src/
│   │   ├── index.ts            # Express 入口
│   │   ├── config.ts           # 配置加载
│   │   ├── auth/msal.ts        # MSAL 认证
│   │   ├── db/
│   │   │   ├── crypto.ts       # AES-256-GCM 加密
│   │   │   ├── connection.ts   # 数据库连接
│   │   │   └── schema.ts       # 建表 & 默认数据
│   │   ├── middleware/
│   │   │   ├── auth.ts         # JWT 验证
│   │   │   └── tenant.ts       # 租户隔离
│   │   ├── routes/
│   │   │   ├── auth.ts         # 认证 API
│   │   │   ├── approvals.ts    # 审批 API（7端点）
│   │   │   ├── templates.ts    # 模板 API
│   │   │   ├── upload.ts       # 附件上传
│   │   │   ├── search.ts       # 全文检索
│   │   │   ├── export.ts       # 加密导出
│   │   │   └── federation.ts   # 跨公司审批
│   │   └── services/
│   │       ├── approval.ts     # 审批引擎
│   │       ├── email.ts        # 邮件服务
│   │       ├── export.ts       # 导出服务
│   │       └── federation.ts   # 跨公司服务
│   ├── .env.example
│   └── package.json
├── client/                     # React 前端
│   ├── src/
│   │   ├── App.tsx             # 路由 + 布局
│   │   ├── main.tsx            # 入口
│   │   ├── auth/MsalProvider.tsx
│   │   ├── api/client.ts       # API 封装
│   │   ├── pages/
│   │   │   ├── Login.tsx       # 登录
│   │   │   ├── Home.tsx        # 首页
│   │   │   ├── Submit.tsx      # 提交审批
│   │   │   ├── MyRequests.tsx  # 我的申请
│   │   │   ├── PendingApprovals.tsx  # 待审批
│   │   │   ├── Detail.tsx      # 审批详情
│   │   │   ├── FinanceDashboard.tsx  # 财务看板
│   │   │   └── Search.tsx      # 检索
│   │   └── components/
│   │       ├── FormRenderer.tsx  # 动态表单
│   │       ├── FileUpload.tsx   # 附件上传
│   │       └── ExportDialog.tsx # 导出对话框
│   └── package.json
├── desktop/                    # Electron 桌面端
│   ├── main.js
│   └── package.json
├── mobile/                     # Capacitor 移动端
│   ├── capacitor.config.ts
│   └── package.json
├── generate_plan_pdf.py        # 方案 PDF 生成脚本
├── OA审批系统本地化解决方案.pdf  # 方案文档
└── README.md
```

## API 接口

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/health` | 健康检查 | 否 |
| POST | `/api/auth/login` | MSAL 登录 | 否 |
| GET | `/api/auth/me` | 当前用户 | JWT |
| GET | `/api/approvals` | 我的申请 | JWT |
| GET | `/api/approvals/pending` | 待我审批 | JWT |
| POST | `/api/approvals` | 提交审批 | JWT |
| GET | `/api/approvals/:id` | 审批详情 | JWT |
| PUT | `/api/approvals/:id` | 更新审批 | JWT |
| POST | `/api/approvals/:id/approve` | 通过 | JWT |
| POST | `/api/approvals/:id/reject` | 驳回 | JWT |
| POST | `/api/approvals/:id/attach` | 上传附件 | JWT |
| GET | `/api/templates` | 模板列表 | JWT |
| POST | `/api/templates` | 创建模板 | JWT |
| GET | `/api/search?q=` | 全文检索 | JWT |
| POST | `/api/export` | 加密导出 | JWT |
| POST | `/api/federation/approvals` | 跨公司审批 | API Key |

## 数据安全

### 列级加密

以下字段在存储前使用 AES-256-GCM 加密：
- `applicant` - 申请人姓名
- `applicant_email` - 申请人邮箱
- `form_data` - 表单数据
- `amount` - 金额
- `department` - 部门

### 导出安全

1. 用户发起导出请求
2. 服务端查询数据库，解密数据
3. 生成随机 AES-256 一次性密钥
4. 加密数据打包为 .enc 文件
5. 加密文件通过浏览器下载
6. 解密密钥通过 Microsoft Graph API 邮件发送

## 外网访问（Cloudflare Tunnel）

```bash
# 安装 cloudflared
# Windows: winget install cloudflared
# Mac: brew install cloudflared

# 登录
cloudflared tunnel login

# 创建隧道
cloudflared tunnel create oa-tunnel

# 配置 DNS
cloudflared tunnel route dns oa-tunnel oa.yourcompany.com

# 启动隧道
cloudflared tunnel run --url http://localhost:3001 oa-tunnel
```

外网用户即可通过 `https://oa.yourcompany.com` 访问系统。

## 多公司部署（未来 Phase 2）

### 子公司部署

```bash
# 子公司 .env 配置
TENANT_ID=sub_a
TENANT_NAME=子公司A
FEDERATION_ROLE=spoke
PARENT_URL=https://parent-oa.company.com
PARENT_API_KEY=sk-parent-xxx
```

### 子公司对接母公司

子公司只需配置 `PARENT_URL` 和 `PARENT_API_KEY` 即可：
- 子公司无法看到母公司组织架构、人员、部门
- 审批链中 `scope='parent'` 的步骤自动转发到母公司
- 母公司 Federation Gateway 匹配角色 → 实际审批人

## 客户端构建

### Web PWA
直接访问服务器 URL，浏览器自动提示安装。

### Windows 桌面
```bash
cd desktop
npm install
npm run build:win
# 输出: desktop/dist/OA审批系统 Setup.exe
```

### Mac 桌面
```bash
cd desktop
npm install
npm run build:mac
# 输出: desktop/dist/OA审批系统.dmg
```

### iOS
```bash
cd mobile
npm install
npx cap sync ios
npx cap open ios
# 在 Xcode 中 Archive → 分发
```

### Android
```bash
cd mobile
npm install
npx cap sync android
npx cap open android
# 在 Android Studio 中 Build → APK/AAB
```

## License

Private use. All rights reserved.
