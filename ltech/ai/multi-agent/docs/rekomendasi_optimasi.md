# Rekomendasi Tools Tambahan & Optimasi Multi-Agent System

**Tanggal Analisis:** 9 Januari 2026  
**Konteks Bisnis:** Sparepart Otomotif & Bengkel

---

## 📊 Status Saat Ini

### Tools yang Sudah Ada:
| Tool | Fungsi | Status |
|------|--------|--------|
| `get-neraca` | Balance Sheet | ✅ Implementasi lengkap |
| `get-laba-rugi` | Profit & Loss Statement | ✅ Implementasi lengkap |
| `get-saldo-kas` | Saldo Kas & Bank | ✅ Implementasi lengkap |
| `get-buku-besar` | General Ledger Transactions | ✅ Implementasi lengkap |

### Agents yang Ada:
- `router.js` - Routing pertanyaan
- `specialist-base.js` - Base class untuk specialist agents
- `finance-manager.js` - Spesialis keuangan
- `sales-manager.js` - Spesialis penjualan
- `inventory-manager.js` - Spesialis inventory
- `general-assistant.js` - Asisten umum
- `memory-manager.js` - Manajemen memori
- `summarizer.js` - Ringkasan respons

---

## 🔧 REKOMENDASI TOOLS TAMBAHAN

### 1. **`get-analisa-penjualan` Tool** ⭐ PRIORITAS TINGGI
**Alasan:** Query analisa penjualan sudah ada di `sql/analisa_penjualan.md` dan sering dibutuhkan untuk bisnis sparepart.

```javascript
// Fitur yang harus ada:
{
  name: "get-analisa-penjualan",
  parameters: {
    schema: "tenant schema",
    start_date: "YYYY-MM-DD",
    end_date: "YYYY-MM-DD",
    group_by: "brand|category|customer|sales|product", 
    limit: 10  // Top N
  },
  output: {
    ranking: [...],
    summary: { total_sales, avg_margin },
    trends: { vs_previous_period }
  }
}
```

**Benefit:**
- Jawab pertanyaan seperti "Merk terlaris bulan ini?", "Customer paling banyak beli?"
- Mengurangi kompleksitas SQL yang harus dibuat AI on-the-fly
- Akurasi terjamin (no hallucination brands)

---

### 2. **`get-umur-stok` Tool** ⭐ PRIORITAS TINGGI
**Alasan:** Query sudah ada di `sql/analisa_umur_stok.sql`, KRITIS untuk bisnis sparepart dengan perputaran cepat.

```javascript
{
  name: "get-umur-stok",
  parameters: {
    schema: "tenant schema",
    as_of_date: "YYYY-MM-DD",
    age_threshold_days: 90,  // optional, default 90
    include_dead_stock: true
  },
  output: {
    aging_buckets: [
      { range: "0-30 hari", qty: 500, value: 50000000 },
      { range: "31-60 hari", qty: 200, value: 30000000 },
      { range: "> 90 hari (DEAD STOCK)", qty: 50, value: 15000000 }
    ],
    dead_stock_list: [...],
    recommendation: "WARNING: Dead stock Rp 15 juta..."
  }
}
```

**Benefit:**
- Deteksi dead stock otomatis
- Alert untuk barang macet yang mengikat modal
- Valuable insight untuk Finance Manager

---

### 3. **`get-piutang-aging` Tool** ⭐ PRIORITAS TINGGI
**Alasan:** Bisnis sparepart banyak kredit, perlu aging analysis untuk collection.

```javascript
{
  name: "get-piutang-aging",
  parameters: {
    schema: "tenant schema",
    as_of_date: "YYYY-MM-DD",
    include_detail: false  // true = per-invoice list
  },
  output: {
    summary: {
      total_piutang: 500000000,
      current: 300000000,      // 0-30 hari
      overdue_30_60: 100000000,
      overdue_60_90: 50000000,
      overdue_90_plus: 50000000  // RED FLAG
    },
    top_debtors: [...],
    risk_assessment: "⚠️ WARNING: 10% piutang > 90 hari"
  }
}
```

**Benefit:**
- Monitoring piutang macet
- Prioritas penagihan
- Early warning untuk bad debt

---

### 4. **`get-hutang-aging` Tool** ⭐ PRIORITAS MEDIUM
**Alasan:** Melengkapi `get-piutang-aging`, untuk manajemen AP.

```javascript
{
  name: "get-hutang-aging",
  parameters: {
    schema: "tenant schema",
    as_of_date: "YYYY-MM-DD"
  },
  output: {
    summary: { total_hutang, due_soon, overdue },
    by_supplier: [...],
    payment_schedule: [...]
  }
}
```

---

### 5. **`get-cash-flow` Tool** ⭐ PRIORITAS MEDIUM
**Alasan:** Memberikan gambaran arus kas, penting untuk planning.

```javascript
{
  name: "get-cash-flow",
  parameters: {
    schema: "tenant schema",
    start_date: "YYYY-MM-DD",
    end_date: "YYYY-MM-DD"
  },
  output: {
    inflow: { penjualan_tunai, pelunasan_piutang, penerimaan_lain },
    outflow: { pembelian_tunai, pembayaran_hutang, biaya_operasional },
    net_cashflow: 50000000,
    analysis: "Cash position sehat..."
  }
}
```

---

### 6. **`get-rasio-keuangan` Tool** ⭐ PRIORITAS MEDIUM
**Alasan:** Otomasi perhitungan rasio untuk analisis Finance Manager.

```javascript
{
  name: "get-rasio-keuangan",
  parameters: {
    schema: "tenant schema",
    end_date: "YYYY-MM-DD"
  },
  output: {
    liquidity: {
      current_ratio: 1.8,
      quick_ratio: 1.2
    },
    profitability: {
      gross_profit_margin: 25.5,
      net_profit_margin: 8.2
    },
    activity: {
      inventory_turnover: 4.5,
      receivable_turnover: 6.0
    },
    interpretation: "Current Ratio 1.8x = SEHAT..."
  }
}
```

---

## ⚡ REKOMENDASI OPTIMASI

### 1. **Connection Pooling Terpusat**
**Problem:** Setiap tool membuat Pool sendiri (`new Pool({...})`).

**Solusi:**
```javascript
// utils/db-pool.js
const { Pool } = require('pg');

let pool = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST,
      // ...config
      max: 20,  // Connection pool size
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  return pool;
}

module.exports = { getPool };
```

**Benefit:** Mengurangi overhead koneksi, lebih efisien memory.

---

### 2. **Result Caching dengan Redis**
**Problem:** Query yang sama dieksekusi berulang kali.

**Solusi:**
```javascript
// Tambahkan caching di tool
async execute(params) {
  const cacheKey = `neraca:${params.schema}:${params.end_date}`;
  
  // Check cache
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  // Execute query
  const result = await this.pool.query(sql);
  
  // Cache for 5 minutes
  await redis.setex(cacheKey, 300, JSON.stringify(result));
  
  return result;
}
```

**Benefit:** Respons lebih cepat untuk query berulang.

---

### 3. **Tool Base Class**
**Problem:** Duplikasi kode di semua tools (Pool setup, error handling, formatRupiah).

**Solusi:**
```javascript
// tools/base-tool.js
class BaseTool {
  constructor(name, description, sqlFile) {
    this.name = name;
    this.description = description;
    this.pool = getPool(); // Shared pool
    this.sqlFilePath = path.join(__dirname, '..', 'sql', sqlFile);
  }

  formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount);
  }

  async loadSQL() {
    return fs.readFile(this.sqlFilePath, 'utf-8');
  }

  // Common error handling
  async safeExecute(fn) {
    try {
      return await fn();
    } catch (error) {
      console.error(`❌ ${this.name} error:`, error.message);
      throw new Error(`Failed to execute ${this.name}: ${error.message}`);
    }
  }
}
```

---

### 4. **Enhanced Date Extraction**
**Problem:** `extractPeriod()` di specialist-base.js masih basic.

**Rekomendasi tambahan pattern:**
```javascript
// Tambahkan pattern ini:
const patterns = {
  // Kuartal
  "q1|kuartal 1|triwulan 1": { start: "01-01", end: "03-31" },
  "q2|kuartal 2|triwulan 2": { start: "04-01", end: "06-30" },
  "q3|kuartal 3|triwulan 3": { start: "07-01", end: "09-30" },
  "q4|kuartal 4|triwulan 4": { start: "10-01", end: "12-31" },
  
  // Semester
  "semester 1|h1": { start: "01-01", end: "06-30" },
  "semester 2|h2": { start: "07-01", end: "12-31" },
  
  // Relatif
  "minggu ini": () => getWeekRange(),
  "minggu lalu": () => getLastWeekRange(),
};
```

---

### 5. **Parallel Tool Execution**
**Problem:** Jika butuh multiple data, eksekusi sequential.

**Solusi:**
```javascript
// Jika butuh Neraca + Laba Rugi bersamaan
async getFinancialSummary(params) {
  const [neraca, labaRugi] = await Promise.all([
    this.neracaTool.execute(params),
    this.labaRugiTool.execute(params)
  ]);
  
  return { neraca, labaRugi };
}
```

---

### 6. **Structured Logging**
**Problem:** Log sekarang hanya console.log biasa.

**Solusi:**
```javascript
// utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'ai-agent.log' }),
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});

// Usage
logger.info('Tool executed', { 
  tool: 'get-neraca',
  schema: params.schema,
  duration_ms: Date.now() - startTime
});
```

**Benefit:** Log yang terstruktur untuk debugging dan monitoring.

---

## 📋 PRIORITAS IMPLEMENTASI

| # | Item | Effort | Impact | Priority |
|---|------|--------|--------|----------|
| 1 | `get-analisa-penjualan` | Medium | ⭐⭐⭐⭐⭐ | 🔴 HIGH |
| 2 | `get-umur-stok` | Medium | ⭐⭐⭐⭐⭐ | 🔴 HIGH |
| 3 | `get-piutang-aging` | Medium | ⭐⭐⭐⭐⭐ | 🔴 HIGH |
| 4 | Connection Pooling | Low | ⭐⭐⭐⭐ | 🟡 MEDIUM |
| 5 | Tool Base Class | Medium | ⭐⭐⭐ | 🟡 MEDIUM |
| 6 | Result Caching | Medium | ⭐⭐⭐ | 🟡 MEDIUM |
| 7 | `get-hutang-aging` | Medium | ⭐⭐⭐ | 🟡 MEDIUM |
| 8 | `get-cash-flow` | High | ⭐⭐⭐ | 🟢 LOW |
| 9 | `get-rasio-keuangan` | High | ⭐⭐⭐ | 🟢 LOW |

---

## 🎯 QUICK WINS (Bisa Dikerjakan Cepat)

1. **Connection Pooling Terpusat** (~30 menit)
2. **Tool Base Class** (~1 jam)
3. **`get-analisa-penjualan`** (~2 jam) - SQL sudah ada di `analisa_penjualan.md`
4. **`get-umur-stok`** (~2 jam) - SQL sudah ada di `analisa_umur_stok.sql`

---

## 📝 Catatan

- Semua rekomendasi tools sudah mempertimbangkan karakteristik bisnis: **margin tipis, perputaran cepat, banyak transaksi tunai**
- Prioritas diberikan pada tools yang membantu **deteksi risiko** (dead stock, piutang macet)
- SQL untuk beberapa tool sudah tersedia di folder `sql/`
