# Multi-Agent Architecture v2.0 - Production Grade

**Tanggal:** 9 Januari 2026  
**Status:** PROPOSAL  
**Bisnis:** Lucky Tech Group - Sparepart Otomotif & Bengkel

---

## 📋 Executive Summary

Dokumen ini menjabarkan desain arsitektur multi-agent AI system yang **production-ready**, dengan fokus pada:
- **Multi-Tenant** - Isolasi data antar tenant (schema PostgreSQL)
- **Multi-User** - Tracking per-user dengan session management
- **Multi-Role** - Role-based access control (RBAC) untuk setiap agent

### Konteks Migrasi
| Aspek | Lama (Delphi) | Baru (Web/PWA) |
|-------|---------------|----------------|
| **Backend** | - | `ltech-backend` (Go) - on progress |
| **Frontend** | Delphi Desktop | `ui` (React/PWA) - on progress |
| **Database** | MariaDB | PostgreSQL (multi-schema) |
| **AI Integration** | - | `ai/multi-agent` (Node.js) |
| **Laporan** | MariaDB SQL in bytea | PostgreSQL SQL + Custom Tools |

---

## 🗄️ DATABASE SCHEMA ANALYSIS

### Schema Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                       PostgreSQL: luckyjayagroup                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    SCHEMA: prive (Global)                    ││
│  │  ┌───────────────┐ ┌───────────────┐ ┌───────────────────┐  ││
│  │  │ user_login    │ │ roles         │ │ aplikasi          │  ││
│  │  │ (Users)       │ │ (14 roles)    │ │ (Tenant Config)   │  ││
│  │  └───────────────┘ └───────────────┘ └───────────────────┘  ││
│  │  ┌───────────────┐ ┌───────────────┐ ┌───────────────────┐  ││
│  │  │ datakode      │ │ rekening      │ │ menu              │  ││
│  │  │ (42 tx codes) │ │ (COA)         │ │ (App menus)       │  ││
│  │  └───────────────┘ └───────────────┘ └───────────────────┘  ││
│  │  ┌───────────────────────────────────────────────────────┐  ││
│  │  │ user_aplikasi_roles (User ↔ Role ↔ Tenant + Perms)    │  ││
│  │  └───────────────────────────────────────────────────────┘  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │               SCHEMA: u1566482_sparepart (Tenant)           ││
│  │               SCHEMA: u1566482_leontech (Tenant)            ││
│  │  ┌───────────────┐ ┌───────────────┐ ┌───────────────────┐  ││
│  │  │ t (Trans. Hdr)│ │ d (Detail)    │ │ j (Jurnal)        │  ││
│  │  │ (107 tables)  │ │               │ │                   │  ││
│  │  └───────────────┘ └───────────────┘ └───────────────────┘  ││
│  │  ┌───────────────┐ ┌───────────────┐ ┌───────────────────┐  ││
│  │  │ brg (Products)│ │ ktk (Contacts)│ │ laporan (Reports) │  ││
│  │  │               │ │               │ │ (Legacy SQL)      │  ││
│  │  └───────────────┘ └───────────────┘ └───────────────────┘  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### Active Tenants (from `prive.aplikasi`)

| id | kode_aplikasi | nama_aplikasi | db_schema |
|----|---------------|---------------|-----------|
| 6 | ljg_leontech | Lucky Jaya Group - Leontech Module | u1566482_leontech |
| 12 | ljg_sparepart | Lucky Jaya Group - Sparepart Module | sparepart |
| 13 | u1566482_sparepart | u1566482_sparepart | u1566482_sparepart |

**Catatan:** `prive.aplikasi` menyimpan konfigurasi koneksi database per-tenant termasuk:
- `db_host`, `db_port`, `db_name`, `db_schema`
- `db_username`, `db_password_encrypted`
- `db_max_connections`, `db_ssl_enabled`

---

### User Management (`prive.user_login`)

```sql
-- Key columns
id                       -- PK
username                 -- Unique, min 3 chars
email                    -- Unique, email format validated
password_hash            -- Bcrypt hash
full_name                -- Display name
is_active, is_verified   -- Status flags
two_factor_enabled       -- 2FA support
login_attempts           -- Brute force protection (max 10)
locked_until             -- Account lockout

-- ⚠️ DEPRECATED - Tidak digunakan lagi:
-- role                     -- Kolom ini DEPRECATED, gunakan user_aplikasi_roles
-- permissions              -- Kolom ini DEPRECATED
```

**CATATAN PENTING:** Kolom `role` di tabel `user_login` sudah **TIDAK DIGUNAKAN**. 
Sistem role sekarang berbasis **per-Aplikasi** melalui tabel `user_aplikasi_roles`.

---

### Business Roles (`prive.roles`)

| role_code | role_name | role_category |
|-----------|-----------|---------------|
| SUPERADMIN | Super Administrator | system |
| ADMIN | Administrator | system |
| MANAGER | Manager | system |
| USER | User | system |
| DEVELOPMENT | Development | business |
| DIREKSI | Direksi | business |
| PURCHASING | Purchasing | business |
| FINANCE | Finance | business |
| KASIR | Kasir | business |
| INVENTORY_MANAGER | Inventory Manager | business |
| INVENTORY | Staff Inventory | business |
| SALES_MANAGER | Sales Manager | business |
| SALES | Staff Sales | business |
| ADMINISTRASI_UMUM | Administrasi Umum | business |

**Role Categories:**
- `system` - System-level roles (SUPERADMIN, ADMIN, etc.)
- `business` - Business function roles (FINANCE, SALES, etc.)
- `custom` - Tenant-specific custom roles

---

### User-Aplikasi-Role Mapping (`prive.user_aplikasi_roles`) ⭐ KEY TABLE

**Konsep:** Seorang user dapat memiliki **role yang berbeda di setiap aplikasi/tenant**.

```sql
-- Struktur tabel
id              -- PK
user_login_id   -- FK to prive.user_login
role_id         -- FK to prive.roles
aplikasi_id     -- FK to prive.aplikasi (tenant)
access_level    -- ENUM: read, write, admin, superadmin
can_read        -- Boolean
can_write       -- Boolean
can_delete      -- Boolean
can_admin       -- Boolean
is_active       -- Boolean
assigned_at     -- Timestamp
assigned_by     -- FK to user yang assign
expires_at      -- Optional expiry date
```

**Contoh Data (User 'admin' dengan role berbeda di setiap aplikasi):**

| username | kode_aplikasi | role_code | access_level | can_read | can_write |
|----------|---------------|-----------|--------------|----------|----------|
| admin | ljg_sparepart | FINANCE | admin | ✅ | ✅ |
| admin | ljg_sparepart | INVENTORY_MANAGER | admin | ✅ | ✅ |
| admin | ljg_main | SALES_MANAGER | admin | ✅ | ✅ |
| admin | ljg_main | PURCHASING | read | ✅ | ❌ |
| admin | ljg_prive | ADMIN | admin | ✅ | ✅ |

**Query untuk mendapatkan role user di aplikasi tertentu:**
```sql
-- Get all roles for a user in a specific application
SELECT r.role_code, r.role_name, uar.access_level, 
       uar.can_read, uar.can_write, uar.can_delete, uar.can_admin
FROM prive.user_aplikasi_roles uar
JOIN prive.user_login ul ON uar.user_login_id = ul.id
JOIN prive.aplikasi a ON uar.aplikasi_id = a.id
JOIN prive.roles r ON uar.role_id = r.id
WHERE ul.username = 'admin'
  AND a.kode_aplikasi = 'ljg_sparepart'
  AND uar.is_active = true
  AND (uar.expires_at IS NULL OR uar.expires_at > NOW());
```

---

### Role-Aplikasi Default Access (`prive.role_aplikasi_access`)

**Catatan:** Tabel ini mendefinisikan **default permissions** untuk sebuah role di aplikasi tertentu (template), sedangkan `user_aplikasi_roles` adalah assignment aktual ke user.

```sql
-- Default permission template per role per tenant
role_id      -- FK to prive.roles
aplikasi_id  -- FK to prive.aplikasi (tenant)
access_level -- ENUM: read, write, admin, superadmin
can_read, can_write, can_delete, can_admin -- Booleans
```

---

### Transaction Codes (`prive.datakode`)

Semua kode transaksi dengan konfigurasi akuntansi otomatis:

| kode | nama | Kategori |
|------|------|----------|
| **Penjualan** | | |
| PJ | PENJUALAN | Sales |
| RJ | RETUR PENJUALAN | Sales Return |
| SO | SO (Sales Order) | Order |
| **Pembelian** | | |
| PB | PEMBELIAN | Purchase |
| RB | RETUR PEMBELIAN | Purchase Return |
| PO | PO (Purchase Order) | Order |
| LP | PENERIMAAN BARANG | Goods Receipt |
| PR | PERMINTAAN BARANG | Purchase Request |
| **Keuangan** | | |
| KM | CASH RECEIPT | Cash In |
| KK | CASH PAYMENT | Cash Out |
| BR | BANK RECEIPT | Bank In |
| BP | BANK PAYMENT | Bank Out |
| BT | BANK TRANSFER | Transfer |
| PP | PELUNASAN PIUTANG | AR Collection |
| PH | PELUNASAN HUTANG | AP Payment |
| **Inventory** | | |
| PL | STOCK TRANSFER | Transfer |
| OS | STOCK ADJUST | Adjustment |
| SC | SCRAP / RUSAK | Write-off |
| BB | Penggunaan Persediaan | Usage |
| **Akuntansi** | | |
| JU | JURNAL | General Journal |
| JV | JURNAL VOUCHER | Journal Voucher |
| AJ | ADJUSTMENT JOURNAL | Adjusting Entry |
| CL | CLOSING ENTRY | Period Close |
| DA | PENYUSUTAN | Depreciation |
| **Lainnya** | | |
| FA | FIXED ASSET ACQ | Asset Purchase |
| DS | DISPOSAL ASSET | Asset Disposal |
| GJ | PAYROLL | Salary |
| DV | DIVIDEND | Dividend |
| TRX | TRAVEL EXPENSE | Travel |

---

### Tenant Schema Tables (u1566482_sparepart - 107 tables)

#### Core Transaction Tables

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `t` | Transaction Header | id, kdtrans, tanggal, notrans, idkontak, nilaitotal, bayar, saldo |
| `d` | Transaction Detail | id, idtrans, idbarang, qty, harga, hpp, subtotal, total |
| `j` | Journal Entries | id, idtrans, rek, debit, kredit, tanggal |
| `kas` | Cash/Bank Detail | id, idtrans, idrekening, debit, kredit |

#### Master Data Tables

| Table | Description |
|-------|-------------|
| `brg` | Products/Items Master |
| `brgmerk` | Brand Master |
| `brgkategori` | Category Master |
| `brgsatuan` | Unit of Measure |
| `brginfo` | Stock per Location |
| `ktk` | Contact (Customer/Supplier) |
| `lokasi` | Warehouse/Location |
| `devisi` | Division |
| `harga` | Price Level |
| `satuan` | Unit Master |

#### Report Template Table (`laporan`)

```sql
-- Legacy report templates from MariaDB
id      -- Report ID
tipe    -- Category: Keuangan, Persediaan, etc.
subtipe -- Subcategory: Piutang, Hutang, etc.
judul   -- Report title
isi     -- bytea (Contains legacy MariaDB SQL script)
```

**Sample Reports:**
| id | tipe | subtipe | judul |
|----|------|---------|-------|
| 1 | Keuangan | Piutang | Saldo Piutang Per Nota |
| 2 | Keuangan | | Jurnal Umum |
| 5 | Keuangan | Hutang | Kartu Hutang |
| 6 | Keuangan | Piutang | Kartu Piutang |
| 7 | Persediaan | | Mutasi Barang |
| 13 | Persediaan | | Penjualan Barang Per Faktur |

**⚠️ MIGRATION NOTE:** `laporan.isi` contains MariaDB SQL that needs conversion to PostgreSQL.

---

## 🏛️ ARSITEKTUR REKOMENDASI v2.0

### Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         Load Balancer                             │
│                   (Nginx / CloudFlare)                            │
└────────────────────────────┬─────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│                      API Gateway Layer                            │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Express + Socket.IO + Auth Middleware + Rate Limit (tenant) │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Context Resolver: userId, userRole, tenantSchema, session   │ │
│  │ → Query prive.user_login, prive.roles, prive.aplikasi       │ │
│  └─────────────────────────────────────────────────────────────┘ │
└────────────────────────────┬─────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│                    Orchestrator Layer                             │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────────┐ │
│  │ Router Agent  │→ │  Specialist   │→ │  Summarizer Agent     │ │
│  │ (Intent Det.) │  │    Agents     │  │  (Business Format)    │ │
│  └───────────────┘  └───────────────┘  └───────────────────────┘ │
│                             │                                     │
│  ┌──────────────────────────▼─────────────────────────────────┐  │
│  │           Access Control Layer (RBAC)                       │  │
│  │    → Query prive.role_aplikasi_access for permissions       │  │
│  └─────────────────────────────────────────────────────────────┘  │
└────────────────────────────┬─────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│                      LLM Abstraction Layer                        │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  LLM Client (REKOMENDASI: HTTP API bukan CLI subprocess)    │ │
│  │  - Qwen API (tongyi.aliyun.com) - Primary                   │ │
│  │  - Gemini API - Backup                                       │ │
│  │  - OpenRouter - Fallback                                     │ │
│  └─────────────────────────────────────────────────────────────┘ │
└────────────────────────────┬─────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│                       Data Layer                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │
│  │  Custom Tools   │  │  Backend API    │  │  MCP Server     │   │
│  │  (Pre-built SQL)│  │  (ltech-backend)│  │  (Dynamic SQL)  │   │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘   │
│           └────────────────────┼────────────────────┘            │
│                                ▼                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Shared Connection Pool (pg-pool) + Query Cache (Redis)     │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                │                                  │
│  ┌─────────────────────────────▼───────────────────────────────┐ │
│  │              PostgreSQL (Multi-Schema)                       │ │
│  │  prive (global) | u1566482_sparepart | u1566482_leontech     │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔧 REKOMENDASI TECH STACK

### Perbandingan: CLI vs HTTP API untuk LLM

| Aspek | Qwen CLI (Saat Ini) | HTTP API (Rekomendasi) |
|-------|---------------------|------------------------|
| **Latensi** | ~3-5s (spawn process) | ~1-2s (HTTP connection) |
| **Concurrency** | Terbatas (process limit) | Tinggi (async/await) |
| **Memory** | Tinggi (per-process) | Rendah (shared client) |
| **Session** | File-based | In-memory / Redis |
| **Debugging** | Sulit (subprocess) | Mudah (HTTP traces) |
| **Scaling** | Horizontal sulit | Horizontal mudah |

### Tech Stack Rekomendasi

| Layer | Teknologi | Alasan |
|-------|-----------|--------|
| **Runtime** | Node.js 20 LTS | Stability, async I/O |
| **Framework** | Express 4.x + Socket.IO 4.x | Mature, ecosystem |
| **LLM Client** | HTTP API (axios) | Low latency, scalable |
| **Database** | PostgreSQL 15+ | JSONB, multi-schema |
| **DB Client** | `pg` with shared pool | Connection efficiency |
| **Cache** | Redis 7.x | Session, query cache |
| **Queue** | BullMQ (optional) | Async jobs, retries |
| **Observability** | Pino + Prometheus | Structured logs |

---

## 👥 MULTI-TENANT, MULTI-USER, MULTI-ROLE

### Context Object (Propagated to all agents)

```javascript
const RequestContext = {
  // Tenant (from prive.aplikasi)
  tenant: {
    id: 13,                              // aplikasi.id
    kode: 'ljg_sparepart',               // aplikasi.kode_aplikasi
    schema: 'u1566482_sparepart',        // aplikasi.db_schema
    name: 'Lucky Jaya Sparepart',        // aplikasi.nama_aplikasi
    timezone: 'Asia/Jakarta'
  },
  
  // User (from prive.user_login)
  user: {
    id: 123,                             // user_login.id
    username: 'budi.finance',            // user_login.username
    fullName: 'Budi Santoso',            // user_login.full_name
    email: 'budi@luckyjaya.co.id'        // user_login.email
    // NOTE: user_login.role is DEPRECATED, roles come from user_aplikasi_roles
  },
  
  // User's Roles in THIS Application (from prive.user_aplikasi_roles)
  // NOTE: User can have MULTIPLE roles in one application!
  roles: [
    {
      id: 8,                               // user_aplikasi_roles.role_id
      code: 'FINANCE',                     // roles.role_code
      name: 'Finance',                     // roles.role_name
      category: 'business',                // roles.role_category
      access: {
        level: 'admin',                    // user_aplikasi_roles.access_level
        canRead: true,                     // user_aplikasi_roles.can_read
        canWrite: true,                    // user_aplikasi_roles.can_write
        canDelete: false,                  // user_aplikasi_roles.can_delete
        canAdmin: true                     // user_aplikasi_roles.can_admin
      }
    },
    {
      id: 10,
      code: 'INVENTORY_MANAGER',
      name: 'Inventory Manager',
      category: 'business',
      access: {
        level: 'admin',
        canRead: true,
        canWrite: true,
        canDelete: false,
        canAdmin: true
      }
    }
  ],
  
  // Primary/Highest Role (calculated from roles array)
  primaryRole: {
    code: 'FINANCE',                       // Role with highest access_level
    name: 'Finance',
    accessLevel: 'admin'
  },
  
  // Aggregated Permissions (union of all roles)
  aggregatedAccess: {
    canRead: true,
    canWrite: true,
    canDelete: false,
    canAdmin: true,
    allowedAgents: ['finance-manager', 'inventory-manager', 'accounting-manager']
  },
  
  // Session
  session: {
    id: 'sess-abc-123',
    createdAt: '2026-01-09T01:00:00Z',
    history: []
  },
  
  // Request metadata
  request: {
    id: 'req-xyz-789',
    timestamp: '2026-01-09T01:30:00Z',
    source: 'web-chat',
    language: 'id'
  }
};
```


### Role → Agent Mapping

```javascript
const ROLE_AGENT_MAP = {
  // System Roles
  'SUPERADMIN': {
    defaultAgent: 'ceo-direksi',
    allowedAgents: ['*'],
    dataAccess: 'full'
  },
  'ADMIN': {
    defaultAgent: 'general-assistant',
    allowedAgents: ['*'],
    dataAccess: 'full'
  },
  
  // Business Roles
  'DIREKSI': {
    defaultAgent: 'ceo-direksi',
    allowedAgents: ['ceo-direksi', 'finance-manager', 'sales-manager', 'inventory-manager'],
    dataAccess: 'full'
  },
  'FINANCE': {
    defaultAgent: 'finance-manager',
    allowedAgents: ['finance-manager', 'accounting-manager'],
    dataAccess: 'financial'
  },
  'SALES_MANAGER': {
    defaultAgent: 'sales-manager',
    allowedAgents: ['sales-manager'],
    dataAccess: 'sales'  // NO cost/hpp data
  },
  'SALES': {
    defaultAgent: 'sales-manager',
    allowedAgents: ['sales-manager'],
    dataAccess: 'sales_limited'  // NO margin data
  },
  'INVENTORY_MANAGER': {
    defaultAgent: 'inventory-manager',
    allowedAgents: ['inventory-manager'],
    dataAccess: 'inventory'
  },
  'INVENTORY': {
    defaultAgent: 'inventory-manager',
    allowedAgents: ['inventory-manager'],
    dataAccess: 'inventory_limited'
  },
  'PURCHASING': {
    defaultAgent: 'purchasing-manager',
    allowedAgents: ['purchasing-manager'],
    dataAccess: 'purchasing'  // Has cost, NO selling price
  },
  'KASIR': {
    defaultAgent: 'general-assistant',
    allowedAgents: ['general-assistant'],
    dataAccess: 'pos_only'
  }
};
```

### Data Access Levels

```javascript
const DATA_ACCESS_RULES = {
  'full': {
    tables: ['*'],
    fields: { allowed: ['*'], denied: ['password_hash', 'two_factor_secret'] }
  },
  'financial': {
    tables: ['t', 'd', 'j', 'kas', 'prive.rekening'],
    fields: { allowed: ['*'], denied: [] }
  },
  'sales': {
    tables: ['t', 'd', 'brg', 'ktk'],
    fields: { 
      allowed: ['notrans', 'tanggal', 'idkontak', 'qty', 'harga', 'subtotal'], 
      denied: ['hpp', 'hargabeli', 'margin']  // NO cost data!
    }
  },
  'inventory': {
    tables: ['brg', 'brginfo', 'brgmerk', 'brgkategori', 'lokasi'],
    fields: { 
      allowed: ['id', 'nama', 'merk', 'qty', 'saldo', 'harga'],
      denied: ['hpp', 'hargabeli', 'subtotal', 'total', 'nilaitotal']
    }
  },
  'purchasing': {
    tables: ['t', 'd', 'brg', 'ktk'],
    fields: { 
      allowed: ['notrans', 'tanggal', 'idbarang', 'qty', 'hpp', 'hargabeli'],
      denied: ['harga', 'margin']  // NO selling price!
    }
  }
};
```

---

## 📝 SYSTEM PROMPTS - PRODUCTION GRADE

### 1. Meta Prompt (Shared)

```markdown
# LTECH AI ASSISTANT - META INSTRUCTIONS

## IDENTITY
You are "{AGENT_NAME}", an AI assistant for Lucky Tech Group's ERP system.

## CURRENT CONTEXT
- **Tenant:** {TENANT_NAME} (Schema: {TENANT_SCHEMA})
- **User:** {USER_FULLNAME} (@{USER_USERNAME})
- **System Role:** {USER_SYSTEM_ROLE}
- **Business Role:** {USER_BUSINESS_ROLE} ({ROLE_CATEGORY})
- **Access Level:** {ACCESS_LEVEL} (Read: {CAN_READ}, Write: {CAN_WRITE})
- **Current Time:** {CURRENT_TIMESTAMP} WIB

## CORE PRINCIPLES

### 1. ZERO HALLUCINATION POLICY
- You have ZERO knowledge about this company's data
- EVERY fact must come from database queries via tools
- If no data found → say "Data tidak ditemukan", DO NOT invent

### 2. TENANT ISOLATION (CRITICAL!)
- You can ONLY access schema: {TENANT_SCHEMA}
- NEVER reference other tenants
- Cross-tenant access = SECURITY VIOLATION

### 3. ROLE-BASED ACCESS (from prive.role_aplikasi_access)
Access Level: {ACCESS_LEVEL}
- Can Read: {CAN_READ}
- Can Write: {CAN_WRITE}
- Can Delete: {CAN_DELETE}
- Can Admin: {CAN_ADMIN}

### 4. FIELD RESTRICTIONS
{FIELD_ACCESS_RULES}

### 5. RESPONSE LANGUAGE
- Respond in Bahasa Indonesia (formal)
- Professional, data-driven
- Use tables for multi-row data
- Use ⚠️ WARNING for anomalies

### 6. TOOL PRIORITY
1. Custom Tools (get-neraca, get-laba-rugi, etc.)
2. Backend API (ltech-backend/api/*)
3. MCP/SQL (ltech-db) - last resort
```

---

### 2. Router Agent System Prompt

```markdown
# ROUTER AGENT - INTENT CLASSIFICATION & AUTHORIZATION

## YOUR ROLE
Route questions to appropriate specialist. Enforce role-based authorization.

## CONTEXT
{META_PROMPT}

## AUTHORIZATION CHECK (FIRST!)

User Business Role: {USER_BUSINESS_ROLE}
Allowed Agents for this role: {ALLOWED_AGENTS}

```
IF requested_agent NOT IN allowed_agents:
  → Route to user's default agent
  → Log: "Access denied for {requested_agent}"
```

## AVAILABLE AGENTS

| Agent ID | Role Required | Keywords |
|----------|--------------|----------|
| finance-manager | FINANCE, DIREKSI | kas, laba, neraca, margin, keuangan |
| sales-manager | SALES, SALES_MANAGER | penjualan, customer, omzet |
| inventory-manager | INVENTORY, INVENTORY_MANAGER | stok, barang, gudang |
| purchasing-manager | PURCHASING | pembelian, supplier, PO |
| general-assistant | ALL | (fallback) |

## ROUTING RULES

1. Check authorization FIRST
2. Memory intent ("ingat", "catat") → memory-manager
3. Financial keywords → finance-manager
4. Sales keywords → sales-manager
5. Inventory keywords → inventory-manager
6. Purchasing keywords → purchasing-manager
7. Default → general-assistant

## OUTPUT FORMAT (JSON)
```json
{
  "selectedAgent": "finance-manager",
  "userIntent": "Request Neraca as of Dec 2025",
  "authorization": {
    "allowed": true,
    "userRole": "FINANCE",
    "requestedAgent": "finance-manager"
  },
  "context": {
    "period": "2025-12",
    "focus": "balance_sheet"
  },
  "confidence": 0.95
}
```
```

---

### 3. Finance Manager Agent System Prompt

```markdown
# FINANCE MANAGER AGENT

## PERSONA
Senior Finance Manager with 20+ years experience in:
- Financial statement analysis (Neraca, Laba Rugi)
- Ratio analysis (GPM, NPM, Current Ratio)
- Cost control & margin optimization
- Fraud detection & anomaly identification

## CONTEXT
{META_PROMPT}

## BUSINESS DOMAIN
**Industry:** Sparepart Otomotif & Bengkel
**Characteristics:**
- Slim margins (15-25%)
- Fast inventory turnover
- High cash transactions
- Key Metrics: GPM >20%, Current Ratio >1.5, DSO <30 days

## TOOLS YOU USE
1. `get-neraca` - Balance Sheet
2. `get-laba-rugi` - Profit & Loss Statement
3. `get-saldo-kas` - Cash & Bank Balance
4. `get-buku-besar` - General Ledger

## TRANSACTION CODES (from prive.datakode)
Understand these for journal analysis:
- **PJ** = PENJUALAN (Sales)
- **PB** = PEMBELIAN (Purchase)
- **KM** = CASH RECEIPT
- **KK** = CASH PAYMENT
- **PP** = PELUNASAN PIUTANG (AR Collection)
- **PH** = PELUNASAN HUTANG (AP Payment)

## RESPONSE FORMAT

### For Data Requests:
```markdown
📊 **[Report Name] - [Period]**

| Kategori | Nilai |
|----------|-------|
| ... | Rp ... |

**Total:** Rp xxx
```

### For Analysis:
```markdown
## 📊 Executive Summary
[Key findings]

## Key Metrics
| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| GPM | 22% | >20% | ✅ |

## ⚠️ Perhatian
[Warnings]

## 💡 Rekomendasi
1. [Action 1]
```
```

---

### 4. Sales Manager Agent System Prompt

```markdown
# SALES MANAGER AGENT

## PERSONA
Sales Manager focused on revenue analysis, customer segmentation, product performance.

## CONTEXT
{META_PROMPT}

## ACCESS RESTRICTIONS ⛔
**DENIED Fields:**
- hpp (Cost of Goods)
- hargabeli (Buying price)
- margin, laba (Profit calculations)

If asked about margins:
"Maaf, informasi margin hanya dapat diakses oleh Finance Manager."

## DATA SOURCES
- `t` (header): notrans, tanggal, nilaitotal, idkontak
- `d` (detail): idbarang, qty, harga, subtotal
- `brg` (products), `brgmerk` (brands)
- `ktk` (customers)
- Filter: `kdtrans = 'PJ'` for sales

## RESPONSE FORMAT

### Ranking:
```markdown
## 🏆 Top {N} {Category} - {Period}

| # | {Entity} | Qty | Nilai |
|---|----------|-----|-------|
| 1 | xxx | xxx | Rp xxx |

**Total:** Rp xxx
```
```

---

### 5. Inventory Manager Agent System Prompt

```markdown
# INVENTORY MANAGER AGENT

## PERSONA
Warehouse Manager focused on stock levels, dead stock, reorder management.

## CONTEXT
{META_PROMPT}

## ACCESS RESTRICTIONS ⛔
**DENIED Fields:**
- subtotal, total, nilaitotal
- hpp, hargabeli
- margin, laba

**ALLOWED:**
- harga (selling price) for valuation only

## DATA SOURCES
- `brg` (products): id, nama, idmerk
- `brginfo` (stock): saldo per location
- `brgmerk`, `brgkategori` (masters)
- `lokasi` (warehouses)

## KEY ANALYSIS
1. **Current Stock** - `brginfo.saldo`
2. **Dead Stock** - No sales in >90 days
3. **Low Stock** - Below reorder point
4. **Stock Age** - FIFO analysis

## RESPONSE FORMAT

### Stock Report:
```markdown
## 📦 Stok {Location} - {Date}

| Barang | Stok | Status |
|--------|------|--------|
| xxx | 50 | ✅ |
| yyy | 5 | ⚠️ Low |
| zzz | 0 | ❌ Habis |
```
```

---

## 📁 RECOMMENDED FILE STRUCTURE

```
ai/multi-agent/
├── config/
│   ├── database.js           # DB pool config
│   ├── llm-providers.js      # LLM API config
│   ├── roles.js              # ROLE_AGENT_MAP
│   └── access-rules.js       # DATA_ACCESS_RULES
│
├── core/
│   ├── context-builder.js    # Build RequestContext from DB
│   ├── orchestrator.js       # Pipeline orchestrator
│   ├── llm-client.js         # HTTP-based LLM client
│   └── access-control.js     # RBAC enforcement
│
├── agents/
│   ├── base-agent.js         # Shared agent logic
│   ├── router.js
│   ├── finance-manager.js
│   ├── sales-manager.js
│   ├── inventory-manager.js
│   ├── purchasing-manager.js # NEW
│   └── summarizer.js
│
├── prompts/                   # External prompt files
│   ├── meta.md
│   ├── router.md
│   ├── finance-manager.md
│   ├── sales-manager.md
│   └── inventory-manager.md
│
├── tools/
│   ├── base-tool.js
│   ├── neraca-tool.js
│   ├── laba-rugi-tool.js
│   ├── saldo-kas-tool.js
│   ├── buku-besar-tool.js
│   ├── analisa-penjualan-tool.js  # NEW
│   ├── umur-stok-tool.js          # NEW
│   └── piutang-aging-tool.js      # NEW
│
├── utils/
│   ├── db-pool.js            # Centralized pool
│   ├── context-loader.js     # Load context from prive.*
│   ├── logger.js
│   └── date-parser.js
│
├── sql/
├── knowledge/
├── routes/
├── public/
│
├── server.js
└── package.json
```

---

## 📋 MIGRATION CHECKLIST

### Legacy Report Migration

The `laporan.isi` column contains MariaDB SQL scripts. To migrate:

1. **Extract SQL from bytea:**
   ```sql
   SELECT id, judul, convert_from(isi, 'UTF8') as sql_script
   FROM u1566482_sparepart.laporan
   WHERE isi IS NOT NULL;
   ```

2. **Convert MariaDB → PostgreSQL syntax:**
   - `IFNULL()` → `COALESCE()`
   - `NOW()` → `CURRENT_TIMESTAMP`
   - `DATE_FORMAT()` → `TO_CHAR()`
   - Backticks → Double quotes

3. **Create Custom Tools for frequently used reports**

---

## 🚀 DEPLOYMENT ARCHITECTURE

### Keputusan: **Microservice Terpisah**

| Aspek | Gabung ke Backend | Service Terpisah ✅ |
|-------|-------------------|---------------------|
| **Deployment** | 1 downtime = semua down | AI bisa restart tanpa ganggu ERP |
| **Scaling** | Harus scale semua | AI scale sendiri (GPU/CPU heavy) |
| **Tech Stack** | Go + Node.js = kompleks | Murni Node.js, independen |
| **Eksperimen** | Risiko tinggi | Bebas eksperimen tanpa risiko |
| **Release Cycle** | Harus sinkron | AI bisa release kapan saja |

### Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         Frontend (ui)                             │
│                    React/PWA - Production                         │
└──────────────┬───────────────────────────────┬───────────────────┘
               │                               │
               │ REST/HTTP                     │ 
               │ (ERP Operations)              │ (Future Integration)
               ▼                               │
┌──────────────────────────┐                   │
│    ltech-backend (Go)    │                   │
│    Port 8080             │                   │
│                          │                   │
│ • Auth (JWT + Session)   │                   │
│ • CRUD Operations        │                   │
│ • Business Logic         │                   │
│ • OpenAPI Docs           │                   │
└──────────────┬───────────┘                   │
               │                               │
               │    ┌──────────────────────────▼───────────────────┐
               │    │    AI Assistant Frontend (Development)       │
               │    │    Next.js/Vite - Port 3001                  │
               │    │    • Voice-first UI                          │
               │    │    • Experimental features                   │
               │    └──────────────────────────┬───────────────────┘
               │                               │ WebSocket
               │                               ▼
               │    ┌──────────────────────────────────────────────┐
               │    │         ai/multi-agent (Node.js)             │
               │    │         Port 8889                            │
               │    │                                               │
               │    │ • Chat Pipeline (Router→Specialist→Summary)  │
               │    │ • Custom Tools (SQL-based)                   │
               │    │ • LLM Integration (Qwen/Gemini)              │
               │    │ • WebSocket realtime                         │
               │    └──────────────────────────┬───────────────────┘
               │                               │
               │                               │ REST API
               │                               ▼
               │    ┌──────────────────────────────────────────────┐
               │    │         ltech-backend (Go)                   │
               │    │         (Data operations via OpenAPI)        │
               │    └──────────────────────────┬───────────────────┘
               │                               │
               └───────────────┬───────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │    PostgreSQL         │
                    │    (Shared Database)  │
                    │    + Redis (Cache)    │
                    └──────────────────────┘
```

### PM2 Configuration (Production)

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'ltech-backend',
      script: './bin/ltech-backend',
      cwd: '/home/luckyjayagroup/ltech/ltech-backend',
      instances: 1,
      env: { PORT: 8080 }
    },
    {
      name: 'ltech-ui',
      script: 'serve',
      args: '-s dist -l 3000',
      cwd: '/home/luckyjayagroup/ltech/ui'
    },
    {
      name: 'ltech-multi-agent',
      script: 'server.js',
      cwd: '/home/luckyjayagroup/ltech/ai/multi-agent',
      instances: 1,
      env: { PORT: 8889 }
    },
    {
      name: 'ltech-ai-frontend',  // Development only
      script: 'npm',
      args: 'run dev',
      cwd: '/home/luckyjayagroup/ltech/ai/multi-agent/frontend',
      env: { PORT: 3001 }
    }
  ]
};
```

---

## 🎤 AI ASSISTANT FRONTEND (Development)

### Rekomendasi Stack: **Vite + React + Voice-First UI**

Untuk pengembangan AI Assistant dengan fokus **voice/conversation**, berikut stack yang direkomendasikan:

### Tech Stack

| Layer | Teknologi | Alasan |
|-------|-----------|--------|
| **Build Tool** | Vite | Fastest HMR, simple config |
| **Framework** | React 18+ | Ecosystem, hooks |
| **Styling** | Tailwind CSS | Rapid prototyping |
| **Voice Input** | Web Speech API | Native browser, no dependency |
| **Voice Output** | Web Speech Synthesis | TTS built-in browser |
| **Realtime** | Socket.IO Client | Match backend |
| **State** | Zustand | Lightweight, simple |
| **Animation** | Framer Motion | Smooth voice visualizer |

### Struktur Folder Frontend AI

```
ai/multi-agent/frontend/
├── src/
│   ├── components/
│   │   ├── VoiceButton.jsx       # Push-to-talk / continuous listening
│   │   ├── VoiceVisualizer.jsx   # Audio waveform animation
│   │   ├── ChatBubble.jsx        # Message display
│   │   ├── ConversationView.jsx  # Full chat history
│   │   └── QuickActions.jsx      # Shortcut buttons
│   │
│   ├── hooks/
│   │   ├── useSpeechRecognition.js  # Voice input
│   │   ├── useSpeechSynthesis.js    # Text-to-speech
│   │   ├── useSocket.js             # WebSocket connection
│   │   └── useVoiceActivity.js      # VAD (Voice Activity Detection)
│   │
│   ├── services/
│   │   ├── ai-chat.js            # Socket.IO client
│   │   └── auth.js               # JWT handling
│   │
│   ├── stores/
│   │   └── chatStore.js          # Zustand state
│   │
│   ├── App.jsx
│   └── main.jsx
│
├── public/
├── index.html
├── package.json
├── vite.config.js
└── tailwind.config.js
```

### Voice-First UI Features

```javascript
// hooks/useSpeechRecognition.js
export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  const recognition = useMemo(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const instance = new SpeechRecognition();
    instance.continuous = true;
    instance.interimResults = true;
    instance.lang = 'id-ID';  // Bahasa Indonesia
    return instance;
  }, []);
  
  const startListening = () => {
    recognition.start();
    setIsListening(true);
  };
  
  const stopListening = () => {
    recognition.stop();
    setIsListening(false);
  };
  
  useEffect(() => {
    recognition.onresult = (event) => {
      const current = event.resultIndex;
      const transcript = event.results[current][0].transcript;
      setTranscript(transcript);
    };
    
    recognition.onend = () => setIsListening(false);
  }, [recognition]);
  
  return { isListening, transcript, startListening, stopListening };
}
```

```javascript
// hooks/useSpeechSynthesis.js
export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 1.0;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  };
  
  const stop = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };
  
  return { isSpeaking, speak, stop };
}
```

### Sample Voice-First UI Component

```jsx
// components/VoiceAssistant.jsx
import { useState } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { useSocket } from '../hooks/useSocket';
import { motion } from 'framer-motion';

export function VoiceAssistant() {
  const { isListening, transcript, startListening, stopListening } = useSpeechRecognition();
  const { isSpeaking, speak } = useSpeechSynthesis();
  const { sendMessage, lastResponse } = useSocket();
  const [mode, setMode] = useState('idle'); // idle, listening, thinking, speaking
  
  const handleVoiceButton = () => {
    if (isListening) {
      stopListening();
      if (transcript) {
        setMode('thinking');
        sendMessage(transcript);
      }
    } else {
      startListening();
      setMode('listening');
    }
  };
  
  // Auto-speak response
  useEffect(() => {
    if (lastResponse && !isSpeaking) {
      setMode('speaking');
      speak(lastResponse.summary);
    }
  }, [lastResponse]);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Voice Visualizer */}
      <motion.div 
        className="w-48 h-48 rounded-full bg-blue-500/20 flex items-center justify-center"
        animate={{
          scale: isListening ? [1, 1.2, 1] : 1,
          opacity: isListening ? 1 : 0.7
        }}
        transition={{ repeat: isListening ? Infinity : 0, duration: 1 }}
      >
        <button
          onClick={handleVoiceButton}
          className={`w-32 h-32 rounded-full ${
            isListening ? 'bg-red-500' : 'bg-blue-500'
          } text-white text-4xl shadow-lg hover:scale-105 transition`}
        >
          {isListening ? '🛑' : '🎤'}
        </button>
      </motion.div>
      
      {/* Status */}
      <p className="mt-8 text-white text-xl">
        {mode === 'listening' && '🎧 Mendengarkan...'}
        {mode === 'thinking' && '🤔 Memproses...'}
        {mode === 'speaking' && '🗣️ Menjawab...'}
        {mode === 'idle' && 'Tekan untuk bicara'}
      </p>
      
      {/* Transcript */}
      {transcript && (
        <p className="mt-4 text-gray-400 text-lg italic">"{transcript}"</p>
      )}
      
      {/* Response */}
      {lastResponse && (
        <div className="mt-8 max-w-lg p-4 bg-white/10 rounded-lg text-white">
          {lastResponse.summary}
        </div>
      )}
    </div>
  );
}
```

### Quick Setup Commands

```bash
# Create Vite + React project
cd /home/luckyjayagroup/ltech/ai/multi-agent
npx create-vite@latest frontend -- --template react

# Install dependencies
cd frontend
npm install socket.io-client framer-motion zustand
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Start development
npm run dev
```

---

## 🔗 INTEGRASI DENGAN FRONTEND ERP (ui)

### Migration Strategy: Legacy AI → New Multi-Agent

### Phase 1: Parallel Running (Current)
```
Frontend (ui) → Legacy AI (existing endpoint)
                 ↓
AI Dev Frontend → New Multi-Agent (testing)
```

### Phase 2: Feature Flag (Future)
```javascript
// ui/src/config/features.js
export const features = {
  newAIChat: process.env.VITE_NEW_AI_ENABLED === 'true'
};

// ui/src/components/AIChat.jsx
import { features } from '../config/features';
import LegacyChat from './LegacyChat';
import NewChat from './NewChat';

export function AIChat() {
  return features.newAIChat ? <NewChat /> : <LegacyChat />;
}
```

### Phase 3: Full Integration
```
Frontend (ui) → New Multi-Agent (production)
              → Voice + Text support
              → Unified auth via ltech-backend
```

---

## ✅ NEXT STEPS

### Phase 0: AI Frontend Setup (Week 0) 🆕
- [ ] Setup Vite + React frontend di `ai/multi-agent/frontend`
- [ ] Implement voice hooks (Speech Recognition + TTS)
- [ ] Connect ke existing WebSocket server
- [ ] Basic voice-first UI prototype

### Phase 1: Infrastructure (Week 1)
- [ ] Centralized DB pool with prive.aplikasi config
- [ ] Context loader from prive.user_login + prive.user_aplikasi_roles
- [ ] Redis caching layer

### Phase 2: RBAC Implementation (Week 2)
- [ ] Implement ROLE_AGENT_MAP
- [ ] Implement DATA_ACCESS_RULES
- [ ] Authorization check in Router

### Phase 3: LLM Migration (Week 3)
- [ ] HTTP-based LLM client
- [ ] External prompt files
- [ ] Provider fallback

### Phase 4: New Tools (Week 4)
- [ ] analisa-penjualan-tool
- [ ] umur-stok-tool
- [ ] piutang-aging-tool
- [ ] Migrate top 10 legacy reports from laporan table

### Phase 5: Production Integration (Week 5-6)
- [ ] JWT validation via ltech-backend
- [ ] Feature flag di frontend ui
- [ ] Gradual rollout new AI
- [ ] Deprecate legacy AI

---

**Dokumen ini memerlukan review dan approval sebelum implementasi.**

