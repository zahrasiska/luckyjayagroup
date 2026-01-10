/**
 * LLM Provider Configuration
 * HTTP-based LLM client configuration (no CLI!)
 */

import dotenv from 'dotenv';

dotenv.config();

/**
 * LLM Provider configurations
 */
export const LLM_PROVIDERS = {
    qwen: {
        name: 'Qwen (Tongyi)',
        baseUrl: process.env.QWEN_API_URL || 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
        apiKey: process.env.QWEN_API_KEY,
        models: {
            fast: process.env.QWEN_MODEL_ROUTER || 'qwen-turbo',
            standard: process.env.QWEN_MODEL_SPECIALIST || 'qwen-plus',
            advanced: 'qwen-max',
        },
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.QWEN_API_KEY}`,
        },
        formatRequest: (messages, model) => ({
            model,
            input: {
                messages: messages.map(m => ({
                    role: m.role,
                    content: m.content,
                })),
            },
            parameters: {
                temperature: 0.7,
                max_tokens: 2000,
                result_format: 'message',
            },
        }),
        parseResponse: (response) => {
            return response.output?.choices?.[0]?.message?.content ||
                response.output?.text ||
                '';
        },
    },

    gemini: {
        name: 'Gemini',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
        apiKey: process.env.GEMINI_API_KEY,
        models: {
            fast: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
            standard: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
            advanced: 'gemini-1.5-pro',
        },
        formatRequest: (messages, model) => ({
            contents: messages.map(m => ({
                role: m.role === 'assistant' ? 'model' : m.role,
                parts: [{ text: m.content }],
            })),
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2000,
            },
        }),
        parseResponse: (response) => {
            return response.candidates?.[0]?.content?.parts?.[0]?.text || '';
        },
        getEndpoint: (model) => `/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    },

    'qwen-cli': {
        name: 'Qwen CLI (Terminal Mode)',
        type: 'cli',
        binary: 'qwen',
        formatCommand: (prompt, options = {}) => {
            let cmd = `qwen chat --output-format json --model ${options.model || 'qwen-plus'}`;
            if (options.sessionId && options.sessionId !== 'new') {
                cmd += ` --resume ${options.sessionId}`;
            }
            return cmd;
        }
    },

    'gemini-cli': {
        name: 'Gemini CLI (Terminal Mode)',
        type: 'cli',
        binary: 'gemini',
        formatCommand: (prompt, options = {}) => {
            let cmd = `gemini chat --output-format json --model ${options.model || 'gemini-1.5-flash'}`;
            if (options.sessionId && options.sessionId !== 'new') {
                cmd += ` --resume ${options.sessionId}`;
            }
            return cmd;
        }
    }
};

/**
 * Default LLM settings
 */
export const LLM_CONFIG = {
    defaultProvider: 'gemini',  // For fast routing
    specialistProvider: 'qwen-cli', // For deep investigation
    fallbackProvider: 'qwen',
    // Secondary

    // Retry configuration
    maxRetries: 3,
    retryDelayMs: 1000,

    // Timeout
    timeoutMs: 30000,

    // Use case to model mapping
    modelMapping: {
        router: 'fast',        // Quick intent detection
        specialist: 'standard', // Main analysis
        summarizer: 'fast',     // Response formatting
    },
};

/**
 * Get provider configuration
 * @param {string} providerName - Provider name
 * @returns {Object} Provider config
 */
export function getProvider(providerName) {
    return LLM_PROVIDERS[providerName] || LLM_PROVIDERS[LLM_CONFIG.defaultProvider];
}

/**
 * Get model for use case
 * @param {string} providerName - Provider name
 * @param {string} useCase - Use case (router, specialist, summarizer)
 * @returns {string} Model name
 */
export function getModel(providerName, useCase) {
    const provider = getProvider(providerName);
    const modelType = LLM_CONFIG.modelMapping[useCase] || 'standard';
    return provider.models[modelType];
}

/**
 * Check if provider is available (has API key)
 * @param {string} providerName - Provider name
 * @returns {boolean}
 */
export function isProviderAvailable(providerName) {
    const provider = LLM_PROVIDERS[providerName];
    return provider && !!provider.apiKey;
}

export default {
    LLM_PROVIDERS,
    LLM_CONFIG,
    getProvider,
    getModel,
    isProviderAvailable,
};
