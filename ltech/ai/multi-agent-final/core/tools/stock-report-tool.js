/**
 * Stock Report Tool
 * 
 * Fetches current stock levels from the database using queries on tenant.s table.
 */

import pkg from 'pg';
const { Pool } = pkg;
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class StockReportTool {
    constructor() {
        this.name = "stock-report";
        this.description = "Get current stock levels for items across different locations.";

        this.pool = new Pool({
            host: process.env.DB_HOST || "localhost",
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || "luckyjayagroup",
            user: process.env.DB_USER || "knavinkids",
            password: process.env.DB_PASSWORD || "Duaribu#25##",
        });

        this.sqlFilePath = path.join(__dirname, "..", "..", "tools", "inventory", "stock-report.sql");
    }

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
                    search: {
                        type: "string",
                        description: "Optional search term for item name or code"
                    },
                    idbarang: {
                        type: "integer",
                        description: "Optional specific item ID"
                    }
                },
                required: ["schema"]
            }
        };
    }

    async execute(params) {
        const { schema, search, idbarang } = params;

        try {
            console.log(`📊 StockReportTool: Fetching stock for ${schema}`);

            let sqlTemplate = await fs.readFile(this.sqlFilePath, "utf-8");

            const searchFilter = search ? `AND (b.nama ILIKE '%${search}%' OR b.kode ILIKE '%${search}%')` : "";
            const itemFilter = idbarang ? `AND b.id = ${idbarang}` : "";

            const sql = sqlTemplate
                .replace(/\{schema\}/g, schema)
                .replace(/\{\{SEARCH_FILTER\}\}/g, searchFilter)
                .replace(/\{\{IDBARANG_FILTER\}\}/g, itemFilter);

            const result = await this.pool.query(sql);

            return {
                success: true,
                data: {
                    records: result.rows,
                    total_count: result.rows.length,
                    timestamp: new Date().toISOString()
                }
            };
        } catch (error) {
            console.error(`❌ StockReportTool error:`, error.message);
            throw new Error(`Failed to fetch stock report: ${error.message}`);
        }
    }

    async close() {
        await this.pool.end();
    }
}

export { StockReportTool };
