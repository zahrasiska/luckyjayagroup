/**
 * API Client for Multi-Agent Integration
 * 
 * Handles communication with the ltech-backend REST API
 * using AI bypass tokens and schema context.
 */

import axios from 'axios';

class APIClient {
    constructor() {
        // Don't cache in constructor to avoid issues with ESM hoisting in tests
    }

    /**
     * Create axios instance with proper headers
     */
    getClient(tenantSchema) {
        const baseUrl = process.env.BACKEND_API_URL || "https://erp.luckyjaya.tech/api";
        const aiToken = process.env.AI_SPECIAL_TOKEN;

        if (!aiToken) {
            console.warn("⚠️ AI_SPECIAL_TOKEN not found in environment. API calls may fail.");
        }

        return axios.create({
            baseURL: baseUrl,
            headers: {
                "Authorization": `Bearer ${aiToken}`,
                "X-Schema-Context": tenantSchema,
                "Content-Type": "application/json"
            },
            timeout: 10000, // 10s timeout
            proxy: false // Avoid transparent proxies
        });
    }

    /**
     * Generic GET request
     */
    async get(endpoint, tenantSchema, params = {}) {
        try {
            const client = this.getClient(tenantSchema);
            const response = await client.get(endpoint, { params });
            return response.data;
        } catch (error) {
            this.handleError(error, endpoint);
        }
    }

    /**
     * Generic POST request
     */
    async post(endpoint, tenantSchema, data = {}) {
        try {
            const client = this.getClient(tenantSchema);
            const response = await client.post(endpoint, data);
            return response.data;
        } catch (error) {
            this.handleError(error, endpoint);
        }
    }

    /**
     * Error handling
     */
    handleError(error, endpoint) {
        const status = error.response ? error.response.status : "NETWORK_ERROR";
        const message = error.response ? JSON.stringify(error.response.data) : error.message;
        console.error(`❌ API Error [${endpoint}]:`, status, message);
        throw new Error(`Backend API Error (${status}): ${message}`);
    }
}

export default new APIClient();
