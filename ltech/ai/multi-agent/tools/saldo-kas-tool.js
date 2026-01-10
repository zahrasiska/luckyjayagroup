/**
 * Saldo Kas Tool - Custom tool untuk query Saldo Kas & Bank
 * 
 * Melakukan perhitungan saldo akurat (Debit - Kredit) untuk akun Kas dan Bank
 */

const { Pool } = require("pg");
const fs = require("fs").promises;
const path = require("path");

class SaldoKasTool {
    constructor() {
        this.name = "get-saldo-kas";
        this.description = "Get accurate balance for Kas and Bank accounts for a specific schema";

        // Database connection from env
        this.pool = new Pool({
            host: process.env.DB_HOST || "localhost",
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || "luckyjayagroup",
            user: process.env.DB_USER || "knavinkids",
            password: process.env.DB_PASSWORD || "Duaribu#25##",
        });

        // Path to saldo_kas.sql
        this.sqlFilePath = path.join(__dirname, "..", "sql", "saldo_kas.sql");
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
                        description: "Tenant schema name (e.g., u1566482_sparepart)",
                        enum: ["u1566482_sparepart", "u1566482_leontech"]
                    },
                    as_of_date: {
                        type: "string",
                        description: "Target date in YYYY-MM-DD format (default tomorrow for current balance)",
                        pattern: "^\\d{4}-\\d{2}-\\d{2}$"
                    }
                },
                required: ["schema"]
            }
        };
    }

    /**
     * Execute saldo kas query
     */
    async execute(params) {
        let { schema, as_of_date } = params;

        // Default as_of_date to today if not provided
        if (!as_of_date) {
            as_of_date = new Date().toISOString().split('T')[0];
        }

        try {
            console.log(`📊 Executing Saldo Kas query: ${schema}, as of ${as_of_date}`);

            // Read SQL template
            let sqlTemplate = await fs.readFile(this.sqlFilePath, "utf-8");

            // Replace schema placeholder
            const sql = sqlTemplate
                .replace(/u1566482_sparepart/g, schema)
                .replace(/:as_of_date/g, `'${as_of_date}'`);

            // Execute query
            const result = await this.pool.query(sql);

            // Format results
            const formatted = this.formatResults(result.rows, as_of_date);

            console.log(`✅ Saldo Kas query completed: ${result.rows.length} accounts`);

            return formatted;
        } catch (error) {
            console.error("❌ Saldo Kas tool error:", error.message);
            throw new Error(`Failed to execute saldo kas query: ${error.message}`);
        }
    }

    /**
     * Format results for AI consumption
     */
    formatResults(rows, as_of_date) {
        const total_saldo = rows.reduce((sum, row) => sum + parseFloat(row.saldo), 0);

        // Group by subklasifikasi (Kas vs Bank)
        const categories = {};
        rows.forEach(row => {
            const cat = row.subklasifikasi;
            if (!categories[cat]) {
                categories[cat] = {
                    name: cat,
                    total: 0,
                    accounts: []
                };
            }
            categories[cat].accounts.push({
                noklasifikasi: row.noklasifikasi,
                namaklasifikasi: row.namaklasifikasi,
                nosubklasifikasi: row.nosubklasifikasi,
                namasubklasifikasi: row.namasubklasifikasi,
                kode: row.kode,
                akun: row.akun,
                saldo: parseFloat(row.saldo)
            });
            categories[cat].total += parseFloat(row.saldo);
        });

        return {
            success: true,
            data: {
                as_of_date: as_of_date,
                total_saldo: total_saldo,
                breakdown: Object.values(categories),
                metadata: {
                    query_timestamp: new Date().toISOString()
                }
            },
            message: `Saldo Kas & Bank retrieved for ${as_of_date}`
        };
    }

    /**
     * Close database connection
     */
    async close() {
        await this.pool.end();
    }
}

module.exports = SaldoKasTool;
