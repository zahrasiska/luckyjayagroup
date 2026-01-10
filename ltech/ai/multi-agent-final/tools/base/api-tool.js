/**
 * ERP API Tool
 * Interface to call standard REST endpoints from the LTECH ERP Backend
 */

import { BaseTool } from '../base-tool.js';
import axios from 'axios';

export class ERPAPITool extends BaseTool {
    constructor() {
        super('erp-api');
        this.baseUrl = process.env.ERP_API_URL || 'http://localhost:8082/api';
    }

    getSchema() {
        return {
            name: 'call-backend-api',
            description: 'Execute a REST API call to the LTECH ERP Backend. Use this for standard operations (Master Data, Transactions, Setup) before using direct database queries.',
            parameters: {
                type: 'object',
                properties: {
                    endpoint: {
                        type: 'string',
                        description: 'The endpoint path starting with / (e.g., /transaksi/detail, /brg/list, /kontak/search)',
                    },
                    method: {
                        type: 'string',
                        enum: ['GET', 'POST'],
                        default: 'GET',
                    },
                    params: {
                        type: 'object',
                        description: 'Query parameters or POST body data',
                    },
                    reason: {
                        type: 'string',
                        description: 'Why are you calling this specific API?',
                    }
                },
                required: ['endpoint', 'reason'],
            },
        };
    }

    async execute(params, context) {
        const { endpoint, method = 'GET', params: apiParams = {} } = params;
        const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

        this.log.info('Calling ERP API', { url, method, reason: params.reason });

        try {
            // In a real production system, we would pass the user's PASETO token here
            // For now, we use the internal AI_SPECIAL_TOKEN if available
            const headers = {
                'X-AI-Token': process.env.AI_SPECIAL_TOKEN || 'ltech_ai_magic_token_2026_secure',
                'X-Tenant-Schema': context?.tenant?.schema || 'public',
            };

            const response = await axios({
                method,
                url,
                [method === 'GET' ? 'params' : 'data']: apiParams,
                headers,
                timeout: 10000,
            });

            return {
                status: response.status,
                data: response.data,
                url: url
            };
        } catch (error) {
            this.log.error('API Call failed', {
                url,
                error: error.response?.data || error.message
            });
            return {
                success: false,
                error: error.response?.data?.message || error.message,
                status: error.response?.status
            };
        }
    }

    formatResult(result) {
        if (result.success === false) {
            return { summary: `Gagal memanggil API: ${result.error}` };
        }

        return {
            summary: `API Response (${result.status}): Berhasil mengambil data dari ${result.url}`,
            data: result.data
        };
    }
}
