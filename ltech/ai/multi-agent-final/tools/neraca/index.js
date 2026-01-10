/**
 * Neraca Tool
 * Balance Sheet report tool
 */

import { SQLTool } from '../base-tool.js';
import { formatRupiah, formatTable } from '../../utils/formatter.js';

export class NeracaTool extends SQLTool {
    constructor() {
        super('neraca', 'neraca.sql');
    }

    getSchema() {
        return {
            name: 'get-neraca',
            description: 'Get Balance Sheet (Neraca) report for a period',
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
                },
                required: ['startDate', 'endDate'],
            },
        };
    }

    replacePlaceholders(sql, params, context) {
        const schema = context?.tenant?.schema || 'public';
        // Don't replace $1, $2 - they are PostgreSQL parameter placeholders
        return sql.replace(/\{schema\}/g, schema);
    }

    buildParams(params) {
        // $1 = startDate, $2 = endDate
        return [params.startDate, params.endDate];
    }

    formatResult(data) {
        if (!data.rows || data.rows.length === 0) {
            return {
                summary: 'Tidak ada data neraca untuk periode ini.',
                totalAset: 0,
                totalKewajiban: 0,
                totalEkuitas: 0,
                table: '',
            };
        }

        // Group by classification
        const grouped = {
            ASET: [],
            KEWAJIBAN: [],
            EKUITAS: [],
        };

        let totalAset = 0;
        let totalKewajiban = 0;
        let totalEkuitas = 0;

        for (const row of data.rows) {
            const klasifikasi = row.klasifikasi?.toUpperCase() || 'LAINNYA';
            const saldo = parseFloat(row.saldo) || 0;

            if (klasifikasi.includes('ASET') || klasifikasi.includes('AKTIVA')) {
                grouped.ASET.push(row);
                totalAset += saldo;
            } else if (klasifikasi.includes('KEWAJIBAN') || klasifikasi.includes('HUTANG') || klasifikasi.includes('LIABILITAS')) {
                grouped.KEWAJIBAN.push(row);
                totalKewajiban += saldo;
            } else if (klasifikasi.includes('EKUITAS') || klasifikasi.includes('MODAL')) {
                grouped.EKUITAS.push(row);
                totalEkuitas += saldo;
            }
        }

        // Build markdown table
        let md = `## 📊 Neraca - ${data.params.startDate} s/d ${data.params.endDate}\n\n`;

        // ASET
        md += `### ASET\n`;
        md += formatTable(grouped.ASET, {
            columns: [
                { key: 'subklasifikasi', label: 'Kategori', align: 'left' },
                { key: 'saldo', label: 'Saldo', align: 'right', format: 'rupiah' },
            ],
        });
        md += `\n**Total Aset:** ${formatRupiah(totalAset)}\n\n`;

        // KEWAJIBAN
        md += `### KEWAJIBAN\n`;
        md += formatTable(grouped.KEWAJIBAN, {
            columns: [
                { key: 'subklasifikasi', label: 'Kategori', align: 'left' },
                { key: 'saldo', label: 'Saldo', align: 'right', format: 'rupiah' },
            ],
        });
        md += `\n**Total Kewajiban:** ${formatRupiah(totalKewajiban)}\n\n`;

        // EKUITAS
        md += `### EKUITAS\n`;
        md += formatTable(grouped.EKUITAS, {
            columns: [
                { key: 'subklasifikasi', label: 'Kategori', align: 'left' },
                { key: 'saldo', label: 'Saldo', align: 'right', format: 'rupiah' },
            ],
        });
        md += `\n**Total Ekuitas:** ${formatRupiah(totalEkuitas)}\n\n`;

        // Balance check
        const balance = totalAset - (totalKewajiban + totalEkuitas);
        if (Math.abs(balance) > 1) {
            md += `\n⚠️ **Warning:** Neraca tidak balance! Selisih: ${formatRupiah(balance)}\n`;
        } else {
            md += `\n✅ Neraca balance.\n`;
        }

        return {
            summary: md,
            totalAset,
            totalKewajiban,
            totalEkuitas,
            balance,
            rows: data.rows,
        };
    }
}

export default NeracaTool;
