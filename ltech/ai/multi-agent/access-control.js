/**
 * Field-Level Access Control Rules
 * 
 * Defines what data each agent can access
 */

const ACCESS_RULES = {
    // Agent 1: Router - metadata only
    'router': {
        tables: [],
        fields: {},
        description: 'No direct DB access, routing only',
    },

    // Agent 2: Finance Manager - Full financial access
    'finance-manager': {
        tables: ['t', 'd', 'kas', 'rekening', 'klas', 'j'],
        fields: {
            allowed: ['*'], // All fields
            denied: [],
        },
        description: 'Full access to financial data',
    },

    // Agent 3: Sales Manager - Sales data, NO cost
    'sales-manager': {
        tables: ['t', 'd', 'brg', 'kontak'],
        fields: {
            allowed: ['notrans', 'tanggal', 'idkontak', 'qty', 'harga', 'subtotal', 'nama', 'merk'],
            denied: ['hpp', 'hargabeli', 'margin'], // NO cost data
        },
        description: 'Sales & customer data, no cost information',
    },

    // Agent 4: Inventory Manager - Stock only, NO pricing/financial details
    'inventory-manager': {
        tables: ['brg', 'd', 'brginfo', 'brgmerk', 'brgkategori', 'lokasi'],
        fields: {
            allowed: ['id', 'idbarang', 'nama', 'merk', 'qty', 'idsatuan', 'idlokasi', 'stock', 'harga'], // Allowed product price for value monitoring
            denied: ['hargabeli', 'hpp', 'subtotal', 'total', 'nilaitotal', 'bayar', 'saldo'], // NO cost, NO financial totals
        },
        description: 'Stock levels and product details, no financial report or costs',
    },

    // Agent 5: CEO/Direksi - All aggregated data
    'ceo-direksi': {
        tables: ['*'], // All tables
        fields: {
            allowed: ['*'], // All fields (aggregated)
            denied: ['password', 'pin'], // Sensitive user data only
        },
        description: 'Full access to aggregated business metrics',
    },

    // Agent 6: Purchasing Manager
    'purchasing-manager': {
        tables: ['t', 'd', 'brg', 'kontak'],
        fields: {
            allowed: ['notrans', 'tanggal', 'idbarang', 'qty', 'hargabeli', 'hpp'],
            denied: ['harga', 'margin'], // NO selling price
        },
        description: 'Purchase data & cost, no selling prices',
    },

    // Agent 7: HR Manager
    'hr-manager': {
        tables: ['users', 'dept', 'devisi'],
        fields: {
            allowed: ['nama', 'email', 'dept', 'devisi', 'jabatan'],
            denied: ['password', 'pin', 'gaji', 'salary'], // Sensitive HR data
        },
        description: 'Employee data, no sensitive info',
    },

    // Agent 8: Production Manager
    'production-manager': {
        tables: ['brg', 'brgkomponen', 'd', 't'],
        fields: {
            allowed: ['idbarang', 'nama', 'qty', 'komponen', 'bom'],
            denied: ['harga', 'hargabeli', 'hpp'],
        },
        description: 'Production & BOM data, no pricing',
    },

    // Agent 9: Accounting Manager
    'accounting-manager': {
        tables: ['j', 'kas', 'rekening', 'klas', 't', 'd'],
        fields: {
            allowed: ['*'], // Full accounting access
            denied: [],
        },
        description: 'Full accounting & journal access',
    },

    // Agent 10: Marketing Manager
    'marketing-manager': {
        tables: ['t', 'd', 'brg', 'kontak'],
        fields: {
            allowed: ['notrans', 'tanggal', 'idkontak', 'nama', 'email', 'qty', 'subtotal'],
            denied: ['hpp', 'hargabeli', 'margin'],
        },
        description: 'Sales & customer data for marketing',
    },

    // Agent 11: Data Analyst - Full but read-only
    'data-analyst': {
        tables: ['*'],
        fields: {
            allowed: ['*'],
            denied: ['password', 'pin'],
        },
        description: 'Full read access for data extraction',
    },

    // Agent 12: Summarizer - no DB access
    'summarizer': {
        tables: [],
        fields: {
            allowed: [],
            denied: ['*'],
        },
        description: 'No DB access, text processing only',
    },
};

/**
 * Check if agent can access table
 */
function canAccessTable(agentId, tableName) {
    const rules = ACCESS_RULES[agentId];

    if (!rules) {
        return false;
    }

    if (rules.tables.includes('*')) {
        return true;
    }

    return rules.tables.includes(tableName);
}

/**
 * Check if agent can access field
 */
function canAccessField(agentId, fieldName) {
    const rules = ACCESS_RULES[agentId];

    if (!rules) {
        return false;
    }

    // Check denied list first
    if (rules.fields.denied.includes(fieldName) || rules.fields.denied.includes('*')) {
        return false;
    }

    // Check allowed list
    if (rules.fields.allowed.includes('*')) {
        return !rules.fields.denied.includes(fieldName);
    }

    return rules.fields.allowed.includes(fieldName);
}

/**
 * Filter SQL query result based on agent access
 */
function filterResultByAccess(agentId, result) {
    const rules = ACCESS_RULES[agentId];

    if (!rules || !result || !result.rows) {
        return result;
    }

    // If full access, return as-is
    if (rules.fields.allowed.includes('*') && rules.fields.denied.length === 0) {
        return result;
    }

    // Filter fields
    const filteredRows = result.rows.map(row => {
        const filteredRow = {};

        for (const [field, value] of Object.entries(row)) {
            if (canAccessField(agentId, field)) {
                filteredRow[field] = value;
            } else {
                filteredRow[field] = '[RESTRICTED]';
            }
        }

        return filteredRow;
    });

    return {
        ...result,
        rows: filteredRows,
    };
}

/**
 * Get access rules for agent (for injection into QWEN.md)
 */
function getAccessRulesForAgent(agentId) {
    const rules = ACCESS_RULES[agentId];

    if (!rules) {
        return 'No access rules defined';
    }

    let rulesText = `## Your Access Permissions

**Description:** ${rules.description}

**Allowed Tables:**
${rules.tables.includes('*') ? '- All tables' : rules.tables.map(t => `- ${t}`).join('\n')}

**Field Access:**
`;

    if (rules.fields.allowed.includes('*')) {
        rulesText += '- All fields EXCEPT:\n';
        rulesText += rules.fields.denied.map(f => `  - ${f}`).join('\n');
    } else {
        rulesText += '- Only these fields:\n';
        rulesText += rules.fields.allowed.map(f => `  - ${f}`).join('\n');
    }

    rulesText += `\n\n⚠️ **IMPORTANT:** Do NOT attempt to query restricted fields. Queries will be filtered.`;

    return rulesText;
}

module.exports = {
    ACCESS_RULES,
    canAccessTable,
    canAccessField,
    filterResultByAccess,
    getAccessRulesForAgent,
};
