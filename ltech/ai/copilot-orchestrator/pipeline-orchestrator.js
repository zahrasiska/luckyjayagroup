/**
 * Multi-Agent Pipeline Orchestrator
 * 
 * Coordinates Router → Specialist → Summarizer flow using Copilot CLI
 */

import CopilotWrapper from './copilot-wrapper.js';

class PipelineOrchestrator {
    constructor(options = {}) {
        this.copilot = new CopilotWrapper(options);
    }

    /**
     * Execute full multi-agent pipeline
     */
    async executeMultiAgentPipeline(userQuestion, session = {}) {
        const sessionId = session.sessionId || null;
        console.log(`\n🚀 Starting multi-agent pipeline for: "${userQuestion}"`);
        console.log(`📋 Session:`, sessionId ? `${sessionId}` : 'New Session');

        try {
            // STEP 1: Route question to appropriate agent
            console.log('\n📍 Step 1: Routing...');
            const routing = await this.routeQuestion(userQuestion, session, sessionId);
            console.log(`   ✅ Selected agent: ${routing.selectedAgent}`);
            console.log(`   📊 Confidence: ${routing.confidence}`);

            // STEP 2: Execute specialist agent
            // Specialist continues the session created by router
            console.log(`\n🔬 Step 2: ${routing.selectedAgent} processing...`);
            const analysis = await this.executeSpecialist(
                routing.selectedAgent,
                userQuestion,
                routing,
                session,
                routing.sessionId
            );
            console.log(`   ✅ Analysis complete`);

            // STEP 3: Summarize to business language
            // Summarizer continues the session updated by specialist
            console.log('\n📝 Step 3: Summarizing...');
            const summary = await this.summarize(
                analysis.output,
                session,
                analysis.sessionId
            );
            console.log(`   ✅ Summary generated`);

            // Return final result
            return {
                routing,
                analysis: analysis.output,
                summary: summary.visual,
                voiceSummary: summary.voice,
                sessionId: summary.sessionId,
                selectedAgent: routing.selectedAgent,
            };

        } catch (error) {
            console.error('❌ Pipeline error:', error.message);
            throw error;
        }
    }

    /**
     * Step 1: Route question using router agent
     */
    async routeQuestion(userQuestion, session, sessionId) {
        const routerPrompt = this.buildRouterPrompt(userQuestion, session);

        const result = await this.copilot.startSession('router', routerPrompt, {
            schema: session.tenantSchema,
            sessionId: sessionId
        });

        // Parse JSON routing decision
        const routing = this.copilot.parseJSON(result.output);

        // Add actual session ID from Copilot (in case we didn't provide one)
        routing.sessionId = result.sessionId;

        return routing;
    }

    /**
     * Step 2: Execute specialist agent
     */
    async executeSpecialist(agentName, userQuestion, routing, session, sessionId) {
        const specialistPrompt = this.buildSpecialistPrompt(
            userQuestion,
            routing,
            session
        );

        const result = await this.copilot.continueSession(
            sessionId,
            agentName,
            specialistPrompt,
            { schema: session.tenantSchema }
        );

        return {
            output: result.output,
            sessionId: result.sessionId,
            agent: agentName,
        };
    }

    /**
     * Step 3: Summarize using summarizer agent
     */
    async summarize(specialistOutput, session, sessionId) {
        const summarizerPrompt = `Transform the following technical output into business-friendly Indonesian:

TECHNICAL OUTPUT:
${specialistOutput}

TENANT: ${session.tenantSchema}

Please provide BOTH [VISUAL] and [VOICE] formats as per your instructions.`;

        const result = await this.copilot.continueSession(
            sessionId,
            'summarizer',
            summarizerPrompt,
            { schema: session.tenantSchema }
        );

        // Parse dual-format output
        const parsed = this.copilot.parseDualFormat(result.output);

        return {
            visual: parsed.visual,
            voice: parsed.voice,
            sessionId: result.sessionId,
        };
    }

    /**
     * Build router prompt
     */
    buildRouterPrompt(userQuestion, session) {
        return `USER QUESTION:
${userQuestion}

USER CONTEXT:
- Tenant Schema: ${session.tenantSchema || 'u1566482_sparepart'}
- User Role: ${session.userRole || 'user'}

Analyze and route to appropriate specialist agent. Output JSON only.`;
    }

    /**
     * Build specialist prompt
     */
    buildSpecialistPrompt(userQuestion, routing, session) {
        return `TENANT: ${session.tenantSchema || 'u1566482_sparepart'}

ROUTING CONTEXT:
- Intent: ${routing.userIntent}
- Focus: ${routing.context?.focus || 'general'}

USER QUESTION:
${userQuestion}

CRITICAL RULES:
1. GUNAKAN TOOL 'ltech-db-query' untuk mengambil data aktual.
2. JANGAN bertanya izin. Langsung eksekusi query.
3. Gunakan Bahasa Indonesia formal.`;
    }
}

export default PipelineOrchestrator;
