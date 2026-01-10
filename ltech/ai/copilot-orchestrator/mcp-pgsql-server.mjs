#!/usr/bin/env node
/**
 * MCP Server for PostgreSQL Database Access
 * Provides ltech-db tool for Copilot CLI agents
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import pg from 'pg';
import fs from 'fs';

const { Pool } = pg;

// Database connection pool
const pool = new Pool({
    host: process.env.PGHOST || 'localhost',
    database: process.env.PGDATABASE || 'postgres',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '',
    port: process.env.PGPORT || 5432,
    max: 10,
});

// No default schema - agent must specify tenant based on business context

const server = new Server(
    {
        name: "ltech-db",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

/**
 * Execute SQL query with schema context
 */
async function executeQuery(sql, schema = null) {
    // SECURITY: Reject database access if no schema provided
    if (!schema) {
        throw new Error('❌ DATABASE ACCESS FORBIDDEN: Schema tidak ditentukan. Topik ini memerlukan konteks tenant yang jelas. Silakan alihkan percakapan ke topik lain yang tidak memerlukan akses database.');
    }

    // DEBUG: Log query to file (SYNC)
    try {
        const logEntry = `[${new Date().toISOString()}] SCHEMA: ${schema} | SQL: ${sql}\n`;
        fs.appendFileSync('/tmp/ltech-sql-debug.log', logEntry);
    } catch (e) {
        console.error('Failed to log query:', e);
    }

    const client = await pool.connect();
    try {
        // Set search path for tenant schema
        await client.query(`SET search_path TO ${schema}, public, prive`);

        const result = await client.query(sql);
        return result.rows;
    } finally {
        client.release();
    }
}

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "ltech-db",
                description: `Execute PostgreSQL query on LTech database. 
        
CRITICAL RULES:
- MUST specify schema explicitly based on tenant context (e.g., u1566482_sparepart, prive)
- Use proper table names (t, d, kas, j, brg, ktk, etc.)
- Return data as JSON array
- If no results, return empty array

IMPORTANT TABLES:
- t: Transaction header (notrans, kdtrans, tgl, nilaitotal, etc.)
- d: Transaction detail (idbarang, qty, harga, total, etc.)
- kas: Cash/bank transactions (rek, debit, kredit, saldo)
- j: Journal entries (rek, debit, kredit, ket)
- brg: Master barang/items
- ktk: Master kontak/customers
- rekening: Chart of accounts (kode, nama, nosubklasifikasi)
- subklas: Account classification (nosubklasifikasi, namasubklasifikasi)

SCHEMA SELECTION:  
⚠️ CRITICAL: Database access is FORBIDDEN without explicit schema
- Agent MUST determine correct tenant from business context
- Common schemas: u1566482_sparepart, prive, public
- If schema cannot be determined, REJECT database query and redirect conversation
`,
                inputSchema: {
                    type: "object",
                    properties: {
                        sql: {
                            type: "string",
                            description: "SQL query to execute",
                        },
                        schema: {
                            type: "string",
                            description: "Tenant schema name (REQUIRED - determine from context, e.g., u1566482_sparepart)",
                        },
                    },
                    required: ["sql", "schema"],
                },
            },
        ],
    };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "ltech-db") {
        console.error(`Debug: Tool called ltech-db. Args: ${JSON.stringify(request.params.arguments)}`);
        const { sql, schema } = request.params.arguments;

        try {
            if (!sql) throw new Error("Missing 'sql' argument");

            // Safety check: only SELECT queries
            const trimmedQuery = sql.trim().toLowerCase();
            if (!trimmedQuery.startsWith('select') &&
                !trimmedQuery.startsWith('with')) {
                throw new Error('Only SELECT queries are allowed for safety');
            }

            const results = await executeQuery(sql, schema);

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(results, null, 2),
                    },
                ],
            };
        } catch (error) {
            console.error('Database error:', error);
            return {
                content: [
                    {
                        type: "text",
                        text: `ERROR: ${error.message}`,
                    },
                ],
                isError: true,
            };
        }
    }

    throw new Error(`Unknown tool: ${request.params.name}`);
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);

console.error('LTech PostgreSQL MCP Server started');
