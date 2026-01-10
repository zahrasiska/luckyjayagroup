import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { getProvider, getModel, isProviderAvailable, LLM_CONFIG } from '../config/llm.js';
import logger from '../utils/logger.js';

const execAsync = promisify(exec);
const log = logger.llm;

/**
 * Chat completion with LLM
 * @param {Object[]} messages - Array of {role, content}
 * @param {Object} options - { provider, useCase, temperature, maxTokens }
 * @returns {Promise<string>} LLM response text
 */
export async function chat(messages, options = {}) {
    const providerName = options.provider ||
        (options.useCase === 'specialist' ? LLM_CONFIG.specialistProvider : LLM_CONFIG.defaultProvider);
    const useCase = options.useCase || 'specialist';

    // Check if provider available
    if (!isProviderAvailable(providerName)) {
        log.warn('Provider not available, using fallback', { providerName });
        return chat(messages, { ...options, provider: LLM_CONFIG.fallbackProvider });
    }

    const provider = getProvider(providerName);
    const model = getModel(providerName, useCase);

    if (provider.type === 'cli') {
        return runCLICommand(provider, messages, { ...options, model });
    }

    log.debug('LLM request', {
        provider: providerName,
        model,
        messageCount: messages.length,
    });

    // Retry loop
    let lastError;
    for (let attempt = 1; attempt <= LLM_CONFIG.maxRetries; attempt++) {
        try {
            const response = await makeRequest(provider, model, messages, options);

            log.debug('LLM response received', {
                provider: providerName,
                model,
                responseLength: response.length,
            });

            return response;

        } catch (error) {
            lastError = error;
            log.warn('LLM request failed', {
                provider: providerName,
                attempt,
                error: error.message,
            });

            // Wait before retry
            if (attempt < LLM_CONFIG.maxRetries) {
                await sleep(LLM_CONFIG.retryDelayMs * attempt);
            }
        }
    }

    // All retries failed, try fallback provider
    if (providerName !== LLM_CONFIG.fallbackProvider) {
        log.warn('Primary provider failed, trying fallback', { lastError: lastError.message });
        return chat(messages, { ...options, provider: LLM_CONFIG.fallbackProvider });
    }

    // All failed
    throw new Error(`LLM request failed after ${LLM_CONFIG.maxRetries} attempts: ${lastError.message}`);
}

/**
 * Make HTTP request to LLM provider
 */
async function makeRequest(provider, model, messages, options) {
    const requestBody = provider.formatRequest(messages, model);

    // Override temperature/maxTokens if provided
    if (options.temperature !== undefined) {
        requestBody.parameters = requestBody.parameters || {};
        requestBody.parameters.temperature = options.temperature;
    }

    let url = provider.baseUrl;
    if (provider.getEndpoint) {
        url = provider.baseUrl + provider.getEndpoint(model);
    }

    const headers = provider.headers || {
        'Content-Type': 'application/json',
    };

    const response = await axios.post(url, requestBody, {
        headers,
        timeout: LLM_CONFIG.timeoutMs,
    });

    return provider.parseResponse(response.data);
}

/**
 * Chat with system prompt and user message
 * @param {string} systemPrompt - System prompt
 * @param {string} userMessage - User message
 * @param {Object} options - Chat options
 * @returns {Promise<string>} Response
 */
export async function chatSimple(systemPrompt, userMessage, options = {}) {
    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
    ];
    return chat(messages, options);
}

/**
 * Chat with conversation history
 * @param {string} systemPrompt - System prompt
 * @param {Object[]} history - Previous messages [{role, content}]
 * @param {string} userMessage - New user message
 * @param {Object} options - Chat options
 * @returns {Promise<string>} Response
 */
export async function chatWithHistory(systemPrompt, history, userMessage, options = {}) {
    const messages = [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: userMessage },
    ];
    return chat(messages, options);
}

/**
 * Extract JSON from LLM response
 * @param {string} response - LLM response text
 * @returns {Object|null} Parsed JSON or null
 */
export function extractJSON(response) {
    try {
        // Try direct parse first
        return JSON.parse(response);
    } catch {
        // Try to find JSON block
        const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[1].trim());
            } catch {
                // Ignore
            }
        }

        // Try to find JSON object/array
        const objectMatch = response.match(/\{[\s\S]*\}/);
        if (objectMatch) {
            try {
                return JSON.parse(objectMatch[0]);
            } catch {
                // Ignore
            }
        }

        return null;
    }
}

/**
 * Sleep utility
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Run LLM via CLI (Terminal Mode)
 */
async function runCLICommand(provider, messages, options) {
    const prompt = messages.map(m => `[${m.role.toUpperCase()}]: ${m.content}`).join('\n\n');
    const tempFile = path.join(os.tmpdir(), `ai_cli_input_${Date.now()}.txt`);

    try {
        await fs.writeFile(tempFile, prompt, 'utf8');

        const env = {
            ...process.env,
            PGSCHEMA: options.tenantSchema ? `${options.tenantSchema},prive,public` : process.env.PGSCHEMA,
        };

        const command = provider.formatCommand(prompt, {
            ...options,
            sessionId: options.sessionId
        }) + ` < ${tempFile}`;

        log.info('Executing LLM CLI Command', { binary: provider.binary, sessionId: options.sessionId });

        const { stdout } = await execAsync(command, { env, timeout: 60000 });

        try {
            const events = JSON.parse(stdout);
            const resultEvent = events.find(e => e.type === 'result');

            if (resultEvent) {
                // Return result AND session_id for future use
                // Specialist agents will need to know their CLI session ID
                return resultEvent.result;
            }

            // Fallback for non-structured result
            return events.map(e => e.message?.content?.[0]?.text || '').join('');
        } catch (e) {
            return stdout;
        }

    } catch (error) {
        log.error('CLI LLM Failed', { error: error.message });
        throw error;
    } finally {
        try { await fs.unlink(tempFile); } catch (e) { }
    }
}

export default {
    chat,
    chatSimple,
    chatWithHistory,
    extractJSON,
};
