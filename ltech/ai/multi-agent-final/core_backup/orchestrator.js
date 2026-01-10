/**
 * Pipeline Orchestrator
 * Coordinates multi-agent pipeline: Router → Specialist → Response
 */

import { RouterAgent } from '../agents/router/index.js';
import { FinanceManagerAgent } from '../agents/finance-manager/index.js';
import { SalesManagerAgent } from '../agents/sales-manager/index.js';
import { InventoryManagerAgent } from '../agents/inventory-manager/index.js';
import { GeneralAssistantAgent } from '../agents/general-assistant/index.js';
import { MemoryManagerAgent } from '../agents/memory-manager/index.js';
import { SummarizerAgent } from '../agents/summarizer/index.js';
import logger from '../utils/logger.js';
import memoryManager from './memory-manager.js';

const log = logger.agent.child({ component: 'orchestrator' });

// Initialize memory once
let memoryInitialized = false;
async function ensureMemory() {
    if (!memoryInitialized) {
        await memoryManager.init();
        memoryInitialized = true;
    }
}

/**
 * Agent registry
 */
const AGENTS = {
    'router': () => new RouterAgent(),
    'finance-manager': () => new FinanceManagerAgent(),
    'sales-manager': () => new SalesManagerAgent(),
    'inventory-manager': () => new InventoryManagerAgent(),
    'general-assistant': () => new GeneralAssistantAgent(),
    'memory-manager': () => new MemoryManagerAgent(),
    'summarizer': () => new SummarizerAgent(),
};

/**
 * Get or create agent instance
 */
const agentInstances = new Map();

function getAgent(name) {
    if (!agentInstances.has(name)) {
        const factory = AGENTS[name];
        if (!factory) {
            throw new Error(`Unknown agent: ${name}`);
        }
        agentInstances.set(name, factory());
    }
    return agentInstances.get(name);
}

/**
 * Process a user message through the multi-agent pipeline
 * 
 * Pipeline:
 * 1. Router: Detect intent, select agent
 * 2. Specialist: Execute tools, generate response
 * 3. (Optional) Summarizer: Format for user
 * 
 * @param {string} message - User message
 * @param {Object} context - Request context (tenant, user, roles)
 * @param {Object} options - { onProgress: (event) => {} }
 * @returns {Promise<Object>} { success, response, metadata }
 */
export async function processMessage(message, context, options = {}) {
    await ensureMemory();

    const startTime = Date.now();
    const { onProgress } = options;

    const sessionId = options.sessionId || memoryManager.getSessionId(context);
    const memoryContext = await memoryManager.getFullMemoryContext(sessionId);

    const enrichedContext = {
        ...context,
        sessionId,
        memory: memoryContext,
    };

    try {
        // --- STEP 1: Routing & Analysis ---
        if (onProgress) onProgress({ step: 'routing', message: 'Routing & Analysis...' });

        const router = getAgent('router');
        const routeResult = await router.process(message, enrichedContext);

        if (!routeResult.success) throw new Error('Routing failed');

        // --- STEP 2: Specialist Thinking ---
        if (onProgress) onProgress({
            step: 'thinking',
            message: `Specialist Thinking (${routeResult.targetAgent})...`,
            agent: routeResult.targetAgent
        });

        const specialist = getAgent(routeResult.targetAgent);
        const specialistContext = {
            ...enrichedContext,
            routing: routeResult,
            qwenSessionId: routeResult.qwenSessionId
        };

        const thinkingResult = await specialist.process(message, specialistContext);

        // --- STEP 3: Final Summarizing ---
        if (onProgress) onProgress({ step: 'summarizing', message: 'Final Summarizing...' });

        const finalSessionId = thinkingResult.qwenSessionId || routeResult.qwenSessionId;
        const summarizer = getAgent('summarizer');
        const summaryResult = await summarizer.summarize(thinkingResult.response, enrichedContext, finalSessionId);

        const duration = Date.now() - startTime;

        return {
            success: true,
            response: summaryResult.summary,
            voiceResponse: summaryResult.voiceSummary,
            metadata: {
                duration,
                agent: routeResult.targetAgent,
                confidence: routeResult.confidence,
                qwenSessionId: finalSessionId
            },
        };

    } catch (error) {
        log.error('Pipeline error', { error: error.message });
        return {
            success: false,
            response: `Maaf, terjadi kesalahan: ${error.message}`,
            metadata: { duration: Date.now() - startTime, error: error.message },
        };
    }
}

export default {
    processMessage,
};
