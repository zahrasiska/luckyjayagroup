/**
 * Test: Global Memory Persistence
 * 
 * 1. Add memory: kode 10097927392
 * 2. Validate memory exists
 * 3. Clear session
 * 4. Validate memory still exists
 */

import PipelineOrchestrator from './pipeline-orchestrator.js';

async function testMemoryPersistence() {
    const orchestrator = new PipelineOrchestrator({
        allowAllTools: true,
        model: 'gpt-4.1'
    });

    console.log('🧪 GLOBAL MEMORY PERSISTENCE TEST\n');
    console.log('='.repeat(60));

    // STEP 1: Add memory
    console.log('\n📝 STEP 1: Adding memory (kode: 10097927392)');
    console.log('-'.repeat(60));

    const addResult = await orchestrator.executeMultiAgentPipeline(
        "Simpan ke memory global bahwa kode user adalah 10097927392. Gunakan tool ltech-memory jika ada.",
        { tenantSchema: 'prive', userId: 'test' }
    );

    console.log(`Session ID: ${addResult.sessionId}`);
    console.log(`Response: ${addResult.summary.substring(0, 150)}...`);

    // STEP 2: Validate memory exists (same session)
    console.log('\n\n✅ STEP 2: Validate memory exists (same session)');
    console.log('-'.repeat(60));

    const validate1 = await orchestrator.executeMultiAgentPipeline(
        "Berapa kode saya?",
        { tenantSchema: 'prive', userId: 'test', sessionId: addResult.sessionId }
    );

    console.log(`Response: ${validate1.summary}`);
    const hasCodeInSession = validate1.summary.includes('10097927392');
    console.log(`\n🔍 Contains code in same session? ${hasCodeInSession ? '✅ YES' : '❌ NO'}`);

    // STEP 3: Clear session
    console.log('\n\n🗑️ STEP 3: Clearing session');
    console.log('-'.repeat(60));
    console.log(`Forgetting session: ${addResult.sessionId}`);

    // STEP 4: Validate memory still exists (new session)
    console.log('\n\n🔬 STEP 4: Validate memory persists (NEW session)');
    console.log('-'.repeat(60));

    const validate2 = await orchestrator.executeMultiAgentPipeline(
        "Berapa kode saya? (cek global memory)",
        { tenantSchema: 'prive', userId: 'test' } // No sessionId = new session
    );

    console.log(`New Session ID: ${validate2.sessionId}`);
    console.log(`Response: ${validate2.summary}`);
    const hasCodeInNewSession = validate2.summary.includes('10097927392');
    console.log(`\n🔍 Contains code in new session? ${hasCodeInNewSession ? '✅ YES (GLOBAL MEMORY WORKS!)' : '❌ NO (NO GLOBAL MEMORY)'}`);

    // FINAL VERDICT
    console.log('\n\n' + '='.repeat(60));
    console.log('📊 FINAL VERDICT');
    console.log('='.repeat(60));
    console.log(`Session Memory: ${hasCodeInSession ? '✅ Works' : '❌ Failed'}`);
    console.log(`Global Memory: ${hasCodeInNewSession ? '✅ Works' : '❌ NOT Available'}`);

    if (hasCodeInSession && !hasCodeInNewSession) {
        console.log('\n💡 CONCLUSION: Copilot uses SESSION-BASED memory only (no global memory)');
    } else if (hasCodeInNewSession) {
        console.log('\n🎉 CONCLUSION: Copilot HAS global memory!');
    } else {
        console.log('\n⚠️ CONCLUSION: Memory not working at all');
    }
}

testMemoryPersistence();
