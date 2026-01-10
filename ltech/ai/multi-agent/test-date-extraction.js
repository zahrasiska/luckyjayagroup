/**
 * Test script for date extraction logic
 */
const SpecialistAgent = require("./agents/specialist-base");

// Mock class to test extractPeriod
class TestAgent extends SpecialistAgent {
    constructor() {
        super("test");
    }

    testExtract(question) {
        const result = this.extractPeriod(question, 2026);
        console.log(`Question: "${question}"`);
        console.log(`Result:   Start: ${result.start_date}, End: ${result.end_date}`);
        console.log("---");
    }
}

const agent = new TestAgent();

process.env.DB_HOST = "localhost"; // Required for constructor

console.log("🔍 Testing Date Extraction Logic...\n");

agent.testExtract("nilai persediaan 3 bulan yang lalu");
agent.testExtract("laporan laba rugi bulan lalu");
agent.testExtract("neraca tahun kemarin");
agent.testExtract("transaksi bulan kemarin");
agent.testExtract("rugi laba tahun ini");
agent.testExtract("penjualan 2025");
