/**
 * Test Fuzzy Price Matching
 */

import { MultiAgentPipeline } from './core/orchestrator.js';

async function test() {
    const pipeline = new MultiAgentPipeline();

    const options = {
        userId: 'test-user',
        userRole: 'user',
        tenantSchema: 'u1566482_sparepart',
        sessionId: 'test-fuzzy-price'
    };

    const scenarios = [
        { query: "tampilkan harga eceran barang merk fukuyama", expected: "Exact match: eceran" },
        { query: "cari harga barang merk fukuyama", expected: "Fuzzy match: retail-like" },
        { query: "list harga wholesaler barang ban", expected: "No match, privacy mode" }
    ];

    for (const scenario of scenarios) {
        try {
            console.log(`\n${'='.repeat(70)}`);
            console.log(`📝 Testing: "${scenario.query}"`);
            console.log(`   Expected: ${scenario.expected}`);
            console.log('='.repeat(70));

            const result = await pipeline.processQuestion(scenario.query, options);

            // Check if field was included
            if (result.summary.includes("[[DATA]]")) {
                const dataMatch = result.summary.match(/\[\[DATA\]\](.+?)\[\[\/DATA\]\]/);
                if (dataMatch) {
                    const data = JSON.parse(dataMatch[1]);
                    console.log(`✅ Fields returned: ${data.fields.join(', ')}`);
                }
            }

        } catch (error) {
            console.error(`❌ Error:`, error.message);
        }
    }

    await pipeline.shutdown();
    process.exit(0);
}

test();
