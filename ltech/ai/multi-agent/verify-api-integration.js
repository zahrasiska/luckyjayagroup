const apiClient = require("./utils/api-client");
require("dotenv").config();

async function runTest() {
    // Force settings for verification
    apiClient.baseUrl = "http://localhost:8082";
    apiClient.aiToken = "ltech_ai_magic_token_2026_secure";

    const tenantSchema = "u1566482_sparepart"; // Example schema
    console.log(`🔍 Testing API integration for schema: ${tenantSchema}`);
    console.log(`📍 Using Base URL: ${apiClient.baseUrl}`);

    try {
        // Test 1: Health check
        console.log("\n--- Test 1: Health Check ---");
        const health = await apiClient.get("/api/health", tenantSchema);
        console.log("✅ Health response:", health);

        // Test 2: List contacts (testing auth bypass and schema switching)
        console.log("\n--- Test 2: List Contacts ---");
        const contacts = await apiClient.get("/api/contacts", tenantSchema);
        console.log("✅ Contacts response type:", typeof contacts);
        console.log("✅ Contacts keys:", Object.keys(contacts));

        const contactList = Array.isArray(contacts) ? contacts : (contacts.data || []);
        console.log("✅ Contact list length:", contactList.length);
        if (contactList.length > 0) {
            console.log("   First contact:", contactList[0].nama);
        }

        console.log("\n✨ API Integration Verification Successful!");
        process.exit(0);
    } catch (error) {
        console.error("\n❌ API Integration Verification Failed!");
        console.error(error.message);
        process.exit(1);
    }
}

runTest();
