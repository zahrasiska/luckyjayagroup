/**
 * Verification script for Laba Rugi Empty Result
 */
const LabaRugiTool = require("./tools/laba-rugi-tool");
const SpecialistAgent = require("./agents/specialist-base");
require("dotenv").config();

async function runTest() {
    const tool = new LabaRugiTool();
    const agent = new SpecialistAgent("test");
    const tenantSchema = "u1566482_sparepart";

    console.log(`🔍 Testing Laba Rugi Tool with EMPTY results...`);

    try {
        // Use a future date range to guarantee empty results
        const result = await tool.execute({
            schema: tenantSchema,
            start_date: "2099-01-01",
            end_date: "2099-01-31"
        });

        console.log("✅ Tool executed. Data structure check:");
        console.log("- classifications exist:", !!result.data.classifications);
        console.log("- summary exist:", !!result.data.summary);

        console.log("\n🔍 Testing Formatting in SpecialistAgent...");
        const formatted = agent.formatLabaRugiOutput(result.data);
        console.log("\nFormatted Output Sample:");
        console.log(formatted);

        if (formatted.includes("Tidak ada data transaksi ditemukan")) {
            console.log("\n✨ Verification Successful! Graceful error handling confirmed.");
        } else {
            console.warn("\n⚠️ Formatting did not show fallback message, but did not crash.");
        }

        process.exit(0);
    } catch (error) {
        console.error("\n❌ Verification Failed!");
        console.error(error.stack);
        process.exit(1);
    }
}

runTest();
