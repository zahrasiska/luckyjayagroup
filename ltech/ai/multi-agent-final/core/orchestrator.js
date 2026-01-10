/**
 * Multi-Agent Pipeline Orchestrator
 * Adapted from CommonJS to ES Modules
 */

import { SessionManager } from './session-manager.js';
import { promises as fs } from 'fs';
import path from 'path';
import { RouterAgent } from '../agents/router.js';
import { SummarizerAgent } from '../agents/summarizer/index.js';
import { InputRefinerAgent } from '../agents/input-refiner.js';
import { SalesManagerAgent } from '../agents/sales-manager.js';
import { FinanceManagerAgent } from '../agents/finance-manager.js';
import { InventoryManagerAgent } from '../agents/inventory-manager.js';
import { MemoryManagerAgent } from '../agents/memory-manager.js';
import { GeneralAssistantAgent } from '../agents/general-assistant.js';

export class MultiAgentPipeline {
    constructor() {
        this.sessionManager = new SessionManager();
        this.inputRefiner = new InputRefinerAgent();
        this.router = new RouterAgent();
        this.summarizer = new SummarizerAgent();

        // Register specialist agents
        this.specialists = {
            'sales-manager': new SalesManagerAgent(),
            'finance-manager': new FinanceManagerAgent(),
            'inventory-manager': new InventoryManagerAgent(),
            'memory-manager': new MemoryManagerAgent(),
            'general-assistant': new GeneralAssistantAgent(),
        };
    }

    /**
     * Initialize pipeline (connect to Redis)
     */
    async initialize() {
        await this.sessionManager.connect();
        console.log('✅ Multi-Agent Pipeline initialized');
    }

    /**
     * Process user question through multi-agent pipeline
     */
    async processQuestion(userQuestion, options = {}) {
        const {
            userId = 'default-user',
            userRole = 'user',
            tenantSchema,
            sessionId = null,
            onProgress = null,
        } = options;

        if (!tenantSchema) {
            const errorMsg = '❌ CRITICAL ERROR: tenantSchema is required but not provided!';
            console.error(errorMsg);
            console.error('Options received:', options);
            return {
                success: false,
                error: errorMsg,
                sessionId: null,
            };
        }

        const resolvedQuestion = await this.resolveFileReferences(userQuestion);

        const emitProgress = (step, data = {}) => {
            if (onProgress && typeof onProgress === 'function') {
                onProgress({ step, ...data });
            }
        };

        console.log('\n' + '='.repeat(70));
        console.log('🤖 Multi-Agent Pipeline Processing');
        console.log('='.repeat(70));
        console.log(`Question: "${resolvedQuestion.substring(0, 500)}${resolvedQuestion.length > 500 ? '...' : ''}"`);
        console.log(`User ID: ${userId}`);
        console.log(`User Role: ${userRole}`);
        console.log(`Tenant Schema: ${tenantSchema}`);
        console.log(`Session ID: ${sessionId || 'NEW'}`);
        console.log('');

        try {
            let qwenSessionId = sessionId;
            let redisSession;

            if (!sessionId) {
                redisSession = {
                    userId,
                    userRole,
                    tenantSchema,
                    context: {},
                    history: [],
                };
            } else {
                redisSession = await this.sessionManager.getSession(sessionId);

                if (!redisSession) {
                    console.warn(`⚠️ Session ${sessionId} not found in Redis. Auto-recovering...`);
                    redisSession = {
                        userId,
                        userRole,
                        tenantSchema,
                        context: {},
                        history: [],
                    };
                    await this.sessionManager.createOrResumeSession(
                        sessionId,
                        userId,
                        userRole,
                        tenantSchema
                    );
                }
            }

            // Step 0: Input Refinement (Typo & Grammar Correction)
            console.log('🔧 Step 0: Input Refinement...');
            emitProgress('refining', { detail: 'Memperbaiki typo & grammar...' });

            const refinedQuestion = await this.inputRefiner.refine(resolvedQuestion);

            console.log(`   → Original: "${resolvedQuestion.substring(0, 100)}"`);
            console.log(`   → Refined: "${refinedQuestion.substring(0, 100)}"`);

            // Step 1: Routing
            console.log('\n🧭 Step 1: Routing...');
            emitProgress('routing', { detail: 'Routing pertanyaan...' });

            const routing = await this.router.route(refinedQuestion, {
                userId,
                userRole,
                tenantSchema,
                sessionId: qwenSessionId,
                redisSession,
            });

            console.log('   → Routing Result:', {
                selectedAgent: routing.selectedAgent,
                confidence: routing.confidence,
                intent: routing.userIntent,
            });

            qwenSessionId = routing.qwenSessionId;

            if (redisSession) {
                if (redisSession.qwenSessionId !== qwenSessionId) {
                    console.log(`🔗 Linking Frontend Session ${sessionId} -> Qwen Session ${qwenSessionId}`);
                    redisSession.qwenSessionId = qwenSessionId;

                    await this.sessionManager.updateContext(sessionId, 'qwenSessionId', qwenSessionId);
                    await this.sessionManager.createOrResumeSession(
                        sessionId,
                        userId,
                        userRole,
                        tenantSchema,
                        redisSession
                    );
                }
            } else if (!sessionId) {
                await this.sessionManager.createOrResumeSession(
                    qwenSessionId,
                    userId,
                    userRole,
                    tenantSchema
                );
            }

            await this.sessionManager.updateContext(sessionId || qwenSessionId, 'routing', routing);
            await this.sessionManager.addToHistory(sessionId || qwenSessionId, 'router', resolvedQuestion, routing);

            // Step 2: Specialist
            console.log('\n📊 Step 2: Specialist Processing...');
            emitProgress('specialist_start', {
                agent: routing.selectedAgent,
                detail: `Menghubungi ${routing.selectedAgent}...`,
            });

            const specialist = this.specialists[routing.selectedAgent];

            if (!specialist) {
                throw new Error(`Specialist ${routing.selectedAgent} not found`);
            }

            const specialistResult = await specialist.process(
                resolvedQuestion,
                routing,
                redisSession,
                qwenSessionId
            );

            // Update qwenSessionId dari specialist result (untuk conversation continuity)
            if (specialistResult.qwenSessionId) {
                qwenSessionId = specialistResult.qwenSessionId;
                console.log(`🔗 Updated Qwen Session ID: ${qwenSessionId}`);
            }

            console.log(`   → Agent: ${specialist.name}`);
            console.log(`   → Output (Preview): ${specialistResult.output.substring(0, 500)}`);
            console.log(`   → Output length: ${specialistResult.output.length} chars`);

            await this.sessionManager.addToHistory(
                sessionId || qwenSessionId,
                routing.selectedAgent,
                { question: resolvedQuestion, routing },
                specialistResult.output
            );

            // Step 3: Summarizer
            console.log('\n✨ Step 3: Summarizing...');

            let summaryResult = { summary: '' };

            // Skip summarizer for:
            // 1. Conversational agents (already formatted)
            // 2. Structured data output (contains [[DATA]] tag)
            const isConversationalAgent = ['general-assistant', 'memory-manager'].includes(routing.selectedAgent);
            const hasStructuredData = specialistResult.output.includes('[[DATA]]');

            if (isConversationalAgent || hasStructuredData) {
                const reason = isConversationalAgent ? 'conversational agent' : 'structured data (table/list)';
                console.log(`   → Skipping summarizer for ${reason}`);
                summaryResult.summary = specialistResult.output;
                emitProgress('summarizing_complete', { detail: 'Respon siap.' });
            } else {
                emitProgress('summarizing_start', { detail: 'Menyusun ringkasan bisnis...' });

                summaryResult = await this.summarizer.summarize(
                    specialistResult.output,
                    redisSession,
                    qwenSessionId
                );

                console.log(`   → Summary length: ${summaryResult.summary.length} chars`);
                emitProgress('summarizing_complete', { detail: 'Analisis selesai.' });
            }

            await this.sessionManager.addToHistory(
                sessionId || qwenSessionId,
                'summarizer',
                specialistResult.output,
                summaryResult.summary
            );

            console.log('\n' + '='.repeat(70));
            console.log('✅ Pipeline Complete');
            console.log('='.repeat(70) + '\n');

            emitProgress('complete', { detail: 'Selesai.', success: true });

            return {
                success: true,
                sessionId: sessionId || qwenSessionId,
                routing,
                specialist: {
                    agent: routing.selectedAgent,
                    output: specialistResult.output,
                },
                summary: summaryResult.summary,
                voiceResponse: summaryResult.voiceResponse || summaryResult.summary,
                metadata: {
                    userRole,
                    tenantSchema,
                    agentUsed: routing.selectedAgent,
                    confidence: routing.confidence,
                },
            };
        } catch (error) {
            console.error('\n❌ Pipeline Error:', error.message);
            console.error('Stack:', error.stack);

            return {
                success: false,
                error: error.message,
                sessionId: sessionId || null,
            };
        }
    }

    async getSessionHistory(sessionId, limit = 10) {
        return await this.sessionManager.getUserFacingHistory(sessionId, limit);
    }

    async clearSession(sessionId) {
        return await this.sessionManager.deleteSession(sessionId);
    }

    async shutdown() {
        await this.sessionManager.disconnect();
        console.log('👋 Multi-Agent Pipeline shutdown');
    }

    async resolveFileReferences(text) {
        if (!text || typeof text !== 'string') return text;

        const fileRefRegex = /@\[([^\]]+)\]/g;
        let resolvedText = text;
        const matches = [...text.matchAll(fileRefRegex)];

        for (const match of matches) {
            const ref = match[0];
            let filePath = match[1];

            filePath = filePath.split(':')[0];

            const absolutePath = filePath.startsWith('/')
                ? filePath
                : path.join('/home/luckyjayagroup/ltech', filePath);

            try {
                const content = await fs.readFile(absolutePath, 'utf8');
                const extension = path.extname(absolutePath).slice(1);
                const replacement = `
File Content [${filePath}]:
\
${extension}\n${content}
\
`
                    ;

                resolvedText = resolvedText.replace(ref, replacement);
                console.log(`📄 Resolved file reference: ${filePath} (${content.length} chars)`);
            } catch (err) {
                console.warn(`⚠️ Failed to resolve file reference ${filePath}: ${err.message}`);
            }
        }

        return resolvedText;
    }
}

export default MultiAgentPipeline;