/**
 * AI Query Tool
 * Specialized tool for ad-hoc data discovery and creative analysis
 */

import { BaseTool } from '../base-tool.js';
import { query } from '../../config/database.js';

export class AIQueryTool extends BaseTool {
    constructor() {
        super('ai-query-discovery');
    }

    getSchema() {
        return {
            name: 'execute-sql-investigation',
            description: 'Execute a read-only SQL query for deep data investigation. Use this when preset tools are insufficient.',
            parameters: {
                type: 'object',
                properties: {
                    sql: {
                        type: 'string',
                        description: 'The SQL SELECT query to execute. MUST BE READ-ONLY.',
                    },
                    reason: {
                        type: 'string',
                        description: 'Why are you running this query?',
                    }
                },
                required: ['sql', 'reason'],
            },
        };
    }

    async execute(params, context) {
        const { sql } = params;
        const schema = context?.tenant?.schema || 'public';

        // 1. Basic Safety Check
        const upperSql = sql.toUpperCase();
        const forbidden = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'TRUNCATE', 'ALTER', 'CREATE', 'GRANT', 'REVOKE'];

        for (const word of forbidden) {
            if (upperSql.includes(word)) {
                throw new Error(`Security breach: Operation ${word} is not allowed. Only SELECT is permitted.`);
            }
        }

        if (!upperSql.startsWith('SELECT')) {
            throw new Error('Only SELECT queries are allowed for data investigation.');
        }

        // 2. Schema Injection Prevention
        // Replace {schema} placeholder if present, or ensure query uses search_path
        const sanitizedSql = sql.replace(/\{schema\}/g, schema);

        this.log.info('Running investigation SQL', { sql: sanitizedSql.substring(0, 100) });

        // 3. Execute
        const result = await query(sanitizedSql, [], schema);

        return {
            rows: result.rows,
            rowCount: result.rowCount,
            sql: sanitizedSql
        };
    }

    formatResult(data) {
        if (!data.rows || data.rows.length === 0) {
            return { summary: 'Penyelidikan selesai: Tidak ditemukan data tambahan.' };
        }

        return {
            summary: `🏢 Berhasil mengambil ${data.rowCount} baris data penyelidikan.`,
            data: data.rows
        };
    }
}
