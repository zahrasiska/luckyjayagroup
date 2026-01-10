/**
 * Buku Besar Tool - Custom tool untuk query General Ledger
 * 
 * Mengambil detail transaksi dari tabel jurnal (j) dan header (t)
 */

const { Pool } = require("pg");
const fs = require("fs").promises;
const path = require("path");

class BukuBesarTool {
    constructor() {
        this.name = "get-buku-besar";
        this.description = "Get General Ledger (Buku Besar) transactions with classification details";

        // Database connection from env
        this.pool = new Pool({
            host: process.env.DB_HOST || "localhost",
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || "luckyjayagroup",
            user: process.env.DB_USER || "knavinkids",
            password: process.env.DB_PASSWORD || "Duaribu#25##",
        });

        // Path to buku_besar.sql
        this.sqlFilePath = path.join(__dirname, "..", "sql", "buku_besar.sql");
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
                    start_date: {
                        type: "string",
                        description: "Start date in YYYY-MM-DD format",
                        pattern: "^\\d{4}-\\d{2}-\\d{2}$"
                    },
                    end_date: {
                        type: "string",
                        description: "End date in YYYY-MM-DD format",
                        pattern: "^\\d{4}-\\d{2}-\\d{2}$"
                    },
                    account_code: {
                        type: "string",
                        description: "Optional account code to filter (e.g., 110.01)"
                    }
                },
                required: ["schema", "start_date", "end_date"]
            }
        };
    }

    /**
     * Execute Buku Besar query
     */
    async execute(params) {
        const { schema, start_date, end_date, account_code } = params;

        try {
            console.log(`📊 Executing Buku Besar query: ${schema}, ${start_date} to ${end_date}${account_code ? ', account: ' + account_code : ''}`);

            // Read SQL template
            let sqlTemplate = await fs.readFile(this.sqlFilePath, "utf-8");

            // Build account filter
            const accountFilter = account_code
                ? `AND j.rek = '${account_code}'`
                : "";

            // Replace placeholders
            const sql = sqlTemplate
                .replace(/u1566482_sparepart/g, schema)
                .replace(/:start_date/g, `'${start_date}'`)
                .replace(/:end_date/g, `'${end_date}'`)
                .replace(/{{ACCOUNT_FILTER}}/g, accountFilter);

            // Execute query
            const result = await this.pool.query(sql);

            console.log(`✅ Buku Besar query completed: ${result.rows.length} records`);

            return {
                success: true,
                data: {
                    period: { start: start_date, end: end_date },
                    filters: { account_code: account_code || "ALL" },
                    transactions: result.rows.map(row => ({
                        idtrans: row.idtrans,
                        tanggal: row.tanggal,
                        notrans: row.notrans,
                        kode_akun: row.kode_akun,
                        nama_akun: row.nama_akun,
                        uraian: row.uraian,
                        debit: parseFloat(row.debit),
                        kredit: parseFloat(row.kredit),
                        klasifikasi: {
                            id: row.noklasifikasi,
                            nama: row.namaklasifikasi
                        },
                        subklasifikasi: {
                            id: row.nosubklasifikasi,
                            nama: row.namasubklasifikasi
                        }
                    })),
                    metadata: {
                        total_records: result.rows.length,
                        query_timestamp: new Date().toISOString()
                    }
                },
                message: "Buku Besar transactions retrieved successfully"
            };
        } catch (error) {
            console.error("❌ Buku Besar tool error:", error.message);
            throw new Error(`Failed to execute buku besar query: ${error.message}`);
        }
    }

    /**
     * Close database connection
     */
    async close() {
        await this.pool.end();
    }
}

module.exports = BukuBesarTool;
