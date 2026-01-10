/**
 * Access Rules Configuration
 * Field-level access control per data access level
 */

/**
 * Data Access Rules
 * Defines tables and fields accessible per access level
 */
export const DATA_ACCESS_RULES = {
    full: {
        description: 'Full access to all data',
        tables: ['*'],
        fields: {
            allowed: ['*'],
            denied: ['password_hash', 'two_factor_secret', 'db_password_encrypted'],
        },
    },

    financial: {
        description: 'Full access to financial data',
        tables: ['t', 'd', 'j', 'kas', 'brg', 'ktk', 'lokasi', 'devisi'],
        fields: {
            allowed: ['*'],
            denied: ['password_hash'],
        },
    },

    sales: {
        description: 'Sales data without cost information',
        tables: ['t', 'd', 'brg', 'brgmerk', 'brgkategori', 'ktk', 'lokasi'],
        fields: {
            allowed: ['id', 'notrans', 'tanggal', 'idkontak', 'qty', 'harga', 'subtotal', 'nilaitotal', 'nama', 'merk'],
            denied: ['hpp', 'hargabeli', 'margin', 'laba', 'biaya'],
        },
    },

    sales_limited: {
        description: 'Basic sales data only',
        tables: ['t', 'd', 'brg', 'ktk'],
        fields: {
            allowed: ['id', 'notrans', 'tanggal', 'qty', 'nama'],
            denied: ['hpp', 'hargabeli', 'margin', 'laba', 'biaya', 'harga', 'subtotal', 'nilaitotal'],
        },
    },

    inventory: {
        description: 'Inventory data without financial values',
        tables: ['brg', 'brginfo', 'brgmerk', 'brgkategori', 'brgsatuan', 'lokasi', 'rak'],
        fields: {
            allowed: ['id', 'nama', 'merk', 'kategori', 'satuan', 'saldo', 'qty', 'harga', 'lokasi'],
            denied: ['hpp', 'hargabeli', 'margin', 'subtotal', 'total', 'nilaitotal'],
        },
    },

    inventory_limited: {
        description: 'Basic inventory data',
        tables: ['brg', 'brginfo', 'lokasi'],
        fields: {
            allowed: ['id', 'nama', 'saldo', 'lokasi'],
            denied: ['hpp', 'hargabeli', 'margin', 'harga', 'subtotal', 'total', 'nilaitotal'],
        },
    },

    purchasing: {
        description: 'Purchasing data with cost, without selling price',
        tables: ['t', 'd', 'brg', 'ktk', 'lokasi'],
        fields: {
            allowed: ['id', 'notrans', 'tanggal', 'idkontak', 'qty', 'hpp', 'hargabeli', 'nama'],
            denied: ['harga', 'margin', 'laba'], // No selling price!
        },
    },

    pos_only: {
        description: 'POS cashier access only',
        tables: ['t', 'd', 'brg', 'ktk'],
        fields: {
            allowed: ['id', 'notrans', 'tanggal', 'qty', 'harga', 'subtotal', 'nilaitotal', 'nama', 'bayar', 'saldo'],
            denied: ['hpp', 'hargabeli', 'margin', 'laba', 'biaya'],
        },
    },

    limited: {
        description: 'Minimal access',
        tables: [],
        fields: {
            allowed: ['id', 'nama'],
            denied: ['*'],
        },
    },
};

/**
 * Check if a table is accessible at given access level
 * @param {string} accessLevel - Data access level
 * @param {string} tableName - Table name to check
 * @returns {boolean}
 */
export function canAccessTable(accessLevel, tableName) {
    const rules = DATA_ACCESS_RULES[accessLevel];
    if (!rules) return false;

    if (rules.tables.includes('*')) return true;
    return rules.tables.includes(tableName);
}

/**
 * Check if a field is accessible at given access level
 * @param {string} accessLevel - Data access level
 * @param {string} fieldName - Field name to check
 * @returns {boolean}
 */
export function canAccessField(accessLevel, fieldName) {
    const rules = DATA_ACCESS_RULES[accessLevel];
    if (!rules) return false;

    // Check if explicitly denied
    if (rules.fields.denied.includes(fieldName) || rules.fields.denied.includes('*')) {
        // Even if allowed *, if in denied list, block it
        if (rules.fields.allowed.includes('*')) {
            return !rules.fields.denied.includes(fieldName);
        }
        return false;
    }

    // Check if explicitly allowed
    if (rules.fields.allowed.includes('*')) return true;
    return rules.fields.allowed.includes(fieldName);
}

/**
 * Filter object to only include accessible fields
 * @param {Object} data - Data object to filter
 * @param {string} accessLevel - Data access level
 * @returns {Object} Filtered object
 */
export function filterFields(data, accessLevel) {
    if (!data || typeof data !== 'object') return data;

    const filtered = {};
    for (const [key, value] of Object.entries(data)) {
        if (canAccessField(accessLevel, key)) {
            filtered[key] = value;
        } else {
            filtered[key] = '[RESTRICTED]';
        }
    }
    return filtered;
}

/**
 * Filter array of objects
 * @param {Object[]} dataArray - Array of data objects
 * @param {string} accessLevel - Data access level
 * @returns {Object[]} Filtered array
 */
export function filterDataArray(dataArray, accessLevel) {
    if (!Array.isArray(dataArray)) return dataArray;
    return dataArray.map(item => filterFields(item, accessLevel));
}

/**
 * Get denial message for restricted data
 * @param {string} accessLevel - Current access level
 * @param {string} requestedData - What was requested
 * @returns {string} User-friendly denial message
 */
export function getDenialMessage(accessLevel, requestedData) {
    const messages = {
        sales: `Maaf, informasi ${requestedData} (cost/margin) hanya dapat diakses oleh Finance Manager.`,
        sales_limited: `Maaf, Anda tidak memiliki akses ke informasi ${requestedData}.`,
        inventory: `Maaf, informasi finansial ${requestedData} tidak tersedia untuk role Inventory.`,
        purchasing: `Maaf, informasi harga jual tidak tersedia untuk role Purchasing.`,
        pos_only: `Maaf, informasi tersebut tidak tersedia untuk kasir.`,
        limited: `Maaf, Anda tidak memiliki akses ke informasi tersebut.`,
    };

    return messages[accessLevel] || messages.limited;
}

export default {
    DATA_ACCESS_RULES,
    canAccessTable,
    canAccessField,
    filterFields,
    filterDataArray,
    getDenialMessage,
};
