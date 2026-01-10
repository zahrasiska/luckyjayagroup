/**
 * Saldo Kas Tool
 * Cash & Bank Balance report
 */

import { SQLTool } from '../base-tool.js';
import { formatRupiah, formatTable } from '../../utils/formatter.js';

export class SaldoKasTool extends SQLTool {
    constructor() {
        super('saldo-kas', 'saldo-kas.sql');
    }

    getSchema() {
        return {
            name: 'get-saldo-kas',
            description: 'Get Cash & Bank balance as of a specific date',
            parameters: {
                type: 'object',
                properties: {
                    asOfDate: {
                        type: 'string',
                        description: 'Date to check balance (YYYY-MM-DD format)',
                    },
                },
                required: ['asOfDate'],
            },
        };
    }

    replacePlaceholders(sql, params, context) {
        const schema = context?.tenant?.schema || 'public';
        return sql.replace(/\{schema\}/g, schema);
    }

    buildParams(params) {
        return [params.asOfDate];
    }

    formatResult(data) {
        if (!data.rows || data.rows.length === 0) {
            return {
                summary: 'Tidak ada data saldo kas/bank.',
                totalKas: 0,
                totalBank: 0,
                grandTotal: 0,
                accounts: [],
            };
        }

        // Group by Kas vs Bank
        let totalKas = 0;
        let totalBank = 0;
        const kasRows = [];
        const bankRows = [];

        for (const row of data.rows) {
            const subklasifikasi = row.subklasifikasi?.toLowerCase() || '';
            const saldo = parseFloat(row.saldo) || 0;

            if (subklasifikasi.includes('kas')) {
                kasRows.push(row);
                totalKas += saldo;
            } else if (subklasifikasi.includes('bank')) {
                bankRows.push(row);
                totalBank += saldo;
            }
        }

        const grandTotal = totalKas + totalBank;

        // Build markdown
        let md = `## 💰 Saldo Kas & Bank - Per ${data.params.asOfDate}\n\n`;

        // KAS
        md += `### KAS\n`;
        if (kasRows.length > 0) {
            md += formatTable(kasRows, {
                columns: [
                    { key: 'kode', label: 'Kode', align: 'left' },
                    { key: 'akun', label: 'Akun', align: 'left' },
                    { key: 'saldo', label: 'Saldo', align: 'right', format: 'rupiah' },
                ],
            });
        } else {
            md += '_Tidak ada akun kas_\n';
        }
        md += `\n**Total Kas:** ${formatRupiah(totalKas)}\n\n`;

        // BANK
        md += `### BANK\n`;
        if (bankRows.length > 0) {
            md += formatTable(bankRows, {
                columns: [
                    { key: 'kode', label: 'Kode', align: 'left' },
                    { key: 'akun', label: 'Akun', align: 'left' },
                    { key: 'saldo', label: 'Saldo', align: 'right', format: 'rupiah' },
                ],
            });
        } else {
            md += '_Tidak ada akun bank_\n';
        }
        md += `\n**Total Bank:** ${formatRupiah(totalBank)}\n\n`;

        // TOTAL
        md += `---\n\n`;
        md += `### 💵 TOTAL SALDO: ${formatRupiah(grandTotal)}\n\n`;

        // Warning jika saldo rendah
        if (grandTotal < 10000000) { // < 10 juta
            md += `⚠️ **Perhatian:** Saldo kas/bank relatif rendah.\n`;
        }

        return {
            summary: md,
            totalKas,
            totalBank,
            grandTotal,
            accounts: data.rows,
        };
    }
}

export default SaldoKasTool;
