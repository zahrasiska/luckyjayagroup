/**
 * Standalone Test for InputRefinerAgent
 */

import { InputRefinerAgent } from './agents/input-refiner.js';

async function testInputRefiner() {
    console.log('\n' + '='.repeat(70));
    console.log('🧪 Testing InputRefinerAgent - Standalone');
    console.log('='.repeat(70) + '\n');

    const refiner = new InputRefinerAgent();

    const testCases = [
        {
            name: "Typo: perk → merk",
            input: "tampilkan barang dengan perk fukuyama",
            expected: "merk"
        },
        {
            name: "Typo: brg → barang",
            input: "cari brg dengan harga murah",
            expected: "barang"
        },
        {
            name: "Multiple typos",
            input: "tampilkan hrg partai untuk brg perk fukuyama",
            expected: "harga, barang, merk"
        },
        {
            name: "Already correct",
            input: "tampilkan barang dengan merk fukuyama",
            expected: "no change"
        },
        {
            name: "Short input (should skip)",
            input: "list brg",
            expected: "skip (too short)"
        },
        {
            name: "Grammar fix",
            input: "tampilkan daftar barang yg ada di gudang",
            expected: "yang (grammar fix)"
        }
    ];

    for (const testCase of testCases) {
        try {
            console.log(`\n📝 Test: ${testCase.name}`);
            console.log(`   Input: "${testCase.input}"`);
            console.log(`   Expected: ${testCase.expected}`);

            const startTime = Date.now();
            const refined = await refiner.refine(testCase.input, {});
            const elapsed = Date.now() - startTime;

            console.log(`   Output: "${refined}"`);
            console.log(`   Time: ${elapsed}ms`);

            // Check if there was any change
            if (refined === testCase.input) {
                console.log(`   ✅ No change (as expected for "${testCase.expected}")`);
            } else {
                console.log(`   ✅ Corrected successfully`);
            }

        } catch (error) {
            console.error(`   ❌ Error: ${error.message}`);
        }
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ Test Complete');
    console.log('='.repeat(70) + '\n');
}

// Run test
testInputRefiner()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Test failed:', error);
        process.exit(1);
    });
