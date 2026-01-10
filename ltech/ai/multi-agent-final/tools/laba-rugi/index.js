/**
 * Laba Rugi Tool
 * Income Statement / Profit & Loss report
 */

import { SQLTool } from '../base-tool.js';
import { formatRupiah, formatTable, formatPercent } from '../../utils/formatter.js';

export class LabaRugiTool extends SQLTool {
    constructor() {
        super('laba-rugi', 'laba-rugi.sql');
    }

    getSchema() {
        return {
            name: 'get-laba-rugi',
            description: 'Get Income Statement (Laba Rugi) report for a period',
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
        return sql.replace(/\{schema\}/g, schema);
    }

    buildParams(params) {
        return [params.startDate, params.endDate];
    }

    formatResult(data) {
        if (!data.rows || data.rows.length === 0) {
            return {
                summary: 'Tidak ada data laba rugi untuk periode ini.',
                totalPendapatanUsaha: 0,
                totalHPP: 0,
                labaBruto: 0,
                marginBruto: 0,
                totalBebanOperasional: 0,
                labaOperasional: 0,
                totalPendapatanLain: 0,
                totalBebanNonOperasional: 0,
                labaRugiBersih: 0,
                marginBersih: 0,
                table: '',
            };
        }

        // Group by noklasifikasi
        // Klas 4 = Pendapatan Usaha
        // Klas 5 = Biaya Produksi & HPP
        // Klas 6 = Pengeluaran Operasional
        // Klas 7 = Pengeluaran Non Operasional
        // Klas 8 = Pendapatan Lain
        let totalPendapatanUsaha = 0;
        let totalHPP = 0;
        let totalBebanOperasional = 0;
        let totalBebanNonOperasional = 0;
        let totalPendapatanLain = 0;
        
        const pendapatanUsahaRows = [];
        const hppRows = [];
        const bebanOperasionalRows = [];
        const bebanNonOperasionalRows = [];
        const pendapatanLainRows = [];

        for (const row of data.rows) {
            const noklasifikasi = parseInt(row.noklasifikasi) || 0;
            const mutasi = parseFloat(row.mutasi) || 0;

            switch (noklasifikasi) {
                case 4: // Pendapatan Usaha
                    pendapatanUsahaRows.push(row);
                    totalPendapatanUsaha += mutasi;
                    break;
                case 5: // Biaya Produksi & HPP
                    hppRows.push(row);
                    totalHPP += Math.abs(mutasi);
                    break;
                case 6: // Pengeluaran Operasional
                    bebanOperasionalRows.push(row);
                    totalBebanOperasional += Math.abs(mutasi);
                    break;
                case 7: // Pengeluaran Non Operasional
                    bebanNonOperasionalRows.push(row);
                    totalBebanNonOperasional += Math.abs(mutasi);
                    break;
                case 8: // Pendapatan Lain
                    pendapatanLainRows.push(row);
                    totalPendapatanLain += mutasi;
                    break;
            }
        }

        // Calculate totals
        const labaBruto = totalPendapatanUsaha - totalHPP;
        const labaOperasional = labaBruto - totalBebanOperasional;
        const totalPendapatan = totalPendapatanUsaha + totalPendapatanLain;
        const totalBeban = totalHPP + totalBebanOperasional + totalBebanNonOperasional;
        const labaRugiBersih = totalPendapatan - totalBeban;
        const marginBersih = totalPendapatan > 0 ? (labaRugiBersih / totalPendapatan) : 0;
        const marginBruto = totalPendapatanUsaha > 0 ? (labaBruto / totalPendapatanUsaha) : 0;

        // Build markdown
        let md = `## 📊 Laba Rugi - ${data.params.startDate} s/d ${data.params.endDate}\n\n`;

        // PENDAPATAN USAHA
        md += `### PENDAPATAN USAHA\n`;
        if (pendapatanUsahaRows.length > 0) {
            md += formatTable(pendapatanUsahaRows, {
                columns: [
                    { key: 'akun', label: 'Akun', align: 'left' },
                    { key: 'mutasi', label: 'Jumlah', align: 'right', format: 'rupiah' },
                ],
            });
        } else {
            md += '_Tidak ada data pendapatan usaha_\n';
        }
        md += `\n**Total Pendapatan Usaha:** ${formatRupiah(totalPendapatanUsaha)}\n\n`;

        // HARGA POKOK PENJUALAN
        md += `### HARGA POKOK PENJUALAN (HPP)\n`;
        if (hppRows.length > 0) {
            md += formatTable(hppRows, {
                columns: [
                    { key: 'akun', label: 'Akun', align: 'left' },
                    { key: 'mutasi', label: 'Jumlah', align: 'right', format: 'rupiah' },
                ],
            });
        } else {
            md += '_Tidak ada data HPP_\n';
        }
        md += `\n**Total HPP:** ${formatRupiah(totalHPP)}\n\n`;

        // LABA BRUTO
        md += `### LABA BRUTO\n`;
        md += `**Laba Bruto:** ${formatRupiah(labaBruto)} _(Margin: ${formatPercent(marginBruto)})_\n\n`;

        // BEBAN OPERASIONAL
        md += `### BEBAN OPERASIONAL\n`;
        if (bebanOperasionalRows.length > 0) {
            md += formatTable(bebanOperasionalRows, {
                columns: [
                    { key: 'akun', label: 'Akun', align: 'left' },
                    { key: 'mutasi', label: 'Jumlah', align: 'right', format: 'rupiah' },
                ],
            });
        } else {
            md += '_Tidak ada data beban operasional_\n';
        }
        md += `\n**Total Beban Operasional:** ${formatRupiah(totalBebanOperasional)}\n\n`;

        // LABA OPERASIONAL
        md += `### LABA OPERASIONAL\n`;
        md += `**Laba Operasional:** ${formatRupiah(labaOperasional)}\n\n`;

        // PENDAPATAN LAIN
        md += `### PENDAPATAN LAIN-LAIN\n`;
        if (pendapatanLainRows.length > 0) {
            md += formatTable(pendapatanLainRows, {
                columns: [
                    { key: 'akun', label: 'Akun', align: 'left' },
                    { key: 'mutasi', label: 'Jumlah', align: 'right', format: 'rupiah' },
                ],
            });
        } else {
            md += '_Tidak ada data pendapatan lain_\n';
        }
        md += `\n**Total Pendapatan Lain:** ${formatRupiah(totalPendapatanLain)}\n\n`;

        // BEBAN NON OPERASIONAL
        md += `### BEBAN NON OPERASIONAL\n`;
        if (bebanNonOperasionalRows.length > 0) {
            md += formatTable(bebanNonOperasionalRows, {
                columns: [
                    { key: 'akun', label: 'Akun', align: 'left' },
                    { key: 'mutasi', label: 'Jumlah', align: 'right', format: 'rupiah' },
                ],
            });
        } else {
            md += '_Tidak ada data beban non operasional_\n';
        }
        md += `\n**Total Beban Non Operasional:** ${formatRupiah(totalBebanNonOperasional)}\n\n`;

        // SUMMARY
        md += `---\n\n`;
        md += `### RINGKASAN\n\n`;
        md += `| Keterangan | Jumlah |\n`;
        md += `|------------|-------:|\n`;
        md += `| Total Pendapatan Usaha | ${formatRupiah(totalPendapatanUsaha)} |\n`;
        md += `| Total HPP | (${formatRupiah(totalHPP)}) |\n`;
        md += `| **Laba Bruto** | **${formatRupiah(labaBruto)}** |\n`;
        md += `| Margin Bruto | ${formatPercent(marginBruto)} |\n`;
        md += `| Total Beban Operasional | (${formatRupiah(totalBebanOperasional)}) |\n`;
        md += `| **Laba Operasional** | **${formatRupiah(labaOperasional)}** |\n`;
        md += `| Total Pendapatan Lain | ${formatRupiah(totalPendapatanLain)} |\n`;
        md += `| Total Beban Non Operasional | (${formatRupiah(totalBebanNonOperasional)}) |\n`;
        md += `| **Laba/Rugi Bersih** | **${formatRupiah(labaRugiBersih)}** |\n`;
        md += `| Margin Bersih | ${formatPercent(marginBersih)} |\n\n`;

        // Status
        if (labaRugiBersih > 0) {
            md += `✅ **LABA** - Perusahaan menghasilkan profit.\n`;
        } else if (labaRugiBersih < 0) {
            md += `⚠️ **RUGI** - Perusahaan mengalami kerugian!\n`;
        } else {
            md += `➖ **IMPAS** - Break even.\n`;
        }

        return {
            summary: md,
            totalPendapatanUsaha,
            totalHPP,
            labaBruto,
            marginBruto,
            totalBebanOperasional,
            labaOperasional,
            totalPendapatanLain,
            totalBebanNonOperasional,
            labaRugiBersih,
            marginBersih,
            rows: data.rows,
        };
    }
}

export default LabaRugiTool;
