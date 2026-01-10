# 🚀 Multi-Agent Final - Migration & Setup Plan

**Project:** `ai/multi-agent-final`  
**Tanggal:** 9 Januari 2026  
**Status:** DRAFT  
**Referensi:** [ARCHITECTURE_V2.md](./ARCHITECTURE_V2.md)

---

## 📋 Overview

Migrasi fokus pada **pindah teknologi backend & frontend** (hardening, struktur baru, kualitas kode) namun **AI tetap memakai stack & role legacy `ai/multi-agent`**: CommonJS, Qwen CLI session flow, Redis session mapping, router → sales/finance/inventory/memory/general-assistant → summarizer, prompt legacy tetap.

### Prinsip Migrasi:
- ✅ **Copy yang sudah jalan** (SQL queries, tool logic, agent routing, prompts)
- ✅ **Refactor struktur backend/frontend** (modular, testable) tanpa mengubah AI stack
- ✅ **Implementasi RBAC dari awal** (user_aplikasi_roles)
- 🚫 **Tidak ganti LLM transport / role AI** (tetap Qwen CLI + roles legacy)
- 🚫 **Tidak rewrite agent/prompt** (hanya wiring ulang bila perlu)

---

## 🎯 Phase 0: Project Initialization

### 0.1 Create Project Structure
- [ ] Create folder `ai/multi-agent-final`
- [ ] Initialize `package.json`
- [ ] Setup ESLint + Prettier
- [ ] Create `.env.example`
- [ ] Create `README.md`

### 0.2 Directory Structure
```
ai/multi-agent-final/
├── config/
│   ├── database.js           # Centralized pool config
│   ├── llm-legacy.js         # Qwen CLI env mapping (no HTTP rewrite)
│   ├── roles.js              # ROLE_AGENT_MAP (legacy agents)
│   └── access-rules.js       # DATA_ACCESS_RULES
│
├── core/
│   ├── context-builder.js    # Build RequestContext from DB
│   ├── orchestrator.js       # Pipeline orchestrator (reuse legacy flow)
│   ├── access-control.js     # RBAC enforcement
│   └── session-manager.js    # Redis session management (keep session mapping)
│
├── agents/                   # Reuse legacy agents/prompts (router, sales, finance, inventory, memory, general, summarizer)
│   ├── base-agent.js
│   ├── router/
│   │   ├── index.js
│   │   └── router.prompt.md
│   ├── finance-manager/
│   │   ├── index.js
│   │   └── finance.prompt.md
│   ├── sales-manager/
│   │   ├── index.js
│   │   └── sales.prompt.md
│   ├── inventory-manager/
│   │   ├── index.js
│   │   └── inventory.prompt.md
│   └── summarizer/
│       └── index.js
│
├── tools/                    # Reuse SQL + logic; minimal wrapping only
│   ├── base-tool.js
│   ├── neraca/
│   │   ├── index.js
│   │   └── neraca.sql
│   ├── laba-rugi/
│   │   ├── index.js
│   │   └── laba-rugi.sql
│   ├── saldo-kas/
│   │   ├── index.js
│   │   └── saldo-kas.sql
│   └── buku-besar/
│       ├── index.js
│       └── buku-besar.sql
│
├── utils/
│   ├── db-pool.js            # Shared PG Pool
│   ├── redis-client.js       # Redis connection
│   ├── logger.js             # Pino structured logging
│   ├── date-parser.js        # Indonesian date parsing
│   └── formatter.js          # Rupiah, percentage formatters
│
├── routes/
│   ├── chat.js               # WebSocket handlers
│   └── health.js             # Health check endpoints
│
├── middleware/
│   ├── auth.js               # JWT validation
│   ├── rate-limit.js         # Per-tenant rate limiting
│   └── error-handler.js      # Global error handling
│
├── frontend/                  # Vite + React Voice UI
│   ├── src/
│   ├── public/
│   └── package.json
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
│
├── docs/
│   └── (copy dari multi-agent)
│
├── server.js                  # Entry point
├── package.json
├── ecosystem.config.js        # PM2 config
├── .env.example
├── .eslintrc.js
└── .prettierrc
```

### 0.3 Dependencies
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.2",
    "pg": "^8.11.3",
    "redis": "^4.6.10",
    "axios": "^1.6.2",
    "pino": "^8.16.2",
    "pino-pretty": "^10.2.3",
    "dotenv": "^16.3.1",
    "jsonwebtoken": "^9.0.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0"
  },
  "devDependencies": {
    "eslint": "^8.55.0",
    "prettier": "^3.1.1",
    "vitest": "^1.0.4",
    "@types/node": "^20.10.4"
  }
}
```

> Catatan: Dependensi ini untuk backend/frontend hardening. LLM/AI tetap memakai tooling legacy (Qwen CLI + session mapper) tanpa penambahan transport baru.

---

## 🎯 Phase 1: Core Infrastructure (Backend/Frontend)

### 1.1 Database Pool (Centralized)
- [ ] Create `utils/db-pool.js`
  - Single pool instance
  - Dynamic schema switching
  - Connection health check
  - Query logging (optional)
- [ ] Create `config/database.js`
  - Load from `.env`
  - Pool size configuration

### 1.2 Redis Client
- [ ] Create `utils/redis-client.js`
  - Session storage
  - Query cache
  - Rate limit storage
- [ ] Implement cache helpers (get/set with TTL)

### 1.3 Logger (Structured)
- [ ] Create `utils/logger.js` with Pino
  - Request ID tracking
  - Tenant/User context in every log
  - Log levels: debug, info, warn, error
  - File rotation (optional)

### 1.4 Context Builder
- [ ] Create `core/context-builder.js`
  - Query `prive.user_login` for user info
  - Query `prive.user_aplikasi_roles` for roles in current app
  - Query `prive.aplikasi` for tenant config
  - Build `RequestContext` object
  - Cache context in Redis (TTL 5 min)

---

## 🎯 Phase 2: Access Control (RBAC)

### 2.1 Role Definitions
- [ ] Create `config/roles.js`
  - ROLE_AGENT_MAP (role → allowed agents)
  - Default agent per role
  - Data access level per role

### 2.2 Access Rules
- [ ] Create `config/access-rules.js`
  - Tables allowed per access level
  - Fields allowed/denied per access level
  - SQL filter injection helpers

### 2.3 Access Control Middleware
- [ ] Create `core/access-control.js`
  - `checkAgentAccess(userRoles, targetAgent)` → boolean
  - `filterFields(data, accessLevel)` → filtered data
  - `getSchemaForTenant(aplikasiId)` → schema name
  - `enforceReadOnly(userRoles)` → check can_write

---

## 🎯 Phase 3: Integrasi AI Legacy (tidak diubah)

### 3.1 Konfigurasi LLM (Legacy)
- [ ] Pastikan `config/llm-legacy.js` memetakan env Qwen CLI (token, model) tanpa HTTP rewrite
- [ ] Pastikan sesi CLI ↔ Redis session mapping tetap aktif (clientSessionId ↔ qwenSessionId)

### 3.2 Orkestrasi & Roles (Legacy)
- [ ] Reuse pipeline-orchestrator (router → sales/finance/inventory/memory/general-assistant → summarizer)
- [ ] Pertahankan prompts legacy (router, sales, finance, inventory, summarizer)
- [ ] Tidak mengubah role/urutan agent; hanya wiring ke server baru jika perlu

### 3.3 Prompt & Knowledge
- [ ] Copy prompt/knowledge dari legacy (tanpa modifikasi konten)
- [ ] Dokumentasikan lokasi prompt agar tidak tertimpa saat refactor backend/frontend

---

## 🎯 Phase 4: Tools Migration (reuse)

### 4.1 Base Tool Wrapper
- [ ] (Opsional) Tambah wrapper ringan jika perlu penyesuaian signature untuk server baru
- [ ] Jangan ubah SQL atau alur eksekusi inti

### 4.2 Migrate Existing Tools
- [ ] **Neraca Tool**
  - Copy SQL from `multi-agent/sql/neraca.sql`
  - Pakai logic legacy apa adanya
  - Tambah guard minimal (validasi input) tanpa ubah hasil
  
- [ ] **Laba Rugi Tool**
  - Copy SQL dari legacy
  - Logic tetap; handle empty data seperlunya

- [ ] **Saldo Kas Tool**
  - Copy SQL dari legacy
  - Logic tetap

- [ ] **Buku Besar Tool**
  - Copy SQL dari legacy
  - Logic tetap

### 4.3 New Tools (Priority)
- [ ] Boleh tambah, tapi tidak mengubah tools/role existing

---

## 🎯 Phase 5: Agents (reuse roles legacy)

### 5.1 Wiring Ulang (tanpa rewrite)
- [ ] Pertahankan base/specialist legacy; hanya sesuaikan import/export bila perlu
- [ ] Router → sales/finance/inventory/memory/general-assistant → summarizer tetap sama
- [ ] Jangan ubah prompt/persona; hanya dokumentasi & health check

### 5.2 Guard & Observability
- [ ] Tambah auth/tenant guard di entry router (tanpa mengubah keputusan agent)
- [ ] Logging ringan untuk tracing (requestId, tenant, agent terpilih)

---

## 🎯 Phase 6: Server & API

### 6.1 Express Server
- [ ] Create `server.js`
  - Express + Socket.IO setup
  - CORS, Helmet, compression
  - Error handling middleware
  - Graceful shutdown
  - Expose AI legacy pipeline endpoint/WS tanpa mengubah isinya

### 6.2 WebSocket Handlers
- [ ] Create `routes/chat.js`
  - `connection` → authenticate, build context
  - `chat-message` → orchestrator pipeline
  - `disconnect` → cleanup
  - Progress events

### 6.3 REST Endpoints
- [ ] Create `routes/health.js`
  - `GET /health` → basic health
  - `GET /ready` → DB + Redis check + AI legacy CLI check (ping)

### 6.4 Auth Middleware
- [ ] Create `middleware/auth.js`
  - JWT validation
  - Option A: Validate via ltech-backend API
  - Option B: Shared JWT secret
  - Extract user context from token

---

## 🎯 Phase 7: Voice-First Frontend

### 7.1 Project Setup
- [ ] Create Vite + React project in `frontend/`
- [ ] Install Socket.IO client, Framer Motion, Zustand
- [ ] Setup Tailwind CSS
- [ ] Configure proxy to backend

### 7.2 Core Components
- [ ] `VoiceButton.jsx` - Push to talk
- [ ] `VoiceVisualizer.jsx` - Audio waveform
- [ ] `ChatBubble.jsx` - Message display
- [ ] `ConversationView.jsx` - Chat history
- [ ] `QuickActions.jsx` - Shortcuts

### 7.3 Hooks
- [ ] `useSpeechRecognition.js` - Web Speech API
- [ ] `useSpeechSynthesis.js` - Text to Speech
- [ ] `useSocket.js` - WebSocket connection
- [ ] `useAuth.js` - JWT handling (frontend only; tidak mengubah auth di AI pipeline)

### 7.4 UI Flow
- [ ] Landing page with voice button
- [ ] Listening → Processing → Speaking states
- [ ] Fallback text input
- [ ] Conversation history

---

## 🎯 Phase 8: Testing

### 8.1 Unit Tests
- [ ] Tool tests (SQL execution, formatting)
- [ ] Context builder tests
- [ ] Access control tests
- [ ] Date parser tests

### 8.2 Integration Tests
- [ ] Full pipeline test (question → answer) menggunakan AI legacy stack
- [ ] WebSocket connection test
- [ ] Multi-tenant isolation test

### 8.3 Manual Testing
- [ ] Voice input/output
- [ ] Different roles access different data
- [ ] Error handling (no data, invalid question)

---

## 🎯 Phase 9: Deployment

### 9.1 PM2 Configuration
- [ ] Create `ecosystem.config.js`
- [ ] Setup environment variables
- [ ] Log rotation
- [ ] Pastikan proses AI legacy (CLI + orchestrator) di-manage tanpa mengubah startup flags

### 9.2 Nginx Configuration
- [ ] Proxy pass for `/ai` → multi-agent-final
- [ ] WebSocket upgrade headers
- [ ] SSL configuration

### 9.3 Monitoring
- [ ] Health endpoint monitoring
- [ ] Log aggregation
- [ ] Error alerting

---

## 📊 Progress Tracker

| Phase | Task Count | Completed | Status |
|-------|------------|-----------|--------|
| 0. Initialization | 5 | 0 | ⏳ Pending |
| 1. Infrastructure | 8 | 0 | ⏳ Pending |
| 2. Access Control | 5 | 0 | ⏳ Pending |
| 3. LLM Client | 5 | 0 | ⏳ Pending |
| 4. Tools | 8 | 0 | ⏳ Pending |
| 5. Agents | 6 | 0 | ⏳ Pending |
| 6. Server | 6 | 0 | ⏳ Pending |
| 7. Frontend | 10 | 0 | ⏳ Pending |
| 8. Testing | 6 | 0 | ⏳ Pending |
| 9. Deployment | 5 | 0 | ⏳ Pending |
| **Total** | **64** | **0** | **0%** |

---

## 🔄 What to Copy from `multi-agent` (Current)

### ✅ Copy (Tested & Working)
| File | Copy To | Notes |
|------|---------|-------|
| `sql/neraca.sql` | `tools/neraca/neraca.sql` | Tested |
| `sql/rugi_laba_periodic.sql` | `tools/laba-rugi/laba-rugi.sql` | Tested |
| `sql/saldo_kas.sql` | `tools/saldo-kas/saldo-kas.sql` | Tested |
| `sql/buku_besar.sql` | `tools/buku-besar/buku-besar.sql` | Tested |
| `knowledge/CORE_MEMORY.md` | `docs/CORE_MEMORY.md` | Reference |
| `knowledge/finance-manager/` | `agents/finance-manager/knowledge/` | Prompts |
| `docs/ARCHITECTURE_V2.md` | `docs/` | Architecture |

### ❌ Don't Copy (Refactor Needed)
| File | Reason |
|------|--------|
| `qwen-wrapper.js` | CLI-based, replace with HTTP |
| `pipeline-orchestrator.js` | Refactor with cleaner structure |
| `agents/specialist-base.js` | Too complex, simplify |
| `server.js` | Rewrite with new structure |
| `access-control.js` | Rewrite for user_aplikasi_roles |

---

## ⏰ Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 0: Init | 1 hari | - |
| Phase 1: Infra | 2 hari | Phase 0 |
| Phase 2: RBAC | 1 hari | Phase 1 |
| Phase 3: LLM | 2 hari | Phase 1 |
| Phase 4: Tools | 2 hari | Phase 1 |
| Phase 5: Agents | 3 hari | Phase 2, 3, 4 |
| Phase 6: Server | 1 hari | Phase 5 |
| Phase 7: Frontend | 3 hari | Phase 6 |
| Phase 8: Testing | 2 hari | Phase 7 |
| Phase 9: Deploy | 1 hari | Phase 8 |
| **Total** | **~18 hari kerja** | |

---

## 🚦 Start Here

**Minggu ke-1:**
1. [ ] Phase 0: Project init
2. [ ] Phase 1.1-1.3: DB Pool, Redis, Logger
3. [ ] Phase 4.1-4.2: Base Tool + Migrate 4 tools (SQL only)

**Minggu ke-2:**
1. [ ] Phase 1.4: Context Builder
2. [ ] Phase 2: Full RBAC
3. [ ] Phase 3: LLM Client

**Minggu ke-3:**
1. [ ] Phase 5: All Agents
2. [ ] Phase 6: Server + WebSocket

**Minggu ke-4:**
1. [ ] Phase 7: Frontend Voice UI
2. [ ] Phase 8-9: Testing & Deploy

---

**Dokumen ini adalah living document. Update progress sesuai perkembangan.**
