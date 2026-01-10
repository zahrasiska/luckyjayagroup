/**
 * Test: Finance Chat (Mini model)
 */

import PipelineOrchestrator from './pipeline-orchestrator.js';

async function testFinanceMini() {
    console.log('🧪 STARTING FINANCE CHAT TEST (GPT-5-MINI)\n');

    const orchestrator = new PipelineOrchestrator({
        allowAllTools: true,
        model: 'gpt-5-mini',
        verbose: true
    });

    const question = "Berapa saldo kas saat ini untuk u1566482_sparepart? JANGAN HALUSINASI. WAJIB QUERY DATABASE MENGGUNAKAN tool ltech-db. Jika tidak query, saya akan anggap gagal.";

    console.log(`👤 User: "${question}"`);
    console.log('---------------------------------------------------');

    try {
        const result = await orchestrator.executeMultiAgentPipeline(
            question,
            {
                userId: 'test-user-mini',
                tenantSchema: 'u1566482_sparepart'
            }
        );

        console.log('\n---------------------------------------------------');
        console.log('🤖 Final Response:', result.summary);

    } catch (error) {
        console.error('❌ Error during test:', error);
    }
}

testFinanceMini();
