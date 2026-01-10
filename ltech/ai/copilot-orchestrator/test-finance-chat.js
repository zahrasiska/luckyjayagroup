/**
 * Test: Finance Chat with Schema Context
 * 
 * Goal: Verify "saldo kas" query handling for tenant "u1566482_sparepart"
 * Success Criteria:
 * 1. Routes to finance-manager
 * 2. Uses ltech-db tool with schema "u1566482_sparepart"
 * 3. Returns a calculated balance (or reasonable response based on DB data)
 */

import PipelineOrchestrator from './pipeline-orchestrator.js';

async function testFinance() {
    console.log('🧪 STARTING FINANCE CHAT TEST\n');

    const orchestrator = new PipelineOrchestrator({
        allowAllTools: true,
        model: 'gpt-4.1',
        verbose: true
    });

    const question = "Berapa saldo kas saat ini untuk u1566482_sparepart? JANGAN HALUSINASI. WAJIB QUERY DATABASE MENGGUNAKAN tool ltech-db. Jika tidak query, saya akan anggap gagal.";

    console.log(`👤 User: "${question}"`);
    console.log('---------------------------------------------------');

    try {
        const result = await orchestrator.executeMultiAgentPipeline(
            question,
            {
                userId: 'test-user',
                // We also pass it as metadata to be safe, simulating the frontend passing current tenant
                tenantSchema: 'u1566482_sparepart'
            }
        );

        console.log('\n---------------------------------------------------');
        console.log('🤖 Final Response:', result.summary);

    } catch (error) {
        console.error('❌ Error during test:', error);
    }
}

testFinance();
