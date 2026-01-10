/**
 * Role Configuration
 * Mapping roles to allowed agents and data access levels
 * 
 * Based on prive.roles and prive.user_aplikasi_roles structure
 */

/**
 * Role to Agent mapping
 * Defines which agents each role can access
 */
export const ROLE_AGENT_MAP = {
    // System Roles (from prive.roles where role_category = 'system')
    SUPERADMIN: {
        defaultAgent: 'finance-manager',
        allowedAgents: ['*'], // All agents
        dataAccess: 'full',
    },
    ADMIN: {
        defaultAgent: 'general-assistant',
        allowedAgents: ['*'],
        dataAccess: 'full',
    },
    MANAGER: {
        defaultAgent: 'general-assistant',
        allowedAgents: ['finance-manager', 'sales-manager', 'inventory-manager', 'general-assistant'],
        dataAccess: 'full',
    },
    USER: {
        defaultAgent: 'general-assistant',
        allowedAgents: ['general-assistant'],
        dataAccess: 'limited',
    },

    // Business Roles (from prive.roles where role_category = 'business')
    DIREKSI: {
        defaultAgent: 'finance-manager',
        allowedAgents: ['finance-manager', 'sales-manager', 'inventory-manager', 'purchasing-manager'],
        dataAccess: 'full',
    },
    FINANCE: {
        defaultAgent: 'finance-manager',
        allowedAgents: ['finance-manager', 'accounting-manager'],
        dataAccess: 'financial',
    },
    SALES_MANAGER: {
        defaultAgent: 'sales-manager',
        allowedAgents: ['sales-manager'],
        dataAccess: 'sales',
    },
    SALES: {
        defaultAgent: 'sales-manager',
        allowedAgents: ['sales-manager'],
        dataAccess: 'sales_limited',
    },
    INVENTORY_MANAGER: {
        defaultAgent: 'inventory-manager',
        allowedAgents: ['inventory-manager'],
        dataAccess: 'inventory',
    },
    INVENTORY: {
        defaultAgent: 'inventory-manager',
        allowedAgents: ['inventory-manager'],
        dataAccess: 'inventory_limited',
    },
    PURCHASING: {
        defaultAgent: 'purchasing-manager',
        allowedAgents: ['purchasing-manager'],
        dataAccess: 'purchasing',
    },
    KASIR: {
        defaultAgent: 'general-assistant',
        allowedAgents: ['general-assistant'],
        dataAccess: 'pos_only',
    },
    DEVELOPMENT: {
        defaultAgent: 'general-assistant',
        allowedAgents: ['*'],
        dataAccess: 'full',
    },
    ADMINISTRASI_UMUM: {
        defaultAgent: 'general-assistant',
        allowedAgents: ['general-assistant'],
        dataAccess: 'limited',
    },
};

/**
 * Get role configuration
 * @param {string} roleCode - Role code from prive.roles
 * @returns {Object} Role configuration
 */
export function getRoleConfig(roleCode) {
    return ROLE_AGENT_MAP[roleCode] || ROLE_AGENT_MAP.USER;
}

/**
 * Check if role can access agent
 * @param {string[]} roleCodes - Array of role codes user has
 * @param {string} agentId - Target agent ID
 * @returns {boolean}
 */
export function canAccessAgent(roleCodes, agentId) {
    for (const roleCode of roleCodes) {
        const config = getRoleConfig(roleCode);
        if (config.allowedAgents.includes('*') || config.allowedAgents.includes(agentId)) {
            return true;
        }
    }
    return false;
}

/**
 * Get default agent for user's roles
 * @param {string[]} roleCodes - Array of role codes
 * @returns {string} Default agent ID
 */
export function getDefaultAgent(roleCodes) {
    // Return default agent from highest priority role
    const priorityOrder = ['SUPERADMIN', 'ADMIN', 'DIREKSI', 'MANAGER', 'FINANCE', 'SALES_MANAGER', 'INVENTORY_MANAGER'];

    for (const priority of priorityOrder) {
        if (roleCodes.includes(priority)) {
            return getRoleConfig(priority).defaultAgent;
        }
    }

    // Fallback to first role's default
    if (roleCodes.length > 0) {
        return getRoleConfig(roleCodes[0]).defaultAgent;
    }

    return 'general-assistant';
}

/**
 * Get highest data access level from user's roles
 * @param {string[]} roleCodes - Array of role codes
 * @returns {string} Data access level
 */
export function getDataAccessLevel(roleCodes) {
    const accessPriority = ['full', 'financial', 'sales', 'inventory', 'purchasing', 'sales_limited', 'inventory_limited', 'pos_only', 'limited'];

    let highestAccess = 'limited';

    for (const roleCode of roleCodes) {
        const config = getRoleConfig(roleCode);
        const currentIndex = accessPriority.indexOf(config.dataAccess);
        const highestIndex = accessPriority.indexOf(highestAccess);

        if (currentIndex < highestIndex) {
            highestAccess = config.dataAccess;
        }
    }

    return highestAccess;
}

export default {
    ROLE_AGENT_MAP,
    getRoleConfig,
    canAccessAgent,
    getDefaultAgent,
    getDataAccessLevel,
};
