/**
 * Debug Test - Raw Qwen Output
 */

import { InputRefinerAgent } from './agents/input-refiner.js';

async function debugTest() {
    const refiner = new InputRefinerAgent();

    // Test the exact same input as user's manual test
    const input = "tampilkan barang dengan perk fukuyama";

    console.log('🔍 Debug Test: Raw Qwen Output');
    console.log('Input:', input);
    console.log('');

    // Temporarily modify to show raw output
    const originalExtract = refiner.extractCorrectedSentence.bind(refiner);

    refiner.extractCorrectedSentence = function (output) {
        console.log('📄 RAW QWEN OUTPUT:');
        console.log('='.repeat(70));
        console.log(output);
        console.log('='.repeat(70));

        const result = originalExtract(output);
        console.log('');
        console.log('📌 EXTRACTED RESULT:', result);
        console.log('');

        return result;
    };

    try {
        const refined = await refiner.refine(input, {});

        console.log('');
        console.log('✅ Final Result:');
        console.log('  Original:', input);
        console.log('  Refined:', refined);
        console.log('  Changed:', input !== refined);

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    }
}

debugTest()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
