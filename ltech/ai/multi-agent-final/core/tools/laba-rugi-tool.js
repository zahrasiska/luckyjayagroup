import pkg from 'pg';
const { Pool } = pkg;
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Laba Rugi Tool - Custom tool untuk query Profit & Loss Statement
 *
 * Eksekusi query rugi_laba_periodic.sql dengan parameter dinamis
 */


class LabaRugiTool {
    constructor() {
        this.name = "get-laba-rugi";
        this.description =
            "Get Profit & Loss Statement (Laba Rugi) for a specific period and schema";

        // Database connection from env
        this.pool = new Pool({
            host: process.env.DB_HOST || "localhost",
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || "luckyjayagroup",
            user: process.env.DB_USER || "knavinkids",
            password: process.env.DB_PASSWORD || "Duaribu#25##",
        });

        // Path to laba-rugi.sql
        this.sqlFilePath = path.join(
            __dirname,
            "..",
            "..",
            "tools",
            "laba-rugi",
            "laba-rugi.sql",
        );
    }

    /**
     * Get tool schema for AI
     */
    getSchema() {
        return {
            name: this.name,
            description: this.description,
            inputSchema: {
                type: "object",
                properties: {
                    schema: {
                        type: "string",
                        description:
                            "Tenant schema name (e.g., u1566482_sparepart, u1566482_leontech)",
                        enum: ["u1566482_sparepart", "u1566482_leontech"],
                    },
                    start_date: {
                        type: "string",
                        description:
                            "Start date in YYYY-MM-DD format (e.g., 2025-01-01)",
                        pattern: "^\\d{4}-\\d{2}-\\d{2}$",
                    },
                    end_date: {
                        type: "string",
                        description:
                            "End date in YYYY-MM-DD format (e.g., 2025-12-31)",
                        pattern: "^\\d{4}-\\d{2}-\\d{2}$",
                    },
                    iddevisi: {
                        type: "integer",
                        description: "Division ID (default: 1 for main division)",
                        default: 1,
                    },
                },
                required: ["schema", "start_date", "end_date"],
            },
        };
    }

    /**
     * Execute laba rugi query
     */
    async execute(params) {
        const { schema, start_date, end_date, iddevisi = 1 } = params;

        try {
            console.log(
                `📊 Executing Laba Rugi query: ${schema}, ${start_date} to ${end_date}, division: ${iddevisi}`,
            );

            // Read SQL template
            let sqlTemplate = await fs.readFile(this.sqlFilePath, "utf-8");

            // Replace placeholders
            const sql = sqlTemplate
                .replace(/\{schema\}/g, schema)
                .replace(/\$1/g, `'${start_date}'`)
                .replace(/\$2/g, `'${end_date}'`);

            // Execute query
            const result = await this.pool.query(sql);

            // Format results
            const formatted = this.formatResults(result.rows, start_date, end_date);

            console.log(
                `✅ Laba Rugi query completed: ${result.rows.length} records`,
            );

            return formatted;
        } catch (error) {
            console.error("❌ Laba Rugi tool error:", error.message);
            throw new Error(
                `Failed to execute laba rugi query: ${error.message}`,
            );
        }
    }

    /**
     * Format query results for AI consumption
     */
    formatResults(rows, start_date, end_date) {
        if (!rows || rows.length === 0) {
            return {
                success: true,
                data: {
                    period: { start: start_date, end: end_date },
                    classifications: {
                        pendapatan: { total: 0, accounts: [], klasifikasi_4: { total_mutasi: 0, accounts: [] }, klasifikasi_8: { total_mutasi: 0, accounts: [] } },
                        biaya: {
                            total: 0,
                            accounts: [],
                            klasifikasi_5_hpp: { total_mutasi: 0, accounts: [] },
                            klasifikasi_6_operasional: { total_mutasi: 0, accounts: [] },
                            klasifikasi_7_non_operasional: { total_mutasi: 0, accounts: [] },
                            klasifikasi_9_lain: { total_mutasi: 0, accounts: [] }
                        },
                    },
                    summary: {
                        total_pendapatan: 0,
                        total_biaya: 0,
                        laba_bersih: 0,
                        margin_percentage: 0
                    },
                    metadata: {
                        total_records: 0,
                        query_timestamp: new Date().toISOString()
                    }
                },
                message: "No data found for the specified period",
            };
        }

        // Group by klasifikasi
        const grouped = {
            4: { name: "Pendapatan", accounts: [], total_pemasukan: 0, total_pengeluaran: 0, total_mutasi: 0 },
            5: { name: "Biaya atas Pendapatan (HPP)", accounts: [], total_pemasukan: 0, total_pengeluaran: 0, total_mutasi: 0 },
            6: { name: "Pengeluaran Operasional", accounts: [], total_pemasukan: 0, total_pengeluaran: 0, total_mutasi: 0 },
            7: { name: "Pengeluaran Non Operasional", accounts: [], total_pemasukan: 0, total_pengeluaran: 0, total_mutasi: 0 },
            8: { name: "Pendapatan Lain", accounts: [], total_pemasukan: 0, total_pengeluaran: 0, total_mutasi: 0 },
            9: { name: "Pengeluaran Lain", accounts: [], total_pemasukan: 0, total_pengeluaran: 0, total_mutasi: 0 },
        };

        rows.forEach((row) => {
            const klasifikasi = row.klasifikasi;

            // Determine klasifikasi number from name
            let klasId = null;
            if (klasifikasi.includes("Pendapatan") && !klasifikasi.includes("Lain")) {
                klasId = 4;
            } else if (klasifikasi.includes("Biaya atas Pendapatan")) {
                klasId = 5;
            } else if (klasifikasi.includes("Pengeluaran Operasional")) {
                klasId = 6;
            } else if (klasifikasi.includes("Pengeluaran Non Operasional")) {
                klasId = 7;
            } else if (klasifikasi.includes("Pendapatan Lain")) {
                klasId = 8;
            } else if (klasifikasi.includes("Pengeluaran Lain")) {
                klasId = 9;
            }

            if (klasId && grouped[klasId]) {
                grouped[klasId].accounts.push({
                    tahun: parseInt(row.tahun),
                    bulan: parseInt(row.bulan),
                    rek: row.rek,
                    akun: row.akun,
                    subklasifikasi: row.subklasifikasi,
                    pemasukan: parseFloat(row.pemasukan || 0),
                    pengeluaran: parseFloat(row.pengeluaran || 0),
                    mutasi: parseFloat(row.mutasi || 0),
                });

                grouped[klasId].total_pemasukan += parseFloat(row.pemasukan || 0);
                grouped[klasId].total_pengeluaran += parseFloat(row.pengeluaran || 0);
                grouped[klasId].total_mutasi += parseFloat(row.mutasi || 0);
            }
        });

        // Calculate totals
        const total_pendapatan = grouped[4].total_mutasi + grouped[8].total_mutasi;
        const total_biaya =
            grouped[5].total_mutasi +
            grouped[6].total_mutasi +
            grouped[7].total_mutasi +
            grouped[9].total_mutasi;
        const laba_bersih = total_pendapatan - total_biaya;

        // Get period info
        const [startYear, startMonth] = start_date.split("-");
        const [endYear, endMonth] = end_date.split("-");

        const result = {
            period: {
                start: start_date,
                end: end_date,
                start_year: parseInt(startYear),
                start_month: parseInt(startMonth),
                end_year: parseInt(endYear),
                end_month: parseInt(endMonth),
            },
            classifications: {
                pendapatan: {
                    klasifikasi_4: grouped[4],
                    klasifikasi_8: grouped[8],
                    total: total_pendapatan,
                },
                biaya: {
                    klasifikasi_5_hpp: grouped[5],
                    klasifikasi_6_operasional: grouped[6],
                    klasifikasi_7_non_operasional: grouped[7],
                    klasifikasi_9_lain: grouped[9],
                    total: total_biaya,
                },
            },
            summary: {
                total_pendapatan: total_pendapatan,
                total_biaya: total_biaya,
                laba_bersih: laba_bersih,
                margin_percentage: total_pendapatan !== 0
                    ? ((laba_bersih / total_pendapatan) * 100).toFixed(2)
                    : 0,
            },
            metadata: {
                total_records: rows.length,
                query_timestamp: new Date().toISOString(),
            },
        };

        return {
            success: true,
            data: result,
            message: `Laba Rugi retrieved successfully for period ${start_date} to ${end_date}`,
        };
    }

    /**
     * Close database connection
     */
    async close() {
        await this.pool.end();
    }
}

export { LabaRugiTool };
