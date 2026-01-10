/**
 * API Client for Multi-Agent Integration
 * 
 * Handles communication with the ltech-backend REST API
 * using AI bypass tokens and schema context.
 */

const axios = require("axios");

class APIClient {
    constructor() {
        this.baseUrl = process.env.BACKEND_API_URL || "http://localhost:8080";
        this.aiToken = process.env.AI_SPECIAL_TOKEN;

        if (!this.aiToken) {
            console.warn("⚠️ AI_SPECIAL_TOKEN not found in environment. API calls may fail.");
        }
    }

    /**
     * Create axios instance with proper headers
     */
    getClient(tenantSchema) {
        return axios.create({
            baseURL: this.baseUrl,
            headers: {
                "Authorization": `Bearer ${this.aiToken}`,
                "X-Schema-Context": tenantSchema,
                "Content-Type": "application/json"
            },
            timeout: 10000 // 10s timeout
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

module.exports = new APIClient();
