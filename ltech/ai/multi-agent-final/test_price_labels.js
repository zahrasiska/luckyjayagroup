/**
 * Test Price Label Recognition
 */

import { MultiAgentPipeline } from './core/orchestrator.js';

async function test() {
    const pipeline = new MultiAgentPipeline();

    const options = {
        userId: 'test-user',
        userRole: 'user',
        tenantSchema: 'u1566482_sparepart',
        sessionId: 'test-session-price-labels'
    };

    const queries = [
        "tampilkan harga eceran barang merk fukuyama",
        "cari harga partai untuk ban motor",
        "list harga sales motor matic"
    ];

    for (const query of queries) {
        try {
            console.log(`\n${'='.repeat(70)}`);
            console.log(`📝 Testing Query: "${query}"`);
            console.log('='.repeat(70));

            const result = await pipeline.processQuestion(query, options);

            console.log("\n--- Response Summary ---");
            console.log(result.summary.substring(0, 500) + "...");

        } catch (error) {
            console.error(`❌ Error:`, error.message);
        }
    }

    await pipeline.shutdown();
    process.exit(0);
}

test();
