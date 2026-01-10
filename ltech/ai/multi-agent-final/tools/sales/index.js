/**
 * Sales Tool
 * Analysis of sales performance, top products, and trends
 */

import { SQLTool } from '../base-tool.js';
import { formatRupiah, formatTable, formatNumber } from '../../utils/formatter.js';

export class SalesTool extends SQLTool {
    constructor() {
        super('sales', 'sales-summary.sql');
    }

    getSchema() {
        return {
            name: 'get-sales-analysis',
            description: 'Get sales summary, top products, and returns for a period. Can filter by brand/merk.',
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
                    limit: {
                        type: 'integer',
                        description: 'Number of top products to return (default: 10)',
                        default: 10,
                    },
                    brand: {
                        type: 'string',
                        description: 'Brand/merk filter (optional, use partial name like "FASTER", "GS", etc.)',
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
        const brandFilter = params.brand ? `%${params.brand}%` : '%';
        return [params.startDate, params.endDate, params.limit || 10, brandFilter];
    }

    formatResult(data) {
        if (!data.rows || data.rows.length === 0 || !data.rows[0].summary) {
            return {
                summary: 'Tidak ada data penjualan untuk periode ini.',
                data: null,
            };
        }

        const { summary, top_products } = data.rows[0];
        const { startDate, endDate, brand } = data.params;

        let md = `## 📈 Analisa Penjualan - ${startDate} s/d ${endDate}\n`;
        if (brand && brand !== '%') {
            md += `**Filter Merk:** ${brand.replace(/%/g, '')}\n`;
        }
        md += `\n`;

        // RINGKASAN
        md += `### 📋 Ringkasan Performa\n\n`;
        md += `| Keterangan | Jumlah | Nilai (Rp) |\n`;
        md += `|------------|--------|------------:|\n`;
        md += `| Penjualan (PJ) | ${formatNumber(summary.count_pj)} | ${formatRupiah(summary.value_pj)} |\n`;
        md += `| Retur (RJ) | ${formatNumber(summary.count_rj)} | ${formatRupiah(summary.value_rj)} |\n`;
        md += `| **Net Sales** | | **${formatRupiah(summary.net_value)}** |\n\n`;

        // TOP PRODUCTS
        md += `### 🏆 Top ${data.params.limit || 10} Produk (by Value)\n\n`;
        if (top_products && top_products.length > 0) {
            md += formatTable(top_products, {
                columns: [
                    { key: 'item_name', label: 'Nama Barang', align: 'left' },
                    { key: 'brand_name', label: 'Merk', align: 'left' },
                    { key: 'qty', label: 'Qty', align: 'right', format: 'number' },
                    { key: 'amount', label: 'Total Nilai', align: 'right', format: 'rupiah' },
                ],
            });
        } else {
            md += '_Tidak ada data produk_\n';
        }

        // ANALISIS SINGKAT
        md += `\n---\n\n`;
        if (summary.value_rj > summary.value_pj * 0.1) {
            md += `⚠️ **WARNING:** Tingkat retur cukup tinggi (${((summary.value_rj / summary.value_pj) * 100).toFixed(1)}% dari penjualan).\n`;
        }

        return {
            summary: md,
            data: { summary, top_products },
        };
    }
}

export class BrandSalesTool extends SQLTool {
    constructor() {
        super('sales', 'brand-sales.sql');
    }

    getSchema() {
        return {
            name: 'get-top-brands',
            description: 'Get list of top performing brands/merk by sales value.',
            parameters: {
                type: 'object',
                properties: {
                    startDate: { type: 'string', description: 'Start date YYYY-MM-DD' },
                    endDate: { type: 'string', description: 'End date YYYY-MM-DD' },
                    limit: { type: 'integer', description: 'Number of brands (default 10)', default: 10 },
                },
                required: ['startDate', 'endDate'],
            },
        };
    }

    buildParams(params) {
        return [params.startDate, params.endDate, params.limit || 10];
    }

    formatResult(data) {
        if (!data.rows || data.rows.length === 0) {
            return { summary: 'Tidak ada data merk untuk periode ini.' };
        }

        let md = `## 🏆 Top Brands Performance\n`;
        md += `Periode: ${data.params.startDate} s/d ${data.params.endDate}\n\n`;

        md += formatTable(data.rows, {
            columns: [
                { key: 'brand_name', label: 'Merk', align: 'left' },
                { key: 'amount', label: 'Total Penjualan', align: 'right', format: 'rupiah' },
                { key: 'count', label: 'Transaksi', align: 'right', format: 'number' },
            ],
        });

        return {
            summary: md,
            data: data.rows
        };
    }
}

export default {
    SalesTool,
    BrandSalesTool,
};
