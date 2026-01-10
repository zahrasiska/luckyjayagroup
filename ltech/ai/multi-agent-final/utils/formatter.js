/**
 * Formatters
 * Utility functions for formatting data
 */

/**
 * Format number as Indonesian Rupiah
 * @param {number} amount - Amount to format
 * @param {boolean} showSymbol - Include "Rp" symbol
 * @returns {string} Formatted currency
 */
export function formatRupiah(amount, showSymbol = true) {
    if (amount === null || amount === undefined) return '-';

    const number = parseFloat(amount);
    if (isNaN(number)) return '-';

    const formatted = new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(Math.abs(number));

    const sign = number < 0 ? '-' : '';
    return showSymbol ? `${sign}Rp ${formatted}` : `${sign}${formatted}`;
}

/**
 * Format number as percentage
 * @param {number} value - Value to format (0.25 = 25%)
 * @param {number} decimals - Decimal places
 * @returns {string} Formatted percentage
 */
export function formatPercent(value, decimals = 1) {
    if (value === null || value === undefined) return '-';

    const number = parseFloat(value) * 100;
    if (isNaN(number)) return '-';

    return `${number.toFixed(decimals)}%`;
}

/**
 * Format large numbers with abbreviation
 * @param {number} value - Number to format
 * @returns {string} Abbreviated number (1.5jt, 2M, etc)
 */
export function formatAbbreviated(value) {
    if (value === null || value === undefined) return '-';

    const number = parseFloat(value);
    if (isNaN(number)) return '-';

    const absValue = Math.abs(number);
    const sign = number < 0 ? '-' : '';

    if (absValue >= 1_000_000_000_000) {
        return `${sign}${(absValue / 1_000_000_000_000).toFixed(1)}T`;
    }
    if (absValue >= 1_000_000_000) {
        return `${sign}${(absValue / 1_000_000_000).toFixed(1)}M`; // Miliar
    }
    if (absValue >= 1_000_000) {
        return `${sign}${(absValue / 1_000_000).toFixed(1)}jt`;
    }
    if (absValue >= 1_000) {
        return `${sign}${(absValue / 1_000).toFixed(1)}rb`;
    }

    return `${sign}${absValue.toFixed(0)}`;
}

/**
 * Format number with thousand separator
 * @param {number} value - Number to format
 * @returns {string} Formatted number
 */
export function formatNumber(value) {
    if (value === null || value === undefined) return '-';

    const number = parseFloat(value);
    if (isNaN(number)) return '-';

    return new Intl.NumberFormat('id-ID').format(number);
}

/**
 * Format data as Markdown table
 * @param {Object[]} data - Array of objects
 * @param {Object} options - { columns: [{key, label, align, format}] }
 * @returns {string} Markdown table
 */
export function formatTable(data, options = {}) {
    if (!Array.isArray(data) || data.length === 0) {
        return '_Tidak ada data_';
    }

    const columns = options.columns || Object.keys(data[0]).map(key => ({ key, label: key }));

    // Header
    const header = '| ' + columns.map(c => c.label).join(' | ') + ' |';

    // Separator with alignment
    const separator = '| ' + columns.map(c => {
        const align = c.align || 'left';
        if (align === 'right') return '---:';
        if (align === 'center') return ':---:';
        return '---';
    }).join(' | ') + ' |';

    // Rows
    const rows = data.map(row => {
        const cells = columns.map(c => {
            let value = row[c.key];

            // Apply format if specified
            if (c.format === 'rupiah') value = formatRupiah(value, false);
            else if (c.format === 'percent') value = formatPercent(value);
            else if (c.format === 'number') value = formatNumber(value);
            else if (c.format === 'abbreviated') value = formatAbbreviated(value);
            else if (value === null || value === undefined) value = '-';

            return String(value);
        });
        return '| ' + cells.join(' | ') + ' |';
    });

    return [header, separator, ...rows].join('\n');
}

/**
 * Status indicator emoji
 */
export const STATUS_EMOJI = {
    good: '✅',
    warning: '⚠️',
    danger: '❌',
    info: 'ℹ️',
    up: '📈',
    down: '📉',
    neutral: '➖',
};

/**
 * Get status indicator based on value comparison
 * @param {number} value - Current value
 * @param {number} target - Target value
 * @param {boolean} higherIsBetter - Whether higher value is better
 * @returns {string} Status emoji
 */
export function getStatusIndicator(value, target, higherIsBetter = true) {
    if (value === null || target === null) return STATUS_EMOJI.neutral;

    const ratio = value / target;

    if (higherIsBetter) {
        if (ratio >= 1) return STATUS_EMOJI.good;
        if (ratio >= 0.8) return STATUS_EMOJI.warning;
        return STATUS_EMOJI.danger;
    } else {
        if (ratio <= 1) return STATUS_EMOJI.good;
        if (ratio <= 1.2) return STATUS_EMOJI.warning;
        return STATUS_EMOJI.danger;
    }
}

/**
 * Format comparison with previous period
 * @param {number} current - Current value
 * @param {number} previous - Previous value
 * @returns {string} Comparison string
 */
export function formatComparison(current, previous) {
    if (current === null || previous === null || previous === 0) return '';

    const change = ((current - previous) / previous) * 100;
    const absChange = Math.abs(change).toFixed(1);

    if (change > 0) {
        return `${STATUS_EMOJI.up} +${absChange}%`;
    } else if (change < 0) {
        return `${STATUS_EMOJI.down} -${absChange}%`;
    }
    return `${STATUS_EMOJI.neutral} 0%`;
}

export default {
    formatRupiah,
    formatPercent,
    formatAbbreviated,
    formatNumber,
    formatTable,
    STATUS_EMOJI,
    getStatusIndicator,
    formatComparison,
};
