/**
 * Price Configuration Tool
 * 
 * Fetches dynamic price field configuration from [tenant].harga table
 */

import apiClient from '../utils/api-client.js';

class PriceConfigTool {
    constructor() {
        this.name = "price-config-tool";
        this.apiClient = apiClient;
        this.cache = new Map(); // Cache per schema
    }

    /**
     * Get tool schema for AI (metadata)
     */
    getSchema() {
        return {
            name: this.name,
            description: "Fetch price field configuration (labels and visibility) from harga table",
            inputSchema: {
                type: "object",
                properties: {
                    schema: {
                        type: "string",
                        description: "Tenant schema name"
                    },
                    refresh: {
                        type: "boolean",
                        description: "Force refresh cache"
                    }
                },
                required: ["schema"]
            }
        };
    }

    /**
     * Execute the tool
     */
    async execute(params) {
        const { schema, refresh = false } = params;

        try {
            // Check cache
            if (!refresh && this.cache.has(schema)) {
                console.log(`💰 PriceConfigTool: Using cached config for ${schema}`);
                return this.cache.get(schema);
            }

            console.log(`💰 PriceConfigTool: Fetching price config for ${schema}`);

            const client = this.apiClient.getClient(schema);
            const response = await client.get('/inventory/harga', {
                params: {
                    limit: 100 // Get all price configs
                }
            });

            if (response.data.success && response.data.data) {
                const configs = response.data.data;

                // Build configuration map
                const priceConfig = {
                    fields: {},
                    publicFields: [],
                    labels: {},
                    labelToField: {} // Reverse mapping for AI understanding
                };

                configs.forEach(config => {
                    const fieldName = config.kode.toLowerCase(); // jual1, jual2, etc.

                    priceConfig.fields[fieldName] = {
                        kode: config.kode,
                        nama: config.nama,
                        publik: config.publik,
                        aktif: config.aktif
                    };

                    priceConfig.labels[fieldName] = config.nama;

                    // Reverse mapping: label → field
                    const labelLower = config.nama.toLowerCase();
                    priceConfig.labelToField[labelLower] = fieldName;

                    if (config.publik) {
                        priceConfig.publicFields.push(fieldName);
                    }
                });

                // Cache the result
                this.cache.set(schema, { success: true, data: priceConfig });

                console.log(`✅ PriceConfigTool: Loaded ${configs.length} price configs`);
                console.log(`   → Public fields: ${priceConfig.publicFields.join(', ')}`);

                return { success: true, data: priceConfig };
            }

            throw new Error("Invalid response from harga endpoint");
        } catch (error) {
            console.error(`❌ PriceConfigTool error:`, error.message);
            throw new Error(`Failed to fetch price configuration: ${error.message}`);
        }
    }

    /**
     * Clear cache for a schema
     */
    clearCache(schema) {
        if (schema) {
            this.cache.delete(schema);
        } else {
            this.cache.clear();
        }
    }
}

export { PriceConfigTool };
