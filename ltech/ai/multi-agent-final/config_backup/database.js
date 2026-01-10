/**
 * Database Configuration
 * Centralized PostgreSQL pool with multi-tenant support
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Parse DATABASE_URL
const connectionString = process.env.DATABASE_URL;

// Pool configuration
const poolConfig = {
    connectionString,
    max: parseInt(process.env.DB_POOL_MAX || '10'),
    idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMillis: 5000,
};

// Create singleton pool
let pool = null;

/**
 * Get the database pool instance
 * @returns {Pool}
 */
export function getPool() {
    if (!pool) {
        pool = new Pool(poolConfig);

        pool.on('error', (err) => {
            console.error('[DB] Unexpected error on idle client', err);
        });

        pool.on('connect', (client) => {
            // Set default search_path to prive for shared tables
            client.query('SET search_path TO prive, public');
        });
    }
    return pool;
}

/**
 * Execute query with optional schema override
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @param {string} [schema] - Optional schema override for tenant
 * @returns {Promise<pg.QueryResult>}
 */
export async function query(sql, params = [], schema = null) {
    const client = await getPool().connect();
    try {
        if (schema) {
            await client.query(`SET search_path TO ${schema}, prive, public`);
        }
        return await client.query(sql, params);
    } finally {
        client.release();
    }
}

/**
 * Execute query within a transaction
 * @param {Function} callback - Async function receiving client
 * @param {string} [schema] - Optional schema override
 * @returns {Promise<any>}
 */
export async function transaction(callback, schema = null) {
    const client = await getPool().connect();
    try {
        if (schema) {
            await client.query(`SET search_path TO ${schema}, prive, public`);
        }
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Health check for database connection
 * @returns {Promise<boolean>}
 */
export async function healthCheck() {
    try {
        const result = await query('SELECT 1 as ok');
        return result.rows[0]?.ok === 1;
    } catch (error) {
        console.error('[DB] Health check failed:', error.message);
        return false;
    }
}

/**
 * Close the pool (for graceful shutdown)
 */
export async function closePool() {
    if (pool) {
        await pool.end();
        pool = null;
    }
}

export default {
    getPool,
    query,
    transaction,
    healthCheck,
    closePool,
};
