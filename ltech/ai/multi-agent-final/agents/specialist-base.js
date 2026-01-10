/**
 * Specialist Agent - Base Class untuk Agent 2-9
 *
 * Finance, Sales, Inventory, CEO, Purchasing, HR, Production, Accounting, Marketing Managers
 */

import { QwenWrapper } from '../core/qwen-wrapper.js';
import { KnowledgeLoader } from '../core/knowledge-loader.js';
import { NeracaTool } from '../core/tools/neraca-tool.js';
import { LabaRugiTool } from '../core/tools/laba-rugi-tool.js';
import { SaldoKasTool } from '../core/tools/saldo-kas-tool.js';
import { BukuBesarTool } from '../core/tools/buku-besar-tool.js';
import apiClient from '../core/utils/api-client.js';


class SpecialistAgent {
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.role = config.role;
        this.systemPrompt = config.systemPrompt;

        this.qwen = new QwenWrapper();
        this.knowledgeLoader = new KnowledgeLoader();

        // Shared tools available to all specialists (legacy support)
        this.neracaTool = new NeracaTool();
        this.labaRugiTool = new LabaRugiTool();
        this.saldoKasTool = new SaldoKasTool();
        this.bukuBesarTool = new BukuBesarTool();
        this.apiClient = apiClient;
    }

    /**
     * Process user request with specialist knowledge
     */
    async process(userQuestion, routing, session, qwenSessionId) {
        try {
            // Check if user is asking for Neraca
            if (this.isNeracaRequest(userQuestion, routing)) {
                console.log(`📊 Detected Neraca request`);
                return await this.processNeracaRequest(userQuestion, session);
            }

            // Check if user is asking for Laba Rugi
            if (this.isLabaRugiRequest(userQuestion, routing)) {
                console.log(`📊 Detected Laba Rugi request`);
                return await this.processLabaRugiRequest(userQuestion, session);
            }

            // Check if user is asking for Saldo Kas/Bank
            if (this.isSaldoKasRequest(userQuestion, routing)) {
                console.log(`📊 Detected Saldo Kas request`);
                return await this.processSaldoKasRequest(userQuestion, session);
            }

            // Check if user is asking for Buku Besar
            if (this.isBukuBesarRequest(userQuestion, routing)) {
                console.log(`📊 Detected Buku Besar request`);
                return await this.processBukuBesarRequest(userQuestion, session);
            }

            // Check if request should be handled by Backend REST API
            if (this.isAPIRequest(userQuestion, routing)) {
                console.log(`📡 Detected API request, using backend REST API`);
                return await this.processAPIRequest(userQuestion, session);
            }

            // Load knowledge base (QWEN.md)
            const knowledge = await this.knowledgeLoader.loadKnowledge(this.id);

            // Build full prompt
            const fullPrompt = this.buildPrompt(
                knowledge,
                userQuestion,
                routing,
                session
            );

            // Continue Qwen session (from router)
            const result = await this.qwen.continueSession(
                qwenSessionId,
                fullPrompt,
                {
                    tenantSchema: session.tenantSchema
                }
            );

            return {
                output: result.output,
                qwenSessionId: result.sessionId,
                agent: this.id
            };
        } catch (error) {
            console.error(`${this.name} error:`, error.message);
            throw error;
        }
    }

    /**
     * Check if request is for Neraca
     */
    isNeracaRequest(question, routing) {
        const neracaKeywords = ["neraca", "balance sheet", "posisi neraca", "laporan posisi keuangan"];
        const lowerQuestion = question.toLowerCase();
        return neracaKeywords.some(keyword => lowerQuestion.includes(keyword));
    }

    /**
     * Check if request is for Laba Rugi
     */
    isLabaRugiRequest(question, routing) {
        const labaRugiKeywords = ["laba rugi", "rugi laba", "profit loss", "income statement", "laporan laba rugi", "pendapatan", "biaya"];
        const lowerQuestion = question.toLowerCase();
        return labaRugiKeywords.some(keyword => lowerQuestion.includes(keyword));
    }

    /**
     * Check if request is for Saldo Kas/Bank
     */
    isSaldoKasRequest(question, routing) {
        const saldoKasKeywords = ["saldo kas", "saldo bank", "kas dan bank", "cash and bank", "posisi kas", "berapa kas kita", "duit di bank"];
        const lowerQuestion = question.toLowerCase();
        return saldoKasKeywords.some(keyword => lowerQuestion.includes(keyword));
    }

    /**
     * Check if request is for Buku Besar (General Ledger)
     */
    isBukuBesarRequest(question, routing) {
        const bukuBesarKeywords = ["buku besar", "general ledger", "mutasi rekening", "jurnal akuntansi", "detail transaksi", "histori akun", "ledger"];
        const lowerQuestion = question.toLowerCase();
        return bukuBesarKeywords.some(keyword => lowerQuestion.includes(keyword));
    }

    /**
     * Check if request should be handled by Backend REST API
     */
    isAPIRequest(question, routing) {
        const apiKeywords = [
            "kontak", "customer", "supplier", "pelanggan", "pemasok",
            "daftar barang", "stok barang", "item detail", "price list", "harga barang",
            "profil perusahaan", "setting", "pengaturan",
            "invoice", "faktur", "nota", "purchase order", "sales order", "po", "so",
            "history transaksi", "riwayat", "log"
        ];
        const lowerQuestion = question.toLowerCase();

        // Return true if any keyword matches AND it's not handled by specialized tools
        return apiKeywords.some(keyword => lowerQuestion.includes(keyword));
    }

    /**
     * Process Neraca request using custom tool
     */
    async processNeracaRequest(question, session) {
        try {
            // Extract period from question (default to current year)
            const currentYear = new Date().getFullYear();
            const period = this.extractPeriod(question, currentYear);

            console.log(`📊 Executing Neraca tool for ${session.tenantSchema}: ${period.start_date} to ${period.end_date}`);

            // Execute neraca tool
            const result = await this.neracaTool.execute({
                schema: session.tenantSchema,
                start_date: period.start_date,
                end_date: period.end_date
            });

            // Format output for user
            const output = this.formatNeracaOutput(result.data);

            return {
                output: output,
                qwenSessionId: null, // No Qwen session for custom tool
                agent: this.id
            };
        } catch (error) {
            console.error(`❌ Neraca tool error:`, error.message);
            throw error;
        }
    }

    /**
     * Process Laba Rugi request using custom tool
     */
    async processLabaRugiRequest(question, session) {
        try {
            // Extract period from question (default to current year)
            const currentYear = new Date().getFullYear();
            const period = this.extractPeriod(question, currentYear);

            console.log(`📊 Executing Laba Rugi tool for ${session.tenantSchema}: ${period.start_date} to ${period.end_date}`);

            // Execute laba rugi tool
            const result = await this.labaRugiTool.execute({
                schema: session.tenantSchema,
                start_date: period.start_date,
                end_date: period.end_date,
                iddevisi: 1 // default division
            });

            // Format output for user
            const output = this.formatLabaRugiOutput(result.data);

            return {
                output: output,
                qwenSessionId: null, // No Qwen session for custom tool
                agent: this.id
            };
        } catch (error) {
            console.error(`❌ Laba Rugi tool error:`, error.message);
            throw error;
        }
    }

    /**
     * Process Saldo Kas request using custom tool
     */
    async processSaldoKasRequest(question, session) {
        try {
            // Extract as_of_date if any (default to today)
            const as_of_date = new Date().toISOString().split('T')[0];

            console.log(`📊 Executing Saldo Kas tool for ${session.tenantSchema}: as of ${as_of_date}`);

            // Execute tool
            const result = await this.saldoKasTool.execute({
                schema: session.tenantSchema,
                as_of_date: as_of_date
            });

            // Format output
            const output = this.formatSaldoKasOutput(result.data);

            return {
                output: output,
                qwenSessionId: null,
                agent: this.id
            };
        } catch (error) {
            console.error(`❌ Saldo Kas tool error:`, error.message);
            throw error;
        }
    }

    /**
     * Process Buku Besar request using custom tool
     */
    async processBukuBesarRequest(question, session) {
        try {
            // Default dates (today)
            const today = new Date().toISOString().split('T')[0];
            const start_date = today;
            const end_date = today;

            // TODO: Extract account_code and dates from question if needed
            // For now use broad defaults for today

            console.log(`📊 Executing Buku Besar tool for ${session.tenantSchema}: ${start_date} to ${end_date}`);

            // Execute tool
            const result = await this.bukuBesarTool.execute({
                schema: session.tenantSchema,
                start_date: start_date,
                end_date: end_date
            });

            // Format output
            const output = this.formatBukuBesarOutput(result.data);

            return {
                output: output,
                qwenSessionId: null,
                agent: this.id
            };
        } catch (error) {
            console.error(`❌ Buku Besar tool error:`, error.message);
            throw error;
        }
    }

    /**
     * Process API request using backend REST API
     */
    async processAPIRequest(question, session) {
        try {
            const lowerQuestion = question.toLowerCase();
            let endpoint = "";
            let params = {};
            let displayTitle = "";

            // Simple routing for API endpoints
            if (lowerQuestion.includes("kontak") || lowerQuestion.includes("customer") || lowerQuestion.includes("supplier")) {
                endpoint = "/api/contacts";
                displayTitle = "Daftar Kontak (Customer/Supplier)";
            } else if (lowerQuestion.includes("barang") || lowerQuestion.includes("stok")) {
                endpoint = "/api/items";
                displayTitle = "Daftar Barang & Stok";
            } else if (lowerQuestion.includes("invoice") || lowerQuestion.includes("faktur") || lowerQuestion.includes("nota")) {
                endpoint = "/api/transaksi";
                displayTitle = "Daftar Transaksi";
            }

            if (!endpoint) {
                // Fallback to general search if no specific endpoint matched but it's an API request
                endpoint = "/api/search";
                params = { q: question };
                displayTitle = "Hasil Pencarian Sistem";
            }

            console.log(`📡 API CALL [${endpoint}] for ${session.tenantSchema}`);

            const response = await this.apiClient.get(endpoint, session.tenantSchema, params);

            // Format API response
            const output = this.formatAPIOutput(displayTitle, response);

            return {
                output: output,
                qwenSessionId: null,
                agent: this.id,
                is_api_result: true
            };
        } catch (error) {
            console.error(`❌ API request error:`, error.message);
            // Fallback to normal Qwen processing if API fails
            throw error;
        }
    }

    /**
     * Format saldo kas output for presentation
     */
    formatSaldoKasOutput(data) {
        let output = `## 💰 Saldo Kas & Bank\n\n`;
        output += `**Per Tanggal:** ${data.as_of_date}\n\n`;

        data.breakdown.forEach(cat => {
            output += `### 🏦 ${cat.name}\n\n`;
            output += `| Kode | Akun | Saldo |\n`;
            output += `|------|------|-------|\n`;

            cat.accounts.forEach(acc => {
                output += `| ${acc.kode} | ${acc.akun} | ${this.formatRupiah(acc.saldo)} |\n`;
            });

            output += `\n**Total ${cat.name}:** ${this.formatRupiah(cat.total)}\n\n`;
        });

        output += `---\n`;
        output += `### 📈 Total Kas & Bank Keseluruhan: **${this.formatRupiah(data.total_saldo)}**\n`;

        return output;
    }

    /**
     * Format Buku Besar (General Ledger) output for presentation
     */
    formatBukuBesarOutput(data) {
        let output = `## 📖 Buku Besar (General Ledger)\n\n`;
        output += `**Periode:** ${data.period.start} s/d ${data.period.end}\n`;
        output += `**Filter Akun:** ${data.filters.account_code || "Semua Akun"}\n\n`;

        if (!data.transactions || data.transactions.length === 0) {
            return output + "_Tidak ada transaksi ditemukan untuk periode ini._";
        }

        output += `| Tanggal | ID Trans | No. Trans | Keterangan | Akun | Debit | Kredit |\n`;
        output += `|---------|----------|-----------|------------|------|-------|--------|\n`;

        // Show top 20 transactions to avoid hitting token limits
        data.transactions.slice(0, 20).forEach(tx => {
            const dateStr = new Date(tx.tanggal).toLocaleDateString('id-ID');
            output += `| ${dateStr} | ${tx.idtrans} | ${tx.notrans} | ${tx.uraian} | ${tx.nama_akun} | ${this.formatRupiah(tx.debit)} | ${this.formatRupiah(tx.kredit)} |\n`;
        });

        if (data.transactions.length > 20) {
            output += `\n*Menampilkan 20 dari ${data.transactions.length} transaksi.*\n`;
        }

        output += `\n---\n`;
        output += `*Total records: ${data.metadata.total_records}*\n`;

        return output;
    }

    /**
     * Format API response for presentation
     */
    formatAPIOutput(title, data) {
        let output = `## 📡 ${title}\n\n`;

        if (!data || (Array.isArray(data) && data.length === 0) || (data.success === false)) {
            return output + "⚠️ Data tidak ditemukan atau terjadi kesalahan saat memanggil API.";
        }

        // Handle array of objects (standard list response)
        const items = Array.isArray(data) ? data : (data.data || data.results || []);

        if (items.length === 0) {
            return output + "⚠️ Tidak ada data yang tersedia untuk kriteria ini.";
        }

        // Create a summary table for the first 10 items
        const firstItem = items[0];
        const keys = Object.keys(firstItem).filter(k =>
            !k.includes("id") && !k.includes("created") && !k.includes("updated") && !k.includes("deleted")
        ).slice(0, 5); // Max 5 columns

        output += `| ${keys.join(" | ")} |\n`;
        output += `| ${keys.map(() => "---").join(" | ")} |\n`;

        items.slice(0, 10).forEach(item => {
            const row = keys.map(k => {
                let val = item[k];
                if (typeof val === "number" && (k.includes("nilai") || k.includes("harga") || k.includes("total"))) {
                    return this.formatRupiah(val);
                }
                return val !== null && val !== undefined ? val : "-";
            });
            output += `| ${row.join(" | ")} |\n`;
        });

        if (items.length > 10) {
            output += `\n*Menampilkan 10 dari ${items.length} data.*\n`;
        }

        return output;
    }

    /**
     * Extract period from question (handles Indonesian relative time)
     */
    extractPeriod(question, defaultYear) {
        const today = new Date();
        const lowerQuestion = question.toLowerCase();
        let startDate = null;
        let endDate = null;

        // Pattern: [数字] bulan yang lalu (e.g., 3 bulan yang lalu)
        const monthsBackMatch = lowerQuestion.match(/(\d+)\s*bulan\s*yang\s*lalu/);
        if (monthsBackMatch) {
            const monthsBack = parseInt(monthsBackMatch[1]);
            const targetDate = new Date(today.getFullYear(), today.getMonth() - monthsBack, 1);
            const lastDay = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);

            startDate = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-01`;
            endDate = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
        }
        // Pattern: bulan lalu / bulan kemarin
        else if (lowerQuestion.includes("bulan lalu") || lowerQuestion.includes("bulan kemarin")) {
            const targetDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const lastDay = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);

            startDate = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-01`;
            endDate = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
        }
        // Pattern: tahun lalu / tahun kemarin
        else if (lowerQuestion.includes("tahun lalu") || lowerQuestion.includes("tahun kemarin")) {
            const lastYear = today.getFullYear() - 1;
            startDate = `${lastYear}-01-01`;
            endDate = `${lastYear}-12-31`;
        }
        // Pattern: tahun ini
        else if (lowerQuestion.includes("tahun ini")) {
            const currentYear = today.getFullYear();
            startDate = `${currentYear}-01-01`;
            endDate = today.toISOString().split("T")[0];
        }

        // Fallback to year extraction if no relative found or failed
        if (!endDate) {
            const yearMatch = question.match(/\b(20\d{2})\b/);
            const year = yearMatch ? yearMatch[1] : (defaultYear || today.getFullYear());
            startDate = `${year}-01-01`;
            endDate = `${year}-12-31`;
        }

        return { start_date: startDate, end_date: endDate };
    }

    /**
     * Format neraca output for presentation
     */
    formatNeracaOutput(data) {
        let output = `## 📊 Neraca (Balance Sheet)\n\n`;
        output += `**Periode:** ${data.period.end}\n\n`;

        // Show each classification
        data.classifications.forEach(cls => {
            output += `### ${cls.klasifikasi}\n\n`;
            output += `| Kode | Akun | Saldo |\n`;
            output += `|------|------|-------|\n`;

            // Show top 10 accounts
            cls.accounts.slice(0, 10).forEach(acc => {
                const saldoFormatted = new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    minimumFractionDigits: 2
                }).format(acc.saldo);

                output += `| ${acc.kode} | ${acc.akun} | ${saldoFormatted} |\n`;
            });

            const totalFormatted = new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 2
            }).format(cls.total_saldo);

            output += `\n**Total ${cls.klasifikasi}:** ${totalFormatted}\n\n`;
        });

        // Summary
        output += `### 📈 Ringkasan\n\n`;
        output += `- **Total Aktiva:** ${this.formatRupiah(data.summary.total_aktiva)}\n`;
        output += `- **Total Kewajiban:** ${this.formatRupiah(data.summary.total_kewajiban)}\n`;
        output += `- **Total Modal:** ${this.formatRupiah(data.summary.total_modal)}\n\n`;

        // Balance check
        if (data.summary.balance_check.is_balanced) {
            output += `✅ **Balance Check:** Neraca seimbang!\n`;
            output += `Aktiva (${this.formatRupiah(data.summary.balance_check.aktiva)}) = `;
            output += `Kewajiban + Modal (${this.formatRupiah(data.summary.balance_check.kewajiban_plus_modal)})\n`;
        } else {
            output += `⚠️ **Balance Check:** Selisih ${this.formatRupiah(data.summary.balance_check.difference)}\n`;
        }

        return output;
    }

    /**
     * Format Rupiah
     */
    formatRupiah(amount) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 2
        }).format(amount);
    }

    /**
     * Format laba rugi output for presentation
     */
    formatLabaRugiOutput(data) {
        let output = `## 📊 Laporan Laba Rugi (Profit & Loss Statement)\n\n`;
        output += `**Periode:** ${data.period.start} s/d ${data.period.end}\n\n`;

        if (!data.classifications || !data.classifications.pendapatan || (data.metadata && data.metadata.total_records === 0)) {
            return output + "_Tidak ada data transaksi ditemukan untuk periode ini._";
        }

        // PENDAPATAN
        output += `### 💰 PENDAPATAN\n\n`;

        // Pendapatan Utama (4)
        const pend4 = data.classifications.pendapatan.klasifikasi_4;
        if (pend4.accounts.length > 0) {
            output += `**${pend4.name}:**\n`;
            output += `| Akun | Pemasukan | Pengeluaran | Mutasi |\n`;
            output += `|------|-----------|-------------|--------|\n`;
            pend4.accounts.slice(0, 5).forEach(acc => {
                output += `| ${acc.akun} | ${this.formatRupiah(acc.pemasukan)} | ${this.formatRupiah(acc.pengeluaran)} | ${this.formatRupiah(acc.mutasi)} |\n`;
            });
            output += `**Subtotal:** ${this.formatRupiah(pend4.total_mutasi)}\n\n`;
        }

        // Pendapatan Lain (8)
        const pend8 = data.classifications.pendapatan.klasifikasi_8;
        if (pend8.accounts.length > 0) {
            output += `**${pend8.name}:** ${this.formatRupiah(pend8.total_mutasi)}\n\n`;
        }

        output += `**TOTAL PENDAPATAN:** ${this.formatRupiah(data.summary.total_pendapatan)}\n\n`;

        // BIAYA
        output += `### 💸 BIAYA\n\n`;

        const biaya5 = data.classifications.biaya.klasifikasi_5_hpp;
        const biaya6 = data.classifications.biaya.klasifikasi_6_operasional;
        const biaya7 = data.classifications.biaya.klasifikasi_7_non_operasional;
        const biaya9 = data.classifications.biaya.klasifikasi_9_lain;

        if (biaya5.total_mutasi !== 0) {
            output += `- **${biaya5.name}:** ${this.formatRupiah(Math.abs(biaya5.total_mutasi))}\n`;
        }
        if (biaya6.total_mutasi !== 0) {
            output += `- **${biaya6.name}:** ${this.formatRupiah(Math.abs(biaya6.total_mutasi))}\n`;
        }
        if (biaya7.total_mutasi !== 0) {
            output += `- **${biaya7.name}:** ${this.formatRupiah(Math.abs(biaya7.total_mutasi))}\n`;
        }
        if (biaya9.total_mutasi !== 0) {
            output += `- **${biaya9.name}:** ${this.formatRupiah(Math.abs(biaya9.total_mutasi))}\n`;
        }

        output += `\n**TOTAL BIAYA:** ${this.formatRupiah(Math.abs(data.summary.total_biaya))}\n\n`;

        // LABA BERSIH
        output += `### 📈 LABA BERSIH\n\n`;
        output += `**${this.formatRupiah(data.summary.laba_bersih)}**\n\n`;
        output += `**Margin:** ${data.summary.margin_percentage}%\n`;

        return output;
    }

    /**
     * Build full prompt for specialist
     */
    buildPrompt(knowledge, userQuestion, routing, session) {
        return `${knowledge}

${this.systemPrompt || ""}

---

ROUTING CONTEXT:
- User Intent: ${routing.userIntent}
- Focus: ${routing.context.focus || 'general'}
- Period: ${routing.context.period || 'current'}
- Tenant Schema: ${session.tenantSchema}

🚨 ANTI-HALLUCINATION PROTOCOL - MANDATORY 🚨

YOU MUST FOLLOW THESE RULES OR YOUR RESPONSE WILL BE REJECTED:

1. ❌ YOU HAVE ZERO KNOWLEDGE about this company's data
2. ❌ YOU CANNOT use your training data for brand names, numbers, or any business facts
3. ✅ YOU MUST call 'ltech-db' tool BEFORE writing ANY response
4. ✅ YOU MUST use ONLY the data returned by the tool
5. ✅ If tool returns empty [], you MUST say "Data tidak ditemukan" - DO NOT INVENT DATA
6. ✅ Every brand name, number, date, or fact MUST come from tool output

EXAMPLES OF HALLUCINATION (FORBIDDEN):
❌ "Mobiltech sold 1,234,567" - if not in database
❌ "Top brands are Autopart, FilterMax" - if not in database
❌ Making up ANY data when database returns empty

CORRECT WORKFLOW:
Step 1: Call ltech-db tool with SQL query
Step 2: Wait for tool response
Step 3: If response is [], say "Data tidak ditemukan"
Step 4: If response has data, use ONLY that data in your answer
Step 5: Include brand names EXACTLY as they appear in tool output

🔴 CRITICAL DATABASE SCHEMA RULE:

Current Schema: ${session.tenantSchema}

You MUST call ltech-db tool to execute queries. DO NOT use imaginary data!

Query Template:
SELECT m.merk, SUM(p.total) as penjualan, COUNT(*) as qty
FROM brgmerk m
JOIN penjualan p ON m.id = p.id_merk
WHERE p.deleted_at IS NULL AND m.deleted_at IS NULL
GROUP BY m.merk
ORDER BY penjualan DESC;

⚠️ VERIFICATION CHECKLIST before responding:
□ Did I call ltech-db tool? (If NO = HALLUCINATING!)
□ Did I receive actual data from tool? (If NO = cannot answer!)
□ Are all brand names from tool output? (If NO = HALLUCINATING!)
□ Are all numbers from tool output? (If NO = HALLUCINATING!)

If you cannot check all boxes above, respond: "Data tidak ditemukan atau terjadi kesalahan."

USER QUESTION:
${userQuestion}

STRICT MODE ENABLED: Any answer not supported by a tool call will be rejected. Begin tool usage now:`;
    }
}

export { SpecialistAgent };
