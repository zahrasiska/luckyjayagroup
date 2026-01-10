/**
 * Debug: Finance Formula Check (Dynamic Session)
 * 
 * Scenario:
 * 1. Ask for cash balance (u1566482_sparepart) -> Let Copilot CREATE session
 * 2. Capture Session ID
 * 3. Ask for the EXACT SQL used -> Reuse Session ID
 */

import PipelineOrchestrator from './pipeline-orchestrator.js';

async function debugFormula() {
    console.log('🧪 STARTING FINANCE FORMULA DEBUG (Dynamic Session)\n');

    const orchestrator = new PipelineOrchestrator({
        allowAllTools: true,
        model: 'gpt-4.1',
        verbose: true
    });

    const tenant = 'u1566482_sparepart';

    // TURN 1: Get Balance
    console.log('\n--- TURN 1: Asking for Balance ---');
    // Result object schema: { summary, sessionId, ... }
    const result1 = await orchestrator.executeMultiAgentPipeline(
        `Berapa saldo kas saat ini untuk ${tenant}?`,
        {
            userId: 'debug-user',
            tenantSchema: tenant
            // NO sessionId passed here, so fresh session is created
        }
    );
    console.log('🤖 Response 1:', result1.summary);

    // Capture the session ID created by the pipeline
    const producedSessionId = result1.sessionId;
    console.log(`\n📋 Captured Session ID: ${producedSessionId}`);

    if (!producedSessionId) {
        console.error('❌ Failed to capture Session ID!');
        // We cannot continue effectively without session context, but we can try generic ask
        return;
    }

    // TURN 2: Get SQL
    console.log('\n--- TURN 2: Asking for SQL ---');
    const result2 = await orchestrator.executeMultiAgentPipeline(
        "Tampilkan SQL query yang KAU gunakan barusan untuk menghitung angka tersebut. Tampilkan verbatim dalam block code.",
        {
            userId: 'debug-user',
            tenantSchema: tenant,
            sessionId: producedSessionId // Reuse captured ID
        }
    );
    console.log('🤖 Response 2:', result2.summary);
}

debugFormula();
