/**
 * Base Tool Class
 * Abstract base class for all tools
 */

import { query } from '../config/database.js';
import logger from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Abstract Tool base class
 */
export class BaseTool {
    constructor(name) {
        this.name = name;
        this.log = logger.tool.child({ tool: name });
        this._sqlCache = null;
    }

    /**
     * Get tool schema (for LLM function calling)
     * Override in subclass
     * @returns {Object} JSON Schema for parameters
     */
    getSchema() {
        return {
            name: this.name,
            description: 'Base tool - override in subclass',
            parameters: {
                type: 'object',
                properties: {},
                required: [],
            },
        };
    }

    /**
     * Validate parameters against schema
     * @param {Object} params - Parameters to validate
     * @returns {{ valid: boolean, errors: string[] }}
     */
    validateParams(params) {
        const schema = this.getSchema();
        const errors = [];

        // Check required fields
        for (const field of schema.parameters.required || []) {
            if (params[field] === undefined || params[field] === null) {
                errors.push(`Missing required parameter: ${field}`);
            }
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    }

    /**
     * Execute the tool
     * Override in subclass
     * @param {Object} params - Tool parameters
     * @param {Object} context - Request context
     * @returns {Promise<Object>} Tool result
     */
    async execute(params, context) {
        throw new Error('execute() must be implemented in subclass');
    }

    /**
     * Run the tool with validation and error handling
     * @param {Object} params - Tool parameters
     * @param {Object} context - Request context
     * @returns {Promise<Object>} { success, data?, error? }
     */
    async run(params, context) {
        this.log.info('Tool execution started', { params, tenant: context?.tenant?.kode });

        try {
            // Validate params
            const validation = this.validateParams(params);
            if (!validation.valid) {
                return {
                    success: false,
                    error: `Invalid parameters: ${validation.errors.join(', ')}`,
                };
            }

            // Execute
            const startTime = Date.now();
            const result = await this.execute(params, context);
            const duration = Date.now() - startTime;

            this.log.info('Tool execution completed', { duration, rowCount: result?.rowCount });

            return {
                success: true,
                data: result,
                duration,
            };

        } catch (error) {
            this.log.error('Tool execution failed', { error: error.message });
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Load SQL file from tool directory
     * @param {string} filename - SQL filename (relative to tool directory)
     * @returns {Promise<string>} SQL content
     */
    async loadSQL(filename) {
        if (this._sqlCache) {
            return this._sqlCache;
        }

        const toolDir = path.join(__dirname, this.name.replace('-tool', '').replace('Tool', '').toLowerCase());
        const sqlPath = path.join(toolDir, filename);

        this.log.debug('Loading SQL file', { sqlPath });
        this._sqlCache = await fs.readFile(sqlPath, 'utf-8');
        return this._sqlCache;
    }

    /**
     * Execute SQL query with tenant schema
     * @param {string} sql - SQL query
     * @param {Array} params - Query parameters
     * @param {Object} context - Request context
     * @returns {Promise<Object[]>} Query result rows
     */
    async executeSQL(sql, params, context) {
        const schema = context?.tenant?.schema || 'public';

        this.log.debug('Executing SQL', {
            schema,
            paramCount: params.length,
            sqlPreview: sql.substring(0, 100),
        });

        const result = await query(sql, params, schema);
        return result.rows;
    }

    /**
     * Format result for display
     * Override in subclass for custom formatting
     * @param {Object} data - Tool result data
     * @returns {string} Formatted string
     */
    formatResult(data) {
        return JSON.stringify(data, null, 2);
    }
}

/**
 * SQL-based Tool class
 * For tools that execute a SQL file
 */
export class SQLTool extends BaseTool {
    constructor(name, sqlFile) {
        super(name);
        this.sqlFile = sqlFile;
    }

    /**
     * Execute the SQL file with parameters
     * @param {Object} params - { schema, startDate, endDate, ... }
     * @param {Object} context - Request context
     * @returns {Promise<Object>}
     */
    async execute(params, context) {
        let sql = await this.loadSQL(this.sqlFile);

        // Replace placeholders
        sql = this.replacePlaceholders(sql, params, context);

        // Build parameters array
        const queryParams = this.buildParams(params);

        // Execute
        const rows = await this.executeSQL(sql, queryParams, context);

        return {
            rows,
            rowCount: rows.length,
            params,
        };
    }

    /**
     * Replace SQL placeholders
     * Override in subclass if needed
     */
    replacePlaceholders(sql, params, context) {
        // Default: replace {schema} with tenant schema
        return sql.replace(/\{schema\}/g, context?.tenant?.schema || 'public');
    }

    /**
     * Build parameters array for query
     * Override in subclass
     */
    buildParams(params) {
        return [];
    }
}

export default {
    BaseTool,
    SQLTool,
};
