/**
 * Context Builder
 * Builds RequestContext from database for each request
 */

import { query } from '../config/database.js';
import { getDataAccessLevel, canAccessAgent, getDefaultAgent } from '../config/roles.js';
import logger from '../utils/logger.js';

/**
 * Build full request context from user and application info
 * @param {number} userId - User ID from JWT
 * @param {string} aplikasiKode - Application code (e.g., 'ljg_sparepart')
 * @returns {Promise<Object>} RequestContext object
 */
export async function buildContext(userId, aplikasiKode) {
    const log = logger.auth;

    try {
        // 1. Get user info
        const userResult = await query(`
      SELECT id, username, email, full_name, is_active
      FROM prive.user_login
      WHERE id = $1 AND deleted_at IS NULL
    `, [userId]);

        if (userResult.rows.length === 0) {
            throw new Error(`User not found: ${userId}`);
        }

        const user = userResult.rows[0];

        if (!user.is_active) {
            throw new Error(`User is inactive: ${user.username}`);
        }

        // 2. Get application (tenant) info
        const appResult = await query(`
      SELECT id, kode_aplikasi, nama_aplikasi, db_schema, db_host, db_name, is_active
      FROM prive.aplikasi
      WHERE kode_aplikasi = $1
    `, [aplikasiKode]);

        if (appResult.rows.length === 0) {
            throw new Error(`Application not found: ${aplikasiKode}`);
        }

        const app = appResult.rows[0];

        if (!app.is_active) {
            throw new Error(`Application is inactive: ${aplikasiKode}`);
        }

        // 3. Get user's roles in this application
        const rolesResult = await query(`
      SELECT 
        uar.id as assignment_id,
        r.id as role_id,
        r.role_code,
        r.role_name,
        r.role_category,
        uar.access_level,
        uar.can_read,
        uar.can_write,
        uar.can_delete,
        uar.can_admin
      FROM prive.user_aplikasi_roles uar
      JOIN prive.roles r ON uar.role_id = r.id
      WHERE uar.user_login_id = $1
        AND uar.aplikasi_id = $2
        AND uar.is_active = true
        AND (uar.expires_at IS NULL OR uar.expires_at > NOW())
        AND r.is_active = true
      ORDER BY uar.access_level DESC
    `, [userId, app.id]);

        if (rolesResult.rows.length === 0) {
            log.warn('No roles found for user in application', { userId, aplikasiKode });
            // Return minimal context with no permissions
            return buildMinimalContext(user, app);
        }

        // 4. Build roles array
        const roles = rolesResult.rows.map(row => ({
            id: row.role_id,
            code: row.role_code,
            name: row.role_name,
            category: row.role_category,
            access: {
                level: row.access_level,
                canRead: row.can_read,
                canWrite: row.can_write,
                canDelete: row.can_delete,
                canAdmin: row.can_admin,
            },
        }));

        // 5. Get role codes for access checks
        const roleCodes = roles.map(r => r.code);

        // 6. Calculate aggregated access
        const dataAccessLevel = getDataAccessLevel(roleCodes);
        const defaultAgent = getDefaultAgent(roleCodes);

        // Aggregate permissions (union of all roles)
        const aggregatedAccess = {
            canRead: roles.some(r => r.access.canRead),
            canWrite: roles.some(r => r.access.canWrite),
            canDelete: roles.some(r => r.access.canDelete),
            canAdmin: roles.some(r => r.access.canAdmin),
            dataAccessLevel,
            defaultAgent,
        };

        // 7. Build context object
        const context = {
            tenant: {
                id: app.id,
                kode: app.kode_aplikasi,
                schema: app.db_schema,
                name: app.nama_aplikasi,
                timezone: 'Asia/Jakarta',
            },
            user: {
                id: user.id,
                username: user.username,
                fullName: user.full_name,
                email: user.email,
            },
            roles,
            roleCodes,
            primaryRole: {
                code: roleCodes[0],
                name: roles[0].role_name,
                accessLevel: roles[0].access.level,
            },
            aggregatedAccess,
            session: {
                id: null, // To be set by session manager
                createdAt: new Date().toISOString(),
                history: [],
            },
            request: {
                id: null, // To be set per request
                timestamp: new Date().toISOString(),
                source: 'web-chat',
                language: 'id',
            },
        };

        log.info('Context built successfully', {
            userId: user.id,
            username: user.username,
            tenant: app.kode_aplikasi,
            roles: roleCodes,
        });

        return context;

    } catch (error) {
        log.error('Failed to build context', { userId, aplikasiKode, error: error.message });
        throw error;
    }
}

/**
 * Build minimal context for users with no roles
 */
function buildMinimalContext(user, app) {
    return {
        tenant: {
            id: app.id,
            kode: app.kode_aplikasi,
            schema: app.db_schema,
            name: app.nama_aplikasi,
            timezone: 'Asia/Jakarta',
        },
        user: {
            id: user.id,
            username: user.username,
            fullName: user.full_name,
            email: user.email,
        },
        roles: [],
        roleCodes: [],
        primaryRole: null,
        aggregatedAccess: {
            canRead: false,
            canWrite: false,
            canDelete: false,
            canAdmin: false,
            dataAccessLevel: 'limited',
            defaultAgent: 'general-assistant',
        },
        session: {
            id: null,
            createdAt: new Date().toISOString(),
            history: [],
        },
        request: {
            id: null,
            timestamp: new Date().toISOString(),
            source: 'web-chat',
            language: 'id',
        },
    };
}

/**
 * Check if context allows access to specific agent
 * @param {Object} context - Request context
 * @param {string} agentId - Target agent ID
 * @returns {boolean}
 */
export function contextCanAccessAgent(context, agentId) {
    if (!context.roleCodes || context.roleCodes.length === 0) {
        return agentId === 'general-assistant';
    }
    return canAccessAgent(context.roleCodes, agentId);
}

/**
 * Get schema for context's tenant
 * @param {Object} context - Request context
 * @returns {string} Schema name
 */
export function getContextSchema(context) {
    return context?.tenant?.schema || 'public';
}

export default {
    buildContext,
    contextCanAccessAgent,
    getContextSchema,
};
