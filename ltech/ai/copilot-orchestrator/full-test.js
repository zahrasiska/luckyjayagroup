/**
 * Full Pipeline Test: Cold Start to Response
 * 
 * Verifies that the orchestrator can:
 * 1. Start a new session (Router)
 * 2. Capture the Session ID
 * 3. Resume the session with a Specialist (Finance Manager)
 * 4. Resume again with the Summarizer
 */

import PipelineOrchestrator from './pipeline-orchestrator.js';

async function runFullTest() {
    const orchestrator = new PipelineOrchestrator({
        allowAllTools: true,
        model: 'gpt-5-mini', // Using gpt-5-mini for speed
        verbose: true // Show stdout/stderr for debugging
    });

    const userQuestion = "Berapa total kas saat ini untuk tenant u1566482_sparepart?";
    const sessionContext = {
        tenantSchema: 'u1566482_sparepart',
        userId: 'test-user',
        userRole: 'CEO'
    };

    console.log('🚀 --- STARTING FULL PIPELINE TEST ---');
    try {
        const result = await orchestrator.executeMultiAgentPipeline(userQuestion, sessionContext);

        console.log('\n✅ --- FINAL RESULT ---');
        console.log('Session ID:', result.sessionId);
        console.log('Selected Agent:', result.selectedAgent);
        console.log('\n[VISUAL]:\n', result.summary);
        console.log('\n[VOICE]:\n', result.voiceSummary);

    } catch (error) {
        console.error('\n❌ --- TEST FAILED ---');
        console.error(error.message);
    }
}

runFullTest();
