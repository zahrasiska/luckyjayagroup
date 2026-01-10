/**
 * Neraca Tool - Custom tool untuk query Balance Sheet
 *
 * Eksekusi query neraca.sql dengan parameter dinamis
 */

const { Pool } = require("pg");
const fs = require("fs").promises;
const path = require("path");

class NeracaTool {
    constructor() {
        this.name = "get-neraca";
        this.description =
            "Get Balance Sheet (Neraca) for a specific period and schema";

        // Database connection from env
        this.pool = new Pool({
            host: process.env.DB_HOST || "localhost",
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || "luckyjayagroup",
            user: process.env.DB_USER || "knavinkids",
            password: process.env.DB_PASSWORD || "Duaribu#25##",
        });

        // Path to neraca.sql
        this.sqlFilePath = path.join(__dirname, "..", "sql", "neraca.sql");
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
                },
                required: ["schema", "start_date", "end_date"],
            },
        };
    }

    /**
     * Execute neraca query
     */
    async execute(params) {
        const { schema, start_date, end_date } = params;

        try {
            console.log(
                `📊 Executing Neraca query: ${schema}, ${start_date} to ${end_date}`,
            );

            // Read SQL template
            let sqlTemplate = await fs.readFile(this.sqlFilePath, "utf-8");

            // Replace schema placeholder
            sqlTemplate = sqlTemplate.replace(/u1566482_sparepart/g, schema);

            // Replace parameter placeholders with actual values
            // $1 = start_date, $2 = end_date
            const sql = sqlTemplate
                .replace(/\$1::timestamp/g, `'${start_date}'::timestamp`)
                .replace(/\$2::timestamp/g, `'${end_date}'::timestamp`);

            // Execute query
            const result = await this.pool.query(sql);

            // Format results
            const formatted = this.formatResults(result.rows, end_date);

            console.log(
                `✅ Neraca query completed: ${result.rows.length} records`,
            );

            return formatted;
        } catch (error) {
            console.error("❌ Neraca tool error:", error.message);
            throw new Error(`Failed to execute neraca query: ${error.message}`);
        }
    }

    /**
     * Format query results for AI consumption
     */
    formatResults(rows, end_date) {
        // Get end period (year + month)
        const [year, month] = end_date.split("-");
        const endPeriod = `${year}${month}`;

        // Filter for end period only
        const endPeriodData = rows.filter((row) => {
            const rowPeriod = `${row.tahun}${row.bulan}`;
            return rowPeriod === endPeriod;
        });

        // Group by klasifikasi
        const grouped = {};

        endPeriodData.forEach((row) => {
            const klasifikasi = row.klasifikasi;

            if (!grouped[klasifikasi]) {
                grouped[klasifikasi] = {
                    klasifikasi: klasifikasi,
                    subklasifikasi: row.subklasifikasi,
                    accounts: [],
                    total_saldo: 0,
                    total_sawal: 0,
                    total_debit: 0,
                    total_kredit: 0,
                    total_mutasi: 0,
                };
            }

            grouped[klasifikasi].accounts.push({
                kode: row.kode,
                akun: row.akun,
                alias: row.alias,
                sawal: parseFloat(row.sawal || 0),
                debit: parseFloat(row.debit || 0),
                kredit: parseFloat(row.kredit || 0),
                mutasi: parseFloat(row.mutasi || 0),
                saldo: parseFloat(row.saldo || 0),
            });

            grouped[klasifikasi].total_saldo += parseFloat(row.saldo || 0);
            grouped[klasifikasi].total_sawal += parseFloat(row.sawal || 0);
            grouped[klasifikasi].total_debit += parseFloat(row.debit || 0);
            grouped[klasifikasi].total_kredit += parseFloat(row.kredit || 0);
            grouped[klasifikasi].total_mutasi += parseFloat(row.mutasi || 0);
        });

        // Convert to array and calculate grand totals
        const result = {
            period: {
                start: rows[0]?.tahun
                    ? `${rows[0].tahun}-${rows[0].bulan}`
                    : "N/A",
                end: endPeriod ? `${year}-${month}` : "N/A",
                year: parseInt(year),
                month: parseInt(month),
            },
            classifications: Object.values(grouped),
            summary: {
                total_aktiva: 0,
                total_kewajiban: 0,
                total_modal: 0,
                total_debit: 0,
                total_kredit: 0,
            },
            metadata: {
                total_records: endPeriodData.length,
                query_timestamp: new Date().toISOString(),
            },
        };

        // Calculate summary totals
        result.classifications.forEach((cls) => {
            const kl = cls.klasifikasi.toUpperCase();
            if (kl.includes("AKTIVA")) {
                result.summary.total_aktiva = cls.total_saldo;
            } else if (kl.includes("KEWAJIBAN") || kl.includes("LIABILITAS") || kl.includes("HUTANG")) {
                // Keep the original sign (usually negative for credit balance)
                result.summary.total_kewajiban = cls.total_saldo;
            } else if (kl.includes("MODAL") || kl.includes("EKUITAS")) {
                // Keep the original sign (usually negative for credit balance)
                result.summary.total_modal = cls.total_saldo;
            }
            // Use absolute for debit/kredit summary for technical totals
            result.summary.total_debit += Math.abs(cls.total_debit || 0);
            result.summary.total_kredit += Math.abs(cls.total_kredit || 0);
        });

        // Add balance check 
        // Logic: In this system, Assets (+) and Liab/Equity (-) are signed such that they sum to zero.
        // Balance equation: Aktiva + Kewajiban + Modal = 0
        const total_eq = result.summary.total_aktiva + result.summary.total_kewajiban + result.summary.total_modal;

        result.summary.balance_check = {
            equation: "Aktiva + Kewajiban + Modal = 0",
            aktiva: result.summary.total_aktiva,
            kewajiban: result.summary.total_kewajiban,
            modal: result.summary.total_modal,
            difference: total_eq,
            is_balanced: Math.abs(total_eq) < 1000, // Tolerance for rounding
        };

        return {
            success: true,
            data: result,
            message: `Neraca retrieved successfully for period ${result.period.end}`,
        };
    }

    /**
     * Close database connection
     */
    async close() {
        await this.pool.end();
    }
}

module.exports = NeracaTool;
