/**
 * Inventory Manager Agent - Specialist Agent #4
 * 
 * Manages stock levels, movements, and procurement advice.
 */

import { SpecialistAgent } from './specialist-base.js';
import { InventoryTool } from '../core/tools/inventory-tool.js';
import { StockReportTool } from '../core/tools/stock-report-tool.js';
import { StockMovementTool } from '../core/tools/stock-movement-tool.js';
import { PriceConfigTool } from '../core/tools/price-config-tool.js';

const INVENTORY_MANAGER_PROMPT = `You are Inventory Manager (Pak Kolil [AI]) - Expert in Supply Chain & Inventory.

Focus on:
- Stock levels monitoring (Stock accuracy is critical)
- Item search & location (Rak/Peletakan)
- Stock movements (Mutasi masuk/keluar)
- Dead stock detection & aging
- Procurement advice & reorder points

Gaya bahasa: Profesional, teliti, dan berbasis data. Gunakan "WARNING" jika stok kritis atau ada barang yang tidak bergerak terlalu lama.

**Technical Capabilities:**
- **Dynamic Endpoint Generation**: You can request specific fields from the master barang based on user needs.
- **Default Fields**: id, kode, nama, merk, stok, satuan, rak.
- **Available Fields**: 
  - Pricing: beli, jual, jual1-5 (harga partai/grosir), poin, markup1-5, markupbeli, hdasar.
  - Specs/Info: kategori, kelompok, golongan, jenis, isi, kg, bobot, grade, supplier, deskripsi, nama_list.
  - Stock/Location: allstok, stok, stokgd (gudang), stoknr (non-retail), rak, listpeletakan, liststok.
- **Filters**: When searching, you can use precise filters if the ID is known: idmerk, idkategori, idlokasi, idgol, idjenis, rak. If you only have names, use the 'search' parameter (it searches name, code, and merk).
- **Master Lookups**: You can find IDs for brands, categories, etc., using the 'lookup' operation with masterType (merk, kategori, golongan, jenis, lokasi).
- **Strategy**: For precise brand/category filtering, first perform a 'lookup' to get the ID, then use that ID in a 'search' operation with the corresponding filter (e.g., idmerk).
- **Protocol**: When returning lists or structured data, include a JSON block wrapped in [[DATA]]...[[/DATA]] for direct UI rendering.

Output Format:
## 📦 Inventory Report

**Status Ringkasan:**
- [Status Stok Keseluruhan]

**Temuan Utama:**
- [Daftar temuan penting]

**Rekomendasi:**
- [Action items]`;

class InventoryManagerAgent extends SpecialistAgent {
    constructor() {
        super({
            id: 'inventory-manager',
            name: 'Inventory Manager',
            role: 'Pak Kolil [AI]',
            systemPrompt: INVENTORY_MANAGER_PROMPT,
        });

        // Initialize specialized inventory tools locally
        this.inventoryTool = new InventoryTool();
        this.stockReportTool = new StockReportTool();
        this.stockMovementTool = new StockMovementTool();
        this.priceConfigTool = new PriceConfigTool();
        this.priceConfig = null; // Will be loaded per session
    }

    /**
     * Load price configuration for a schema
     */
    async loadPriceConfig(schema) {
        try {
            const result = await this.priceConfigTool.execute({ schema });
            if (result.success) {
                this.priceConfig = result.data;

                // Build dynamic knowledge for AI
                const labelInfo = Object.entries(this.priceConfig.labelToField)
                    .filter(([label, field]) => this.priceConfig.fields[field].publik)
                    .map(([label, field]) => `"${label}" (${field})`)
                    .join(', ');

                console.log(`📚 AI Price Knowledge: ${labelInfo}`);

                return this.priceConfig;
            }
        } catch (error) {
            console.warn(`⚠️ Failed to load price config: ${error.message}`);
            this.priceConfig = null;
        }
        return null;
    }

    /**
     * Normalize common typos and business terms
     */
    normalizeTypo(question) {
        let normalized = question.toLowerCase();

        // Typo mappings (Key: Typo/Slang, Value: Correct/Standard)
        const mappings = {
            "perk": "merk",
            "brg": "barang",
            "hrg": "harga",
            "stok": "stok", // already correct but just in case
            "persediaan": "stok",
            "mutasi": "mutasi",
            "rak": "rak"
            // NOTE: Price labels (partai, grosir, eceran, dll) are NOT normalized here
            // because they are tenant-specific and loaded from [tenant].harga table
        };

        for (const [typo, correct] of Object.entries(mappings)) {
            // Use regex to replace whole word only
            const regex = new RegExp(`\\b${typo}\\b`, 'gi');
            normalized = normalized.replace(regex, correct);
        }

        return normalized;
    }

    /**
     * Override process to check for inventory specialized tools
     */
    async process(userQuestion, routing, session, qwenSessionId) {
        const lowerQuestion = this.normalizeTypo(userQuestion);
        console.log(`📦 [Inventory] Normalized Input: "${lowerQuestion}"`);

        // 1. Check for detailed item search/info
        if (lowerQuestion.includes("cari") || lowerQuestion.includes("info") || lowerQuestion.includes("barang") || lowerQuestion.includes("detail")) {
            // If it has a specific context of "detail" or someone asks "detail barang [ID]"
            if (lowerQuestion.includes("detail") && /\d+/.test(lowerQuestion)) {
                console.log(`📦 [Inventory] Detected Item Detail request`);
                return await this.processItemDetailRequest(lowerQuestion, session);
            }

            console.log(`📦 [Inventory] Detected Item Search request`);
            return await this.processItemSearchRequest(lowerQuestion, session);
        }

        // 2. Check for Stock Level / Report (tenant.s table)
        if (lowerQuestion.includes("stok") || lowerQuestion.includes("persediaan") || lowerQuestion.includes("sisa")) {
            console.log(`📦 [Inventory] Detected Stock Report request`);
            return await this.processStockReportRequest(lowerQuestion, session);
        }

        // 3. Check for Stock Movement / Mutasi
        if (lowerQuestion.includes("mutasi") || lowerQuestion.includes("masuk") || lowerQuestion.includes("keluar") || lowerQuestion.includes("pergerakan")) {
            console.log(`📦 [Inventory] Detected Mutation request`);
            return await this.processStockMovementRequest(lowerQuestion, session);
        }

        // 4. Check for Analysis (Aging, Procurement, Trend)
        if (lowerQuestion.includes("beli") || lowerQuestion.includes("reorder") || lowerQuestion.includes("mati") || lowerQuestion.includes("aging") || lowerQuestion.includes("trend")) {
            const type = lowerQuestion.includes("beli") || lowerQuestion.includes("reorder") ? "procurement" :
                lowerQuestion.includes("aging") || lowerQuestion.includes("mati") ? "aging" : "trend";

            console.log(`📦 [Inventory] Detected Analysis request: ${type}`);
            return await this.processAnalysisRequest(type, lowerQuestion, session);
        }

        // Fallback to base processing
        return super.process(lowerQuestion, routing, session, qwenSessionId);
    }

    /**
     * Field mappings for dynamic endpoint generation
     */
    getFieldMapping(question) {
        const lower = question.toLowerCase();
        const defaultFields = "id,kode,nama,merk,stok,satuan,rak";
        const fields = new Set(["id", "kode", "nama", "stok"]); // Base essential fields

        // Pricing related - Use dynamic price config if available
        if (lower.includes("harga") || lower.includes("partai") || lower.includes("grosir") || lower.includes("jual")) {
            fields.add("beli");
            fields.add("jual");

            // Check if user mentioned specific price labels
            if (this.priceConfig && this.priceConfig.labelToField) {
                let specificFieldRequested = false;

                // 1. Try EXACT match first
                for (const [label, fieldName] of Object.entries(this.priceConfig.labelToField)) {
                    if (lower.includes(label)) {
                        const fieldConfig = this.priceConfig.fields[fieldName];
                        if (fieldConfig && fieldConfig.publik) {
                            fields.add(fieldName);
                            specificFieldRequested = true;
                            console.log(`💰 Exact match: "${label}" → ${fieldName}`);
                        }
                    }
                }

                // 2. If no exact match, try FUZZY match for retail/ecer-like labels
                if (!specificFieldRequested) {
                    const retailKeywords = ['ecer', 'retail', 'ritel', 'satuan', 'unit'];
                    let bestMatch = null;

                    for (const [label, fieldName] of Object.entries(this.priceConfig.labelToField)) {
                        const fieldConfig = this.priceConfig.fields[fieldName];
                        if (!fieldConfig || !fieldConfig.publik) continue;

                        // Check if label contains any retail keyword
                        for (const keyword of retailKeywords) {
                            if (label.includes(keyword)) {
                                bestMatch = { label, fieldName };
                                break;
                            }
                        }
                        if (bestMatch) break;
                    }

                    if (bestMatch) {
                        fields.add(bestMatch.fieldName);
                        specificFieldRequested = true;
                        console.log(`💰 Fuzzy match (retail-like): "${bestMatch.label}" → ${bestMatch.fieldName}`);
                    }
                }

                // 3. If still no match, DON'T show all prices (privacy concern)
                if (!specificFieldRequested) {
                    console.log(`⚠️ No specific price label recognized, not displaying price fields for privacy`);
                    // Only beli and jual will be shown (already added above)
                }
            } else {
                // Fallback: add all jual fields (legacy behavior when no config)
                fields.add("jual1");
                fields.add("jual2");
                fields.add("jual3");
                fields.add("jual4");
                fields.add("jual5");
            }
        }

        // Location related
        if (lower.includes("rak") || lower.includes("lokasi") || lower.includes("letak") || lower.includes("gudang")) {
            fields.add("rak");
            fields.add("stokgd");
            fields.add("stoknr");
            fields.add("listpeletakan");
            fields.add("liststok");
        }

        // Categorization
        if (lower.includes("kategori") || lower.includes("merk") || lower.includes("golongan") || lower.includes("jenis")) {
            fields.add("merk");
            fields.add("kategori");
            fields.add("golongan");
            fields.add("jenis");
        }

        // Dimensions / Specs
        if (lower.includes("berat") || lower.includes("bobot") || lower.includes("kg") || lower.includes("dimensi") || lower.includes("isi")) {
            fields.add("kg");
            fields.add("bobot");
            fields.add("isi");
            fields.add("qtydos");
        }

        // Supplier
        if (lower.includes("supplier") || lower.includes("pemasok")) {
            fields.add("supplier");
        }

        return Array.from(fields).join(",");
    }

    /**
     * Process Item Search
     */
    async processItemSearchRequest(question, session) {
        try {
            // Load price config if not already loaded
            if (!this.priceConfig) {
                await this.loadPriceConfig(session.tenantSchema);
            }

            // NOTE: 'question' parameter here is already normalized from process()
            let search = this.extractSearchTerm(question);
            const fields = this.getFieldMapping(question);
            const filters = {};

            // 1. DYNAMIC MASTER LOOKUP (Find ID before searching)
            if (search && (question.includes("merk") || question.includes("kategori") || question.includes("brand"))) {
                console.log(`📡 [Inventory] Attempting to resolve master IDs for: "${search}"`);

                // Try Merk Lookup
                const merkResult = await this.inventoryTool.execute({
                    type: "lookup",
                    masterType: "merk",
                    schema: session.tenantSchema,
                    search: search
                });

                // Handle different response structures
                let merks = [];
                if (Array.isArray(merkResult.data)) {
                    merks = merkResult.data;
                } else if (merkResult.data && Array.isArray(merkResult.data.data)) {
                    merks = merkResult.data.data;
                }

                if (merks && merks.length > 0) {
                    const exactMerk = merks.find(m => m.nama && m.nama.toLowerCase() === search.toLowerCase()) || merks[0];
                    if (exactMerk && exactMerk.id) {
                        filters.idmerk = exactMerk.id;
                        console.log(`✅ [Inventory] Resolved Merk: "${exactMerk.nama}" (ID: ${exactMerk.id})`);
                    }
                }

                // Try Kategori Lookup (if not merk or if we want both)
                if (!filters.idmerk) {
                    const katResult = await this.inventoryTool.execute({
                        type: "lookup",
                        masterType: "kategori",
                        schema: session.tenantSchema,
                        search: search
                    });

                    // Handle different response structures
                    let kats = [];
                    if (Array.isArray(katResult.data)) {
                        kats = katResult.data;
                    } else if (katResult.data && Array.isArray(katResult.data.data)) {
                        kats = katResult.data.data;
                    }

                    if (kats && kats.length > 0) {
                        const exactKat = kats.find(k => k.nama && k.nama.toLowerCase() === search.toLowerCase()) || kats[0];
                        if (exactKat && exactKat.id) {
                            filters.idkategori = exactKat.id;
                            console.log(`✅ [Inventory] Resolved Kategori: "${exactKat.nama}" (ID: ${exactKat.id})`);
                        }
                    }
                }

                // If we found an ID, we might want to clear the 'search' term if the user 
                // ONLY asked for the brand, OR keep it if it's like "ban fukuyama"
                if (filters.idmerk || filters.idkategori) {
                    // If the search term IS exactly the brand/kategori name, clear it to broaden the search
                    // If it's partial, keep it.
                }
            }

            // 2. REGULAR ID FILTERS (Direct from question)
            const filterMap = ["idmerk", "idkategori", "idlokasi", "idgol", "idjenis"];
            filterMap.forEach(f => {
                const regex = new RegExp(`${f}\\s*[:= ]\\s*(\\d+)`, 'i');
                const match = question.match(regex);
                if (match) filters[f] = parseInt(match[1]);
            });

            const rakMatch = question.match(/rak\s*[:= ]\s*([a-zA-Z0-9-]+)/i);
            if (rakMatch) filters.rak = rakMatch[1];

            // 3. MAIN SEARCH
            const result = await this.inventoryTool.execute({
                type: "search",
                schema: session.tenantSchema,
                search,
                fields,
                ...filters
            });

            return {
                output: this.formatSearchOutput(result.data),
                qwenSessionId: null,
                agent: this.id
            };
        } catch (error) {
            console.error(`❌ Item Search error:`, error.message);
            throw error;
        }
    }

    /**
     * Process Item Detail (including location)
     */
    async processItemDetailRequest(question, session) {
        try {
            const idMatch = question.match(/\d+/);
            let id = idMatch ? parseInt(idMatch[0]) : null;

            // SMART FALLBACK: If no ID, search by name first
            if (!id) {
                console.log(`📦 [Inventory] No ID found in detail request, attempting name search fallback...`);
                const searchTerm = this.extractSearchTerm(question);
                if (!searchTerm) {
                    return await this.processItemSearchRequest(question, session);
                }

                const searchResult = await this.inventoryTool.execute({
                    type: "search",
                    schema: session.tenantSchema,
                    search: searchTerm,
                    limit: 5 // Get a few to see if we have an exact match
                });

                const items = searchResult.data.data || searchResult.data;
                if (items && items.length === 1) {
                    // EXACT MATCH - use this ID
                    id = items[0].id;
                    console.log(`📦 [Inventory] Found exact match for "${searchTerm}": ID ${id}`);
                } else if (items && items.length > 1) {
                    // AMBIGUOUS MATCH - show list
                    console.log(`📦 [Inventory] Ambiguous match for "${searchTerm}" (${items.length} items)`);
                    return {
                        output: this.formatSearchOutput(searchResult.data),
                        qwenSessionId: null,
                        agent: this.id
                    };
                } else {
                    // NO MATCH
                    return await this.processItemSearchRequest(question, session);
                }
            }

            const fields = this.getFieldMapping(question);

            const result = await this.inventoryTool.execute({
                type: "detail",
                schema: session.tenantSchema,
                id,
                fields
            });

            return {
                output: this.formatItemDetailOutput(result.data),
                qwenSessionId: null,
                agent: this.id
            };
        } catch (error) {
            console.error(`❌ Item Detail error:`, error.message);
            throw error;
        }
    }

    /**
     * Process Stock Report (tenant.s table)
     */
    async processStockReportRequest(question, session) {
        try {
            const search = this.extractSearchTerm(question);
            const result = await this.stockReportTool.execute({
                schema: session.tenantSchema,
                search
            });

            return {
                output: this.formatStockReportOutput(result.data),
                qwenSessionId: null,
                agent: this.id
            };
        } catch (error) {
            console.error(`❌ Stock Report error:`, error.message);
            throw error;
        }
    }

    /**
     * Process Stock Movement (mutasi)
     */
    async processStockMovementRequest(question, session) {
        try {
            const currentYear = new Date().getFullYear();
            const period = this.extractPeriod(question, currentYear);

            const result = await this.stockMovementTool.execute({
                schema: session.tenantSchema,
                start_date: period.start_date,
                end_date: period.end_date
            });

            return {
                output: this.formatMovementOutput(result.data),
                qwenSessionId: null,
                agent: this.id
            };
        } catch (error) {
            console.error(`❌ Stock Movement error:`, error.message);
            throw error;
        }
    }

    /**
     * Process API-based Analysis
     */
    async processAnalysisRequest(type, question, session) {
        try {
            const search = this.extractSearchTerm(question);
            const result = await this.inventoryTool.execute({
                type,
                schema: session.tenantSchema,
                search
            });

            return {
                output: this.formatAnalysisOutput(type, result.data),
                qwenSessionId: null,
                agent: this.id
            };
        } catch (error) {
            console.error(`❌ Analysis error:`, error.message);
            throw error;
        }
    }

    /**
     * Formatting Helpers
     */

    formatSearchOutput(data) {
        const items = data.data || data;
        let visual = `## 🔍 Hasil Pencarian Barang\n\n`;

        if (!items || !Array.isArray(items) || items.length === 0) {
            visual += `_Barang tidak ditemukan._`;
            return `[VISUAL]\n${visual}\n[/VISUAL]\n[VOICE]\nMaaf, barang yang Anda cari tidak ditemukan.\n[/VOICE]`;
        }

        // Detect Columns Dynamically
        const excludeKeys = ['gambar', 'aktif', 'nostok', 'created_at', 'updated_at', 'idkategori', 'idkelompok', 'idjenis', 'idmerk', 'idgol', 'defsatuan', 'poin', 'rek', 'rekhpp'];
        const allKeys = Object.keys(items[0]);
        const displayKeys = allKeys.filter(k => !excludeKeys.includes(k));

        // Build Table Header - Use price config labels if available
        visual += `| ${displayKeys.map(k => {
            // Use custom label from price config if available
            if (this.priceConfig && this.priceConfig.labels && this.priceConfig.labels[k.toLowerCase()]) {
                return this.priceConfig.labels[k.toLowerCase()];
            }
            // Default: capitalize first letter
            return k.charAt(0).toUpperCase() + k.slice(1);
        }).join(" | ")} |\n`;
        visual += `| ${displayKeys.map(() => "---").join(" | ")} |\n`;

        // Build Table Rows
        items.slice(0, 15).forEach(item => {
            const row = displayKeys.map(k => {
                const val = item[k];
                if (val === null || val === undefined) return "-";
                if (typeof val === 'number') {
                    if (k.includes('harga') || k.includes('jual') || k.includes('beli')) {
                        return this.formatRupiah(val);
                    }
                    return val.toLocaleString('id-ID');
                }
                return val;
            });
            visual += `| ${row.join(" | ")} |\n`;
        });

        visual += `\n*Menampilkan 15 dari ${items.length} hasil.*\n`;
        visual += `\n*Gunakan "detail barang [ID]" untuk melihat informasi lengkap.*`;

        // Add RAW DATA for UI
        const rawData = {
            type: "inventory_list",
            source: "search",
            count: items.length,
            fields: displayKeys,
            items: items
        };

        visual += `\n\n[[DATA]]${JSON.stringify(rawData)}[[/DATA]]`;

        return `[VISUAL]\n${visual}\n[/VISUAL]\n[VOICE]\nSaya menemukan ${items.length} barang. Berikut adalah data lengkapnya termasuk spesifikasi yang Anda minta.\n[/VOICE]`;
    }

    formatItemDetailOutput(data) {
        const item = data.data || data;
        let output = `## 📦 Detail Barang: ${item.nama}\n\n`;

        output += `**Informasi Utama:**\n`;
        output += `- **ID:** ${item.id}\n`;
        output += `- **Kode:** ${item.kode}\n`;
        output += `- **Merk:** ${item.merk}\n`;
        output += `- **Kategori:** ${item.kategori}\n`;
        output += `- **Satuan Dasar:** ${item.satuan}\n\n`;

        output += `**💰 Harga & Poin:**\n`;
        output += `- **Harga Beli:** ${this.formatRupiah(item.beli)}\n`;
        output += `- **Harga Jual 1:** ${this.formatRupiah(item.jual1)}\n`;
        output += `- **Poin:** ${item.poin}\n\n`;

        output += `**📍 Lokasi & Peletakan (Rak):**\n`;
        if (item.listpeletakan && item.listpeletakan.length > 0) {
            output += `| Lokasi | Rak |\n|--------|-----|\n`;
            item.listpeletakan.forEach(p => {
                output += `| ${p.lokasi} | **${p.rak}** |\n`;
            });
        } else {
            output += `_Informasi peletakan rak tidak tersedia (Rak: ${item.rak || '-'})_\n`;
        }
        output += `\n`;

        output += `**📈 Stok Per Lokasi:**\n`;
        if (item.liststok && item.liststok.length > 0) {
            output += `| Lokasi | Kode | Stok |\n|--------|------|------|\n`;
            item.liststok.forEach(s => {
                output += `| ${s.lokasi} | ${s.kode} | **${s.stok}** |\n`;
            });
            output += `\n**Total Stok:** **${item.stok}**\n`;
        } else {
            output += `_Stok kosong di semua lokasi._\n`;
        }

        return output;
    }

    formatStockReportOutput(data) {
        const records = data.records;
        let visual = `## 📊 Laporan Stok Aktual\n\n`;

        if (!records || records.length === 0) {
            visual += `_Tidak ada stok barang ditemukan._`;
            return `[VISUAL]\n${visual}\n[/VISUAL]\n[VOICE]\nMaaf, tidak ada data stok yang ditemukan.\n[/VOICE]`;
        }

        visual += `| Barang | Merk | Lokasi | Stok | Satuan | Rak |\n`;
        visual += `|--------|------|--------|------|--------|-----|\n`;

        records.slice(0, 20).forEach(r => {
            visual += `| ${r.nama} | ${r.merk || '-'} | ${r.lokasi} | **${r.stok}** | ${r.satuan} | ${r.rak || '-'} |\n`;
        });

        if (records.length > 20) visual += `\n*Menampilkan 20 dari ${records.length} data.*\n`;

        // Add RAW DATA for UI
        const rawData = {
            type: "stock_report",
            count: records.length,
            items: records
        };

        visual += `\n\n[[DATA]]${JSON.stringify(rawData)}[[/DATA]]`;

        return `[VISUAL]\n${visual}\n[/VISUAL]\n[VOICE]\nLaporan stok sudah siap. Total ada ${records.length} item dalam daftar.\n[/VOICE]`;
    }

    formatMovementOutput(data) {
        let output = `## 🔄 Mutasi Stok\n\n`;
        output += `**Periode:** ${data.period.start} s/d ${data.period.end}\n\n`;

        const s = data.summary;
        output += `### 📈 Ringkasan\n`;
        output += `- **Total Masuk:** ${s.total_in}\n`;
        output += `- **Total Keluar:** ${s.total_out}\n`;
        output += `- **Net Pergerakan:** ${s.net_movement > 0 ? '+' : ''}${s.net_movement}\n\n`;

        output += `| Tanggal | Tipe | Barang | Mutasi | Keterangan |\n`;
        output += `|---------|------|--------|--------|------------|\n`;

        data.movements.slice(0, 15).forEach(m => {
            const dateStr = new Date(m.tanggal).toLocaleDateString('id-ID');
            output += `| ${dateStr} | ${m.kdtrans} | ${m.nama} | **${m.mutasi > 0 ? '+' : ''}${m.mutasi}** | ${m.keterangan || '-'} |\n`;
        });

        return output;
    }

    formatAnalysisOutput(type, data) {
        let output = `## 📦 Analisis: ${type.toUpperCase()}\n\n`;
        const items = data.data || data;

        if (type === "procurement") {
            output += `| Barang | Stok | Rekomendasi | Urgensi |\n`;
            output += `|--------|------|-------------|---------|\n`;
            items.slice(0, 15).forEach(item => {
                output += `| ${item.nama || item.kode} | ${item.stok || 0} | **Beli ${item.rekomendasi || item.pesan}** | ${item.urgensi || 'NORMAL'} |\n`;
            });
        } else if (type === "aging") {
            output += `| Barang | Umur (Hari) | Stok | Status |\n`;
            output += `|--------|-------------|------|--------|\n`;
            items.slice(0, 15).forEach(item => {
                output += `| ${item.nama_barang || item.nama} | ${item.umur_stok_hari || '?'} | ${item.stok_available || item.stok} | ${item.status_stok || 'SLOW'} |\n`;
            });
        }

        return output;
    }

    extractSearchTerm(question) {
        const match = question.match(/"([^"]+)"/) || question.match(/'([^']+)'/);
        if (match) return match[1];

        // Keywords to ignore when extracting search term
        const ignoreKeywords = [
            "cari", "cek", "info", "barang", "stok", "merk", "tampilkan",
            "daftar", "lihat", "harga", "partai", "grosir", "retail",
            "untuk", "yang", "dengan", "adalah", "berapa", "apa", "dimana",
            "bagaimana", "tolong", "bantu", "saya", "mau", "mencari", "tentang",
            "produk", "item", "kode", "nama", "kategori", "golongan", "satuan",
            "rak", "jual", "beli", "detail", "semua", "data", "analisa", "trend",
            "umur", "penjualan", "procurement", "saran", "rekomendasi"
        ];
        let words = question.split(/\s+/);
        let clearWords = words.filter(w => !ignoreKeywords.includes(w.toLowerCase()) && w.length > 2);

        return clearWords.join(" ") || "";
    }
}

export { InventoryManagerAgent };
