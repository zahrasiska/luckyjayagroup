/**
 * Full Pipeline Performance Test with gpt-4.1
 * 
 * Compare speed improvement after model switch
 */

import PipelineOrchestrator from './pipeline-orchestrator.js';

async function testPipelineSpeed() {
    const orchestrator = new PipelineOrchestrator({
        allowAllTools: true,
        model: 'gpt-4.1'  // Explicitly use gpt-4.1
    });

    const sessionContext = {
        tenantSchema: 'u1566482_sparepart',
        userId: 'speedtest-user',
        userRole: 'CEO'
    };

    const question = "Berapa total kas saat ini untuk tenant u1566482_sparepart?";

    console.log('⚡ FULL PIPELINE SPEED TEST (gpt-4.1)');
    console.log('═'.repeat(60));
    console.log(`Model: ${orchestrator.copilot.model}`);
    console.log(`Question: ${question}`);
    console.log('═'.repeat(60));

    const overallStart = Date.now();

    try {
        const result = await orchestrator.executeMultiAgentPipeline(question, sessionContext);

        const overallEnd = Date.now();
        const totalTime = overallEnd - overallStart;

        console.log('\n' + '═'.repeat(60));
        console.log('📊 PERFORMANCE RESULTS');
        console.log('═'.repeat(60));
        console.log(`Total time: ${(totalTime / 1000).toFixed(1)}s`);
        console.log(`Session ID: ${result.sessionId}`);
        console.log(`Selected Agent: ${result.selectedAgent}`);
        console.log('\n📝 Summary:');
        console.log(result.summary.substring(0, 200) + '...');
        console.log('═'.repeat(60));

        // Compare with previous benchmark
        const previousTime = 45; // Previous estimate with gpt-5-mini (3 × 15s)
        const expectedTime = 29; // Expected with gpt-4.1 (3 × 9.6s)
        const speedup = ((previousTime - (totalTime / 1000)) / previousTime * 100).toFixed(1);

        console.log('\n📈 COMPARISON:');
        console.log(`Previous (gpt-5-mini): ~${previousTime}s (estimated)`);
        console.log(`Current (gpt-4.1): ${(totalTime / 1000).toFixed(1)}s (actual)`);
        console.log(`Expected (gpt-4.1): ~${expectedTime}s (estimated)`);
        console.log(`Speedup: ${speedup}% faster than gpt-5-mini`);
        console.log('═'.repeat(60));

        if (totalTime / 1000 < previousTime) {
            console.log('\n✅ SPEED IMPROVEMENT CONFIRMED!');
        } else {
            console.log('\n⚠️ Slower than expected, may need investigation');
        }

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        throw error;
    }
}

testPipelineSpeed();
