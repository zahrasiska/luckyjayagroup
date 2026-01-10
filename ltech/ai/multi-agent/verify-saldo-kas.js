/**
 * Verification script for Saldo Kas Tool
 */
const SaldoKasTool = require("./tools/saldo-kas-tool");
require("dotenv").config();

async function runTest() {
    const tool = new SaldoKasTool();
    const tenantSchema = "u1566482_sparepart"; // Example schema

    console.log(`🔍 Testing Saldo Kas Tool for schema: ${tenantSchema}`);

    try {
        const result = await tool.execute({
            schema: tenantSchema
        });

        console.log("\n--- Tool Execution Result ---");
        console.log("✅ Success:", result.success);
        console.log("✅ Total Saldo:", result.data.total_saldo);
        console.log("✅ Accounts found:", result.data.breakdown.reduce((count, cat) => count + cat.accounts.length, 0));

        if (result.data.breakdown.length > 0) {
            result.data.breakdown.forEach(cat => {
                console.log(`\n📂 ${cat.name} (Total: ${cat.total})`);
                cat.accounts.slice(0, 3).forEach(acc => {
                    console.log(`   - ${acc.akun} (${acc.kode}): ${acc.saldo}`);
                    console.log(`     [Klas: ${acc.noklasifikasi}-${acc.namaklasifikasi}, Sub: ${acc.nosubklasifikasi}-${acc.namasubklasifikasi}]`);
                });
            });
        }

        console.log("\n✨ Saldo Kas Tool Verification Successful!");
        process.exit(0);
    } catch (error) {
        console.error("\n❌ Saldo Kas Tool Verification Failed!");
        console.error(error.message);
        process.exit(1);
    } finally {
        await tool.close();
    }
}

runTest();
