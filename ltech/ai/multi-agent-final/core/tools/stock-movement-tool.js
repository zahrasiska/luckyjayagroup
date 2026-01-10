/**
 * Stock Movement Tool
 * 
 * Analyzes stock movements (IN/OUT) for specific items and periods.
 */

import pkg from 'pg';
const { Pool } = pkg;
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class StockMovementTool {
    constructor() {
        this.name = "stock-movement";
        this.description = "Analyze stock movement (IN/OUT) for specific items or brands over a period.";

        // Database connection from env
        this.pool = new Pool({
            host: process.env.DB_HOST || "localhost",
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || "luckyjayagroup",
            user: process.env.DB_USER || "knavinkids",
            password: process.env.DB_PASSWORD || "Duaribu#25##",
        });

        // Path to stock-movement.sql
        this.sqlFilePath = path.join(__dirname, "..", "..", "tools", "inventory", "stock-movement.sql");
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
                        description: "Tenant schema name"
                    },
                    start_date: {
                        type: "string",
                        description: "Start date (YYYY-MM-DD)"
                    },
                    end_date: {
                        type: "string",
                        description: "End date (YYYY-MM-DD)"
                    },
                    idbarang: {
                        type: "integer",
                        description: "Optional item ID filter"
                    }
                },
                required: ["schema", "start_date", "end_date"]
            }
        };
    }

    /**
     * Execute query
     */
    async execute(params) {
        const { schema, start_date, end_date, idbarang } = params;

        try {
            console.log(`📊 StockMovementTool: Analyzing ${schema} from ${start_date} to ${end_date}`);

            // Read SQL template
            let sqlTemplate = await fs.readFile(this.sqlFilePath, "utf-8");

            // Build item filter
            const itemFilter = idbarang ? `AND d.idbarang = ${idbarang}` : "";

            // Replace placeholders
            const sql = sqlTemplate
                .replace(/\{schema\}/g, schema)
                .replace(/:start_date/g, `'${start_date}'`)
                .replace(/:end_date/g, `'${end_date}'`)
                .replace(/\{\{IDBARANG_FILTER\}\}/g, itemFilter);

            // Execute query
            const result = await this.pool.query(sql);

            return {
                success: true,
                data: {
                    period: { start: start_date, end: end_date },
                    movements: result.rows,
                    summary: this.calculateSummary(result.rows)
                }
            };
        } catch (error) {
            console.error(`❌ StockMovementTool error:`, error.message);
            throw new Error(`Failed to analyze stock movement: ${error.message}`);
        }
    }

    /**
     * Calculate summary from movements
     */
    calculateSummary(rows) {
        let totalIn = 0;
        let totalOut = 0;
        const byType = {};

        rows.forEach(row => {
            const mutasi = parseFloat(row.mutasi || 0);
            if (mutasi > 0) totalIn += mutasi;
            else if (mutasi < 0) totalOut += Math.abs(mutasi);

            if (!byType[row.kdtrans]) byType[row.kdtrans] = 0;
            byType[row.kdtrans] += mutasi;
        });

        return {
            total_in: totalIn,
            total_out: totalOut,
            net_movement: totalIn - totalOut,
            by_type: byType,
            record_count: rows.length
        };
    }

    async close() {
        await this.pool.end();
    }
}

export { StockMovementTool };
