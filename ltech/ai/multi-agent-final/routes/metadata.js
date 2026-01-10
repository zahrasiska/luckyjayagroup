/**
 * Metadata API Routes
 * Fetch users, roles, and tenants from database
 */

import express from 'express';
const router = express.Router();
import pg from 'pg';
const { Pool } = pg;

// Database connection (no password - trust auth on Tailscale)
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'luckyjayagroup',
    user: process.env.DB_USER || 'knavinkids',
    password: process.env.DB_PASSWORD || 'Duaribu#25##',
});

/**
 * GET /api/metadata/users
 * Get all users from prive.user_login
 */
router.get('/users', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                id,
                username,
                email,
                full_name,
                role
            FROM prive.user_login
            WHERE is_active = true
            ORDER BY full_name
        `);

        res.json({
            success: true,
            users: result.rows.map(row => ({
                id: row.id.toString(),
                name: row.full_name || row.username,
                username: row.username,
                email: row.email,
                role: row.role,
            })),
        });

    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * GET /api/metadata/roles
 * Get all roles from prive.roles
 */
router.get('/roles', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                id,
                role_code,
                role_name,
                role_description
            FROM prive.roles
            WHERE is_active = true
            ORDER BY role_name
        `);

        res.json({
            success: true,
            roles: result.rows.map(row => ({
                id: row.id.toString(),
                code: row.role_code,
                name: row.role_name,
                description: row.role_description,
            })),
        });

    } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * GET /api/metadata/tenants
 * Get all aplikasi (tenants) from prive.aplikasi
 */
router.get('/tenants', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                id,
                nama_aplikasi,
                kode_aplikasi,
                db_schema
            FROM prive.aplikasi
            WHERE is_active = true
            ORDER BY nama_aplikasi
        `);

        res.json({
            success: true,
            tenants: result.rows.map(row => ({
                id: row.id.toString(),
                name: row.nama_aplikasi,
                code: row.kode_aplikasi,
                schema: row.db_schema,
            })),
        });

    } catch (error) {
        console.error('Error fetching tenants:', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * GET /api/metadata/user-roles/:userId/:aplikasiId
 * Get user roles for specific aplikasi from user_aplikasi_roles
 */
router.get('/user-roles/:userId/:aplikasiId', async (req, res) => {
    try {
        const { userId, aplikasiId } = req.params;

        const result = await pool.query(`
            SELECT 
                r.id,
                r.role_code,
                r.role_name,
                r.role_description,
                uar.can_read,
                uar.can_write,
                uar.can_admin
            FROM prive.user_aplikasi_roles uar
            JOIN prive.roles r ON uar.role_id = r.id
            WHERE uar.user_login_id = $1
              AND uar.aplikasi_id = $2
              AND uar.is_active = true
              AND r.is_active = true
            ORDER BY r.role_name
        `, [userId, aplikasiId]);

        res.json({
            success: true,
            roles: result.rows.map(row => ({
                id: row.id.toString(),
                code: row.role_code,
                name: row.role_name,
                description: row.role_description,
                permissions: {
                    canRead: row.can_read,
                    canWrite: row.can_write,
                    canAdmin: row.can_admin,
                },
            })),
        });

    } catch (error) {
        console.error('Error fetching user roles:', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

export default router;
