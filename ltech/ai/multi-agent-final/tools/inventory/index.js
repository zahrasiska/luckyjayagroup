/**
 * Inventory Tool
 * Analysis of stock levels, low stock alerts, and valuation
 */

import { SQLTool } from '../base-tool.js';
import { formatRupiah, formatTable, formatNumber } from '../../utils/formatter.js';

export class InventoryTool extends SQLTool {
    constructor() {
        super('inventory', 'inventory-summary.sql');
    }

    getSchema() {
        return {
            name: 'get-inventory-analysis',
            description: 'Get inventory summary and list of items below minimum stock',
            parameters: {
                type: 'object',
                properties: {
                    limit: {
                        type: 'integer',
                        description: 'Number of low stock items to return (default: 10)',
                        default: 10,
                    },
                },
            },
        };
    }

    replacePlaceholders(sql, params, context) {
        const schema = context?.tenant?.schema || 'public';
        return sql.replace(/\{schema\}/g, schema);
    }

    buildParams(params) {
        return [params.limit || 10];
    }

    formatResult(data) {
        if (!data.rows || data.rows.length === 0 || !data.rows[0].summary) {
            return {
                summary: 'Tidak ada data inventori ditemukan.',
                data: null,
            };
        }

        const { summary, low_stock } = data.rows[0];

        let md = `## 📦 Analisa Inventori (Stok)\n\n`;

        // RINGKASAN
        md += `### 📋 Ringkasan Stok\n\n`;
        md += `| Keterangan | Nilai |\n`;
        md += `|------------|-------:|\n`;
        md += `| Total Item Aktif | ${formatNumber(summary.total_items)} |\n`;
        md += `| Total Kuantitas (Qty) | ${formatNumber(summary.total_qty)} |\n`;
        md += `| Total Nilai Inventori | ${formatRupiah(summary.total_value)} |\n`;
        md += `| **Item di Bawah Stok Minimum** | **${formatNumber(summary.low_stock_count)}** |\n\n`;

        // LOW STOCK
        md += `### ⚠️ Item Harus Reorder (Stok < Minimal)\n\n`;
        if (low_stock && low_stock.length > 0) {
            md += formatTable(low_stock, {
                columns: [
                    { key: 'nama', label: 'Nama Barang', align: 'left' },
                    { key: 'merk', label: 'Merk', align: 'left' },
                    { key: 'total_stok', label: 'Stok', align: 'right', format: 'number' },
                    { key: 'minimal', label: 'Min', align: 'right', format: 'number' },
                    { key: 'harga_beli', label: 'Harga Beli', align: 'right', format: 'rupiah' },
                ],
            });

            if (summary.low_stock_count > data.params.limit) {
                md += `\n_...tampilkan ${data.params.limit} dari ${summary.low_stock_count} item_\n`;
            }
        } else {
            md += `✅ **Semua stok aman!** Tidak ada item di bawah batas minimum.\n`;
        }

        // ANALISIS SINGKAT
        md += `\n---\n\n`;
        const valuePerItem = summary.total_items > 0 ? summary.total_value / summary.total_items : 0;
        md += `💡 **Wawasan:** Rata-rata nilai inventori per item adalah ${formatRupiah(valuePerItem)}.\n`;

        if (summary.low_stock_count > 0) {
            md += `Rekomendasi: Segera lakukan pengadaan untuk ${summary.low_stock_count} item yang kritis.\n`;
        }

        return {
            summary: md,
            data: { summary, low_stock },
        };
    }
}

export default InventoryTool;
