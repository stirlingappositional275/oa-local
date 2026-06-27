# OA Approval System — Self-Hosted, Encrypted, Multi-Platform

> **The only open-source OA approval system that gives enterprises full data sovereignty.**
>
> Zero recurring fees. Deploy on your own hardware. Your data, your keys, your rules.

<p align="center">
  <img src="https://img.shields.io/badge/version-1.1.0-7c3aed" alt="version">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="license">
  <img src="https://img.shields.io/badge/platform-Web%20%7C%20Win%20%7C%20Mac%20%7C%20iOS%20%7C%20Android-blue" alt="platforms">
  <img src="https://img.shields.io/badge/encryption-AES--256--GCM-orange" alt="encryption">
  <img src="https://img.shields.io/badge/audit-SOX%20%7C%20SEC%2017a--4-brightgreen" alt="compliance">
</p>

---

## The Problem

Enterprises spend **$200-400 per user per month** on SaaS OA platforms (Feishu, DingTalk, Lark). They get:

- ❌ Data stored on vendor servers (ByteDance, Alibaba)
- ❌ No independent audit capability
- ❌ Per-user pricing that scales linearly with headcount
- ❌ Vendor lock-in — migrating away is deliberately painful
- ❌ Files uploaded by employees can be downloaded and forwarded by anyone

**For listed companies, this is a SOX compliance nightmare. For everyone else, it's an unnecessary recurring cost with zero data sovereignty.**

## The Solution

A **completely self-hosted OA approval system** that you deploy once and own forever.

| | SaaS (Feishu/DingTalk) | This Project |
|---|:--:|:--:|
| **Data location** | Vendor cloud | Your server |
| **Cost (200 users, 5yr)** | ~$300K+ | ~$8K one-time |
| **Source code** | Closed | MIT Open Source |
| **Database access** | No direct access | Full SQL access |
| **Encryption keys** | Vendor-managed | You control |
| **Offline capability** | No | Yes (intranet) |
| **Independent audit** | No | Yes |
| **File security** | Downloadable | Preview-only vault |
| **Multi-company** | Org exposed | Hard isolation |

## What's Inside

### Approval Engine
6 approval types out of the box. JSON-driven, infinitely customizable chains. Conditional routing. Dynamic form rendering. Cross-company federation.

### File Vault ("Upload Only, Preview Never Download")
Files are locked on upload. Approvers preview via Base64 streaming. No download URL ever exposed. Email dispatch rules by file tag. Admin audit download requires mandatory reason logging.

### RBAC + Audit
Four-tier role system. Page-level, action-level, data-level access control. Immutable audit trail — every operation logged, permanently retained, independently verifiable.

### Security & Compliance
- **AES-256-GCM** column-level encryption (keys in your `.env`, never leave your server)
- **Azure AD / Entra ID** authentication — no new accounts, no passwords stored
- **SEC 17a-4(f) WORM** compliant — audit logs immutable, retention policy fully configurable
- **SOX §302/§404** ready — external auditors can directly access server and verify independently
- **NASAAQ/NYSE** compliant — no jurisdictional conflicts, data stays in your chosen region

### i18n
System-level Chinese / English. Auto-detects OS language. 70+ UI keys. Bilingual email templates mirror the original Power Platform system's `crd22_gblLang` field.

## Architecture

```
┌────────────────────────────────────────────┐
│               Client Layer                  │
│  React PWA │ Electron │ Capacitor Mobile    │
└──────────────────┬─────────────────────────┘
                   │ REST API
┌──────────────────┼─────────────────────────┐
│         Server (Express + TypeScript)       │
│  ┌──────┐ ┌────────┐ ┌────────┐ ┌───────┐  │
│  │Auth  │ │Approval│ │File    │ │Audit  │  │
│  │MSAL  │ │Engine  │ │Vault   │ │Log    │  │
│  └──────┘ └────────┘ └────────┘ └───────┘  │
│  ┌────────────────────────────────────────┐ │
│  │     SQLite (AES-256 column-encrypted)   │ │
│  └────────────────────────────────────────┘ │
└────────────────────────────────────────────┘
```

## Quick Start

```bash
# Terminal 1 — Server
cd server && npm install && npm run dev     # → http://localhost:3001

# Terminal 2 — Frontend
cd client && npm install && npm run dev     # → http://localhost:5173
```

Dev mode includes a mock login (no Azure AD needed). For production, set `DEV_MODE = false` and configure `.env` with your MSAL credentials.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 · TypeScript · Tailwind CSS · Vite |
| Backend | Node.js 20 · Express · TypeScript |
| Database | SQLite (sql.js WASM — zero native deps) |
| Auth | MSAL Node + Azure AD / Entra ID |
| Desktop | Electron 28 (Win/Mac .exe/.dmg) |
| Mobile | Capacitor 6 (iOS/Android) |
| Encryption | AES-256-GCM (Node.js crypto / OpenSSL) |
| External access | Cloudflare Tunnel (optional, free HTTPS) |

## Repository Structure

```
oa-local/
├── server/          # Express API + SQLite + AES-256 crypto
│   └── src/
│       ├── auth/        # MSAL Azure AD
│       ├── db/          # Encrypted DB layer
│       ├── middleware/   # JWT auth, tenant isolation, RBAC
│       ├── routes/       # REST endpoints
│       └── services/     # Business logic
├── client/          # React SPA (hybrid-preview design)
│   └── src/
│       ├── auth/        # MSAL React
│       ├── pages/       # 10 pages (Login → Admin)
│       └── components/  # GlassCard, StepStepper, FormRenderer
├── desktop/         # Electron shell
├── mobile/          # Capacitor iOS/Android
└── dist-all/        # Pre-built installers
```

## Why Open Source

We built this for a specific enterprise use case. The project was not selected for internal deployment — but the code represents months of focused work on a real problem that thousands of companies face. Rather than let it sit in a private repo, we're releasing it as MIT-licensed open source.

**If you're an investor, a CTO evaluating OA platforms, or a developer who wants to understand what a production-ready self-hosted approval system looks like — this is the real thing, not a demo.**

## License

MIT © 2026. Use it, fork it, build a business on it. Just don't blame us if it prints money.
