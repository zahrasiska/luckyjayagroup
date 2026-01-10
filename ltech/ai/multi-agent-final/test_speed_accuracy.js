/**
 * Speed & Accuracy Test for InputRefinerAgent
 */

import { InputRefinerAgent } from './agents/input-refiner.js';

async function speedAccuracyTest() {
    console.log('\n' + '='.repeat(70));
    console.log('⚡ InputRefinerAgent - Speed & Accuracy Test');
    console.log('='.repeat(70) + '\n');

    const refiner = new InputRefinerAgent();

    const testCases = [
        // Common typos in inventory queries
        { input: "tampilkan perk fukuyama", expected: "merk" },
        { input: "cari brg dengan hrg murah", expected: "barang, harga" },
        { input: "list stok brg di gudang", expected: "barang" },
        { input: "detail brg dengan kode FKY", expected: "barang" },
        { input: "tampilkan hrg partai", expected: "harga" },

        // Grammar issues
        { input: "tampilkan barang yg stoknya habis", expected: "yang" },
        { input: "cari barang yg harganya dibawah 100rb", expected: "yang, di bawah" },

        // Mixed typos
        { input: "tampilkan hrg partai utk brg perk toyota", expected: "harga, untuk, barang, merk" },
        { input: "cari brg dg stok kosong", expected: "barang, dengan" },
        { input: "list brg yg perknya federal", expected: "barang, yang, merk/merek" },
    ];

    let totalTime = 0;
    let correctCount = 0;
    const results = [];

    for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];

        try {
            console.log(`\n[${i + 1}/${testCases.length}] Testing...`);
            console.log(`Input: "${testCase.input}"`);

            const startTime = Date.now();
            const refined = await refiner.refine(testCase.input, {});
            const elapsed = Date.now() - startTime;

            totalTime += elapsed;

            const changed = refined !== testCase.input;
            const lowerRefined = refined.toLowerCase();
            const isCorrect = changed; // Basic check: did it change?

            if (isCorrect) correctCount++;

            results.push({
                input: testCase.input,
                output: refined,
                time: elapsed,
                changed,
                expected: testCase.expected
            });

            console.log(`Output: "${refined}"`);
            console.log(`Time: ${elapsed}ms`);
            console.log(`Changed: ${changed ? '✅ YES' : '❌ NO'}`);

        } catch (error) {
            console.error(`❌ Error: ${error.message}`);
            results.push({
                input: testCase.input,
                output: 'ERROR',
                time: 0,
                changed: false,
                expected: testCase.expected
            });
        }
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total Tests: ${testCases.length}`);
    console.log(`Corrections Applied: ${correctCount}/${testCases.length} (${(correctCount / testCases.length * 100).toFixed(1)}%)`);
    console.log(`Average Time: ${(totalTime / testCases.length).toFixed(0)}ms`);
    console.log(`Total Time: ${(totalTime / 1000).toFixed(1)}s`);

    // Performance breakdown
    const fastQueries = results.filter(r => r.time < 3000).length;
    const mediumQueries = results.filter(r => r.time >= 3000 && r.time < 6000).length;
    const slowQueries = results.filter(r => r.time >= 6000).length;

    console.log('\n⚡ Speed Distribution:');
    console.log(`  Fast (<3s): ${fastQueries} queries`);
    console.log(`  Medium (3-6s): ${mediumQueries} queries`);
    console.log(`  Slow (>6s): ${slowQueries} queries`);

    // Detailed results
    console.log('\n📋 Detailed Results:');
    console.log(''.padEnd(70, '-'));
    results.forEach((r, idx) => {
        const status = r.changed ? '✅' : '❌';
        console.log(`${idx + 1}. ${status} ${r.time}ms - "${r.input.substring(0, 35)}${r.input.length > 35 ? '...' : ''}"`);
    });

    console.log('\n' + '='.repeat(70) + '\n');
}

// Run test
speedAccuracyTest()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Test failed:', error);
        process.exit(1);
    });
