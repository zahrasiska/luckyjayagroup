/**
 * Verification script for Buk Besar Tool
 */
const BukuBesarTool = require("./tools/buku-besar-tool");
require("dotenv").config();

async function runTest() {
    const tool = new BukuBesarTool();
    const tenantSchema = "u1566482_sparepart"; // Example schema
    const today = new Date().toISOString().split("T")[0];

    console.log(`🔍 Testing Buku Besar Tool for schema: ${tenantSchema}`);

    try {
        const result = await tool.execute({
            schema: tenantSchema,
            start_date: "2026-01-01",
            end_date: today
        });

        console.log("\n--- Tool Execution Result ---");
        console.log("✅ Success:", result.success);
        console.log("✅ Total Transactions found:", result.data.metadata.total_records);

        if (result.data.transactions.length > 0) {
            console.log("\nSample Transactions:");
            result.data.transactions.slice(0, 3).forEach(tx => {
                console.log(`   - [${tx.tanggal}] ${tx.notrans}: ${tx.uraian} (D: ${tx.debit}, K: ${tx.kredit})`);
                console.log(`     [Klas: ${tx.klasifikasi.nama}, Sub: ${tx.subklasifikasi.nama}, idtrans: ${tx.idtrans}]`);
            });
        }

        console.log("\n✨ Buku Besar Tool Verification Successful!");
        process.exit(0);
    } catch (error) {
        console.error("\n❌ Buku Besar Tool Verification Failed!");
        console.error(error.message);
        process.exit(1);
    } finally {
        await tool.close();
    }
}

runTest();
