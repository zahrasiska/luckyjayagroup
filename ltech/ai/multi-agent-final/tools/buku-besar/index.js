/**
 * Buku Besar Tool
 * General Ledger report
 */

import { SQLTool } from '../base-tool.js';
import { formatRupiah, formatTable } from '../../utils/formatter.js';

export class BukuBesarTool extends SQLTool {
    constructor() {
        super('buku-besar', 'buku-besar.sql');
    }

    getSchema() {
        return {
            name: 'get-buku-besar',
            description: 'Get General Ledger (Buku Besar) transactions for a period and optional account',
            parameters: {
                type: 'object',
                properties: {
                    startDate: {
                        type: 'string',
                        description: 'Start date in YYYY-MM-DD format',
                    },
                    endDate: {
                        type: 'string',
                        description: 'End date in YYYY-MM-DD format',
                    },
                    accountCode: {
                        type: 'string',
                        description: 'Account code to filter (optional, leave empty for all accounts)',
                    },
                },
                required: ['startDate', 'endDate'],
            },
        };
    }

    replacePlaceholders(sql, params, context) {
        const schema = context?.tenant?.schema || 'public';
        return sql.replace(/\{schema\}/g, schema);
    }

    buildParams(params) {
        // $3 is account filter - use '%' for all
        const accountFilter = params.accountCode || '%';
        return [params.startDate, params.endDate, accountFilter];
    }

    formatResult(data) {
        if (!data.rows || data.rows.length === 0) {
            return {
                summary: 'Tidak ada transaksi buku besar untuk periode ini.',
                totalDebit: 0,
                totalKredit: 0,
                transactionCount: 0,
                transactions: [],
            };
        }

        // Calculate totals
        let totalDebit = 0;
        let totalKredit = 0;

        for (const row of data.rows) {
            totalDebit += parseFloat(row.debit) || 0;
            totalKredit += parseFloat(row.kredit) || 0;
        }

        // Build markdown
        let md = `## 📒 Buku Besar - ${data.params.startDate} s/d ${data.params.endDate}\n\n`;

        if (data.params.accountCode && data.params.accountCode !== '%') {
            md += `**Filter Akun:** ${data.params.accountCode}\n\n`;
        }

        md += `**Jumlah Transaksi:** ${data.rows.length}\n\n`;

        // Show first 20 transactions
        const displayRows = data.rows.slice(0, 20);

        md += formatTable(displayRows, {
            columns: [
                { key: 'tanggal', label: 'Tanggal', align: 'left' },
                { key: 'notrans', label: 'No Trans', align: 'left' },
                { key: 'kode_akun', label: 'Kode', align: 'left' },
                { key: 'uraian', label: 'Uraian', align: 'left' },
                { key: 'debit', label: 'Debit', align: 'right', format: 'rupiah' },
                { key: 'kredit', label: 'Kredit', align: 'right', format: 'rupiah' },
            ],
        });

        if (data.rows.length > 20) {
            md += `\n_...dan ${data.rows.length - 20} transaksi lainnya_\n`;
        }

        md += `\n---\n\n`;
        md += `### TOTAL\n\n`;
        md += `| Keterangan | Jumlah |\n`;
        md += `|------------|-------:|\n`;
        md += `| Total Debit | ${formatRupiah(totalDebit)} |\n`;
        md += `| Total Kredit | ${formatRupiah(totalKredit)} |\n`;
        md += `| Selisih | ${formatRupiah(totalDebit - totalKredit)} |\n`;

        return {
            summary: md,
            totalDebit,
            totalKredit,
            transactionCount: data.rows.length,
            transactions: data.rows,
        };
    }
}

export default BukuBesarTool;
