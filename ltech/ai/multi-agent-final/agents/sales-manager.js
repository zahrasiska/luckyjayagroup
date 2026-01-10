/**
 * Sales Manager Agent - Specialist untuk Sales & Pricelist
 */

import { SpecialistAgent } from './specialist-base.js';
import { InventoryTool } from '../core/tools/inventory-tool.js';
import { PriceConfigTool } from '../core/tools/price-config-tool.js';
import pkg from 'pg';
const { Pool } = pkg;

class SalesManagerAgent extends SpecialistAgent {
    constructor() {
        super({
            id: 'sales-manager',
            name: 'Sales Manager - Pak Rudi'
        });

        // Initialize tools
        this.inventoryTool = new InventoryTool();
        this.priceConfigTool = new PriceConfigTool();
        this.priceConfig = null;

        // Direct DB Pool (Bypass API)
        this.pool = new Pool({
            host: process.env.DB_HOST || "localhost",
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || "luckyjayagroup",
            user: process.env.DB_USER || "knavinkids",
            password: process.env.DB_PASSWORD || "Duaribu#25##",
        });

        this.systemPrompt = `Anda adalah Pak Rudi Santoso, Sales Manager di Lucky Tech Group.

KAPABILITAS ANDA:
- Menyusun price list produk
- Analisa penjualan dan revenue
- Memberikan rekomendasi harga strategis

TOOLS AVAILABLE:
1. **InventoryTool** - Untuk get daftar produk dengan harga (API/DB)
2. **PriceConfigTool** - Untuk get label harga dinamis

PROTOKOL PRICELIST:
Saat user minta "pricelist", "daftar harga", atau "katalog":

1. Load price config untuk label harga
2. Query produk dengan fields:
   - WAJIB: kode, nama, merk
   - HARGA: Semua public price fields (jual1-jual5 yang publik=true)
   - OPTIONAL: kategori, jenis, stok (jika diminta)

3. Format response:
   - Header: "Pricelist [Merk/Kategori]"
   - Tabel rapi dengan kolom: Kode | Nama Produk | Merk | [Price Labels]
   - Footer: Total items, catatan harga

EXAMPLE OUTPUT:
# Pricelist Produk Fukuyama

| Kode | Nama Produk | Merk | Eceran | Partai | Sales |
|------|-------------|------|--------|--------|-------|
| FKY-001 | Ban Motor | Fukuyama | Rp 150.000 | Rp 140.000 | Rp 135.000 |

**Total: 50 produk**
*Harga dapat berubah sewaktu-waktu*

CRITICAL RULES:
- ALWAYS include semua public price fields
- NEVER hardcode price labels, use dynamic labels
- Format currency properly: "Rp 150.000"
- If no price data available, inform clearly`;
    }

    async loadPriceConfig(schema) {
        if (this.priceConfig) return this.priceConfig;
        try {
            const result = await this.priceConfigTool.execute({ schema });
            if (result.success) {
                this.priceConfig = result.data;
                console.log(`💰 [Sales] Loaded price config: ${this.priceConfig.publicFields.join(', ')}`);
                return this.priceConfig;
            }
        } catch (error) {
            console.warn(`⚠️ [Sales] Failed to load price config: ${error.message}`);
        }
        return null; // Should handle null gracefully downstream
    }

    isPricelistRequest(question) {
        const lower = question.toLowerCase();
        const keywords = [
            'pricelist', 'price list', 'daftar harga', 'katalog',
            'harga jual', 'list harga', 'harga produk'
        ];
        return keywords.some(kw => lower.includes(kw));
    }

    async processPricelistRequest(question, session, qwenSessionId) {
        const schema = session.tenantSchema;
        await this.loadPriceConfig(schema);

        // Build fields to display
        const defaultFields = ['kode', 'nama', 'merk'];

        if (this.priceConfig && this.priceConfig.publicFields) {
            defaultFields.push(...this.priceConfig.publicFields);
        } else {
            // Fallback if config failed/empty
            defaultFields.push('jual1', 'jual2', 'jual3', 'jual4', 'jual5');
        }

        const lower = question.toLowerCase();
        if (lower.includes('kategori')) defaultFields.push('kategori');
        if (lower.includes('jenis')) defaultFields.push('jenis');
        // Stok removed from query to catch errors, but logic check remains
        // if (lower.includes('stok')) defaultFields.push('stok'); // Disabled for safety

        // Lookup Filters
        const filters = {};

        // Merk Lookup (Use API because it works for lookup)
        const merkMatch = question.match(/merk\s+(\w+)/i);
        if (merkMatch) {
            const merkName = merkMatch[1];
            try {
                const merkLookup = await this.inventoryTool.execute({
                    type: 'lookup',
                    masterType: 'merk',
                    schema,
                    search: merkName
                });

                if (merkLookup.success) {
                    let merks = [];
                    if (Array.isArray(merkLookup.data)) merks = merkLookup.data;
                    else if (merkLookup.data?.data) merks = merkLookup.data.data;

                    const merk = merks.find(m => m.id) || merks[0];
                    if (merk?.id) {
                        filters.idmerk = merk.id;
                        console.log(`✅ [Sales] Found merk: ${merkName} → ID ${filters.idmerk}`);
                    }
                }
            } catch (e) {
                console.warn(`⚠️ [Sales] Merk lookup failed: ${e.message}`);
            }
        }

        // Kategori Lookup
        const katMatch = question.match(/kategori\s+(\w+)/i);
        if (katMatch) {
            const katName = katMatch[1];
            try {
                const katLookup = await this.inventoryTool.execute({
                    type: 'lookup',
                    masterType: 'kategori',
                    schema,
                    search: katName
                });

                if (katLookup.success) {
                    let kats = [];
                    if (Array.isArray(katLookup.data)) kats = katLookup.data;
                    else if (katLookup.data?.data) kats = katLookup.data.data;

                    const kat = kats.find(k => k.id) || kats[0];
                    if (kat?.id) {
                        filters.idkategori = kat.id;
                        console.log(`✅ [Sales] Found kategori: ${katName} → ID ${filters.idkategori}`);
                    }
                }
            } catch (e) { console.warn('Kategori lookup failed'); }
        }

        console.log(`📡 [Sales] Fetching pricelist via Direct DB...`);
        console.log(`   Filters:`, filters);

        // Build SQL
        const values = [];
        let pIdx = 1;
        let whereClause = "";

        if (filters.idmerk) {
            whereClause += ` AND b.idmerk = $${pIdx++}`;
            values.push(filters.idmerk);
        }
        if (filters.idkategori) {
            whereClause += ` AND b.idkategori = $${pIdx++}`;
            values.push(filters.idkategori);
        }

        // Query
        // Safe left joins. Schema is injected but comes from trusted session context
        const sql = `
            SELECT b.kode, b.nama, m.nama as merk, k.nama as kategori, j.nama as jenis,
                   b.jual1, b.jual2, b.jual3, b.jual4, b.jual5
            FROM ${schema}.barang b
            LEFT JOIN ${schema}.merk m ON b.idmerk = m.id
            LEFT JOIN ${schema}.kategori k ON b.idkategori = k.id
            LEFT JOIN ${schema}.jenis j ON b.idjenis = j.id
            WHERE 1=1 ${whereClause}
            ORDER BY b.nama ASC
            LIMIT 500
        `;

        try {
            const res = await this.pool.query(sql, values);
            console.log(`✅ [Sales] DB Query Success. Got ${res.rows.length} rows.`);

            const output = this.formatPricelist(res.rows, defaultFields);
            return {
                output,
                success: true,
                qwenSessionId // Maintain session
            };

        } catch (err) {
            console.error(`❌ [Sales] DB Query Error:`, err.message);
            throw new Error(`DB Error: ${err.message}`);
        }
    }

    formatPricelist(items, fields) {
        if (!items || items.length === 0) return "Tidak ada produk ditemukan.";

        // Header mapping with price configs
        const headers = fields.map(field => {
            if (this.priceConfig?.labels?.[field]) return this.priceConfig.labels[field];
            const map = {
                'kode': 'Kode', 'nama': 'Nama Produk', 'merk': 'Merk',
                'kategori': 'Kategori', 'jenis': 'Jenis', 'stok': 'Stok'
            };
            return map[field] || field.toUpperCase();
        });

        let table = '| ' + headers.join(' | ') + ' |\n';
        table += '|' + headers.map(() => '---').join('|') + '|\n';

        // Limit table display to first 50 items to prevent UI overload
        const displayItems = items.slice(0, 50);

        for (const item of displayItems) {
            const row = fields.map(field => {
                const value = item[field];
                if (value === null || value === undefined) return '-';
                if (field.startsWith('jual') && !isNaN(value)) {
                    // 0 price usually means not set/active for that tier
                    if (value == 0) return '-';
                    return 'Rp ' + Number(value).toLocaleString('id-ID');
                }
                return String(value);
            });
            table += '| ' + row.join(' | ') + ' |\n';
        }

        // Add [[DATA]] tag to pass FULL structured data to UI and skip summarizer
        // We pass ALL items in JSON for potential client-side needs
        const jsonData = {
            type: 'pricelist',
            items: items,
            count: items.length
        };

        return `[[DATA]]${JSON.stringify(jsonData)}[[/DATA]]

${table}

**Total: ${items.length} produk${items.length > 50 ? ' (Menampilkan 50 teratas)' : ''}**
*Harga dapat berubah sewaktu-waktu.*`;
    }

    async process(userQuestion, routing, session, qwenSessionId) {
        console.log(`\n📊 [Sales Manager] Processing...`);
        try {
            if (this.isPricelistRequest(userQuestion)) {
                console.log(`💰 [Sales] Detected PRICELIST request`);
                return await this.processPricelistRequest(userQuestion, session, qwenSessionId);
            }
            return await super.process(userQuestion, routing, session, qwenSessionId);
        } catch (error) {
            console.error(`❌ [Sales] Error: ${error.message}`);
            return { output: `Error: ${error.message}`, success: false, qwenSessionId };
        }
    }
}

export { SalesManagerAgent };
