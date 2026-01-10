/**
 * Indonesian Date Parser
 * Parse natural language dates in Bahasa Indonesia
 */

/**
 * Month names in Indonesian
 */
const MONTHS_ID = {
    januari: 0, jan: 0,
    februari: 1, feb: 1,
    maret: 2, mar: 2,
    april: 3, apr: 3,
    mei: 4,
    juni: 5, jun: 5,
    juli: 6, jul: 6,
    agustus: 7, agu: 7, ags: 7,
    september: 8, sep: 8, sept: 8,
    oktober: 9, okt: 9,
    november: 10, nov: 10, nop: 10,
    desember: 11, des: 11,
};

/**
 * Relative date keywords
 */
const RELATIVE_KEYWORDS = {
    'hari ini': () => new Date(),
    'kemarin': () => { const d = new Date(); d.setDate(d.getDate() - 1); return d; },
    'besok': () => { const d = new Date(); d.setDate(d.getDate() + 1); return d; },
    'minggu ini': () => getWeekRange(0),
    'minggu lalu': () => getWeekRange(-1),
    'bulan ini': () => getMonthRange(0),
    'bulan lalu': () => getMonthRange(-1),
    'bulan kemarin': () => getMonthRange(-1),
    'tahun ini': () => getYearRange(0),
    'tahun lalu': () => getYearRange(-1),
    'tahun kemarin': () => getYearRange(-1),
    'kuartal ini': () => getQuarterRange(0),
    'kuartal lalu': () => getQuarterRange(-1),
    'q1': () => getQuarterRange(1, true),
    'q2': () => getQuarterRange(2, true),
    'q3': () => getQuarterRange(3, true),
    'q4': () => getQuarterRange(4, true),
};

/**
 * Get week range
 */
function getWeekRange(offset) {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek + (offset * 7));
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return { start: startOfWeek, end: endOfWeek };
}

/**
 * Get month range
 */
function getMonthRange(offset) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + offset;

    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);

    return { start, end };
}

/**
 * Get year range
 */
function getYearRange(offset) {
    const year = new Date().getFullYear() + offset;
    return {
        start: new Date(year, 0, 1),
        end: new Date(year, 11, 31, 23, 59, 59, 999),
    };
}

/**
 * Get quarter range
 */
function getQuarterRange(quarterOrOffset, isAbsolute = false) {
    const now = new Date();
    const year = now.getFullYear();

    let quarter;
    if (isAbsolute) {
        quarter = quarterOrOffset;
    } else {
        const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
        quarter = currentQuarter + quarterOrOffset;
    }

    const startMonth = (quarter - 1) * 3;
    return {
        start: new Date(year, startMonth, 1),
        end: new Date(year, startMonth + 3, 0, 23, 59, 59, 999),
    };
}

/**
 * Parse Indonesian date string
 * @param {string} text - Date text in Indonesian
 * @returns {Object} { start: Date, end: Date } or null
 */
export function parseDateRange(text) {
    if (!text) return null;

    const lowerText = text.toLowerCase().trim();

    // Check relative keywords
    for (const [keyword, fn] of Object.entries(RELATIVE_KEYWORDS)) {
        if (lowerText.includes(keyword)) {
            const result = fn();
            if (result.start && result.end) {
                return result;
            }
            // Single date
            return { start: result, end: result };
        }
    }

    // Pattern: "bulan januari 2025" or "januari 2025"
    const monthYearMatch = lowerText.match(/(?:bulan\s+)?(\w+)\s+(\d{4})/);
    if (monthYearMatch) {
        const monthName = monthYearMatch[1];
        const year = parseInt(monthYearMatch[2]);
        const month = MONTHS_ID[monthName];

        if (month !== undefined) {
            return {
                start: new Date(year, month, 1),
                end: new Date(year, month + 1, 0, 23, 59, 59, 999),
            };
        }
    }

    // Pattern: "tahun 2025" or just "2025"
    const yearMatch = lowerText.match(/(?:tahun\s+)?(\d{4})/);
    if (yearMatch) {
        const year = parseInt(yearMatch[1]);
        return {
            start: new Date(year, 0, 1),
            end: new Date(year, 11, 31, 23, 59, 59, 999),
        };
    }

    // Pattern: "desember" (current year assumed)
    for (const [monthName, monthIndex] of Object.entries(MONTHS_ID)) {
        if (lowerText.includes(monthName)) {
            const year = new Date().getFullYear();
            return {
                start: new Date(year, monthIndex, 1),
                end: new Date(year, monthIndex + 1, 0, 23, 59, 59, 999),
            };
        }
    }

    // Pattern: "3 bulan terakhir"
    const lastNMonths = lowerText.match(/(\d+)\s*bulan\s*(?:terakhir|lalu)/);
    if (lastNMonths) {
        const n = parseInt(lastNMonths[1]);
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - n + 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        return { start, end };
    }

    return null;
}

/**
 * Format date to Indonesian format
 * @param {Date} date - Date object
 * @returns {string} Formatted date
 */
export function formatDateID(date) {
    if (!date) return '';
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Format date to SQL format (YYYY-MM-DD)
 * @param {Date} date - Date object
 * @returns {string} SQL date
 */
export function formatDateSQL(date) {
    if (!date) return null;
    return date.toISOString().split('T')[0];
}

/**
 * Extract period from question text
 * @param {string} question - User question
 * @returns {Object} { startDate, endDate, periodDescription }
 */
export function extractPeriod(question) {
    const range = parseDateRange(question);

    if (!range) {
        // Default to current month
        const now = new Date();
        return {
            startDate: formatDateSQL(new Date(now.getFullYear(), now.getMonth(), 1)),
            endDate: formatDateSQL(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
            periodDescription: 'bulan ini',
        };
    }

    return {
        startDate: formatDateSQL(range.start),
        endDate: formatDateSQL(range.end),
        periodDescription: `${formatDateID(range.start)} - ${formatDateID(range.end)}`,
    };
}

export default {
    parseDateRange,
    formatDateID,
    formatDateSQL,
    extractPeriod,
};
