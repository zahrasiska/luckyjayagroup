/**
 * Inventory Tool
 * 
 * Fetches inventory data and analysis from the ltech-backend API.
 * Endpoints: 
 * - /api/inventory/barang (list/search)
 * - /api/inventory/barang/detail (item details)
 * - /api/analisa/procurement-ai (procurement advice)
 * - /api/analisa/umur-stok (stock aging)
 * - /api/analisa/trendpenjualan/trend (demand trends)
 */

import apiClient from '../utils/api-client.js';

class InventoryTool {
    constructor() {
        this.name = "inventory-tool";
        this.apiClient = apiClient;
    }

    /**
     * Get tool schema for AI (metadata)
     */
    getSchema() {
        return {
            name: this.name,
            description: "Tools for managing and analyzing inventory, including searching items, viewing details, and procurement advice.",
            inputSchema: {
                type: "object",
                properties: {
                    type: {
                        type: "string",
                        enum: ["search", "detail", "procurement", "aging", "trend", "lookup"],
                        description: "Type of inventory operation"
                    },
                    masterType: {
                        type: "string",
                        enum: ["merk", "kategori", "golongan", "jenis", "lokasi", "satuan"],
                        description: "Type of master data to lookup"
                    },
                    schema: {
                        type: "string",
                        description: "Tenant schema name"
                    },
                    id: {
                        type: "integer",
                        description: "Item ID (required for 'detail')"
                    },
                    search: {
                        type: "string",
                        description: "Search query for items (nama, kode, merk)"
                    },
                    idlokasi: {
                        type: "integer",
                        description: "Filter by location ID"
                    },
                    idkategori: {
                        type: "integer",
                        description: "Filter by category ID"
                    },
                    idmerk: {
                        type: "integer",
                        description: "Filter by brand/merk ID"
                    },
                    idgol: {
                        type: "integer",
                        description: "Filter by group/golongan ID"
                    },
                    idjenis: {
                        type: "integer",
                        description: "Filter by type/jenis ID"
                    },
                    rak: {
                        type: "string",
                        description: "Filter by rack name"
                    },
                    fields: {
                        type: "string",
                        description: "Comma-separated list of fields to fetch (e.g., 'id,nama,stok,rak'). Required for 'search' and 'detail'."
                    },
                    limit: {
                        type: "integer",
                        description: "Limit results (for 'search')",
                        default: 10
                    }
                },
                required: ["type", "schema"]
            }
        };
    }

    /**
     * Execute inventory operation
     */
    async execute(params) {
        const { type, schema, id, search, limit, fields } = params;

        try {
            console.log(`📡 InventoryTool: Executing ${type} for ${schema}${search ? ` (search: "${search}")` : ''}${fields ? ` (fields: ${fields})` : ''}`);

            let endpoint = "";
            let queryParams = {};

            switch (type) {
                case "search":
                    endpoint = "/inventory/barang";
                    queryParams = {
                        search: search || "",
                        limit: limit || 10,
                        fields: fields || "id,kode,nama,merk,kategori,golongan,stok,satuan,rak",
                        idlokasi: params.idlokasi,
                        idkategori: params.idkategori,
                        idmerk: params.idmerk,
                        idgol: params.idgol,
                        idjenis: params.idjenis,
                        rak: params.rak
                    };
                    break;
                case "lookup":
                    // masterType: merk, kategori, golongan, jenis, lokasi
                    const masterType = params.masterType;
                    if (!masterType) throw new Error("masterType is required for 'lookup' operation");
                    endpoint = `/inventory/${masterType}`;
                    queryParams = {
                        search: search || "",
                        limit: limit || 10
                    };
                    break;
                case "detail":
                    if (!id) throw new Error("ID is required for 'detail' operation");
                    endpoint = "/inventory/barang/detail";
                    queryParams = {
                        id: id,
                        fields: fields || "id,kode,barcode,nama,merk,kategori,golongan,stok,satuan,rak,beli,jual1,liststok,listpeletakan"
                    };
                    break;
                case "procurement":
                    endpoint = "/analisa/procurement-ai";
                    break;
                case "aging":
                    endpoint = "/analisa/umur-stok";
                    if (search) queryParams.search = search;
                    break;
                case "trend":
                    endpoint = "/analisa/trendpenjualan/trend";
                    if (search) queryParams.nama = search;
                    break;
                default:
                    throw new Error(`Unknown operation type: ${type}`);
            }

            const response = await this.apiClient.get(endpoint, schema, queryParams);

            return {
                success: true,
                type: type,
                data: response.data || response,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error(`❌ InventoryTool error [${type}]:`, error.message);
            throw new Error(`Failed to perform inventory ${type}: ${error.message}`);
        }
    }
}

export { InventoryTool };
