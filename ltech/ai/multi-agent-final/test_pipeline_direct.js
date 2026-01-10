// Set env BEFORE imports
process.env.BACKEND_API_URL = "https://erp.luckyjaya.tech/api";
process.env.AI_SPECIAL_TOKEN = "ltech_ai_magic_token_2026_secure";

import { MultiAgentPipeline } from './core/orchestrator.js';
import pkg from 'dotenv';
pkg.config();

async function test() {
    console.log("DEBUG: BACKEND_API_URL =", process.env.BACKEND_API_URL);
    console.log("DEBUG: AI_SPECIAL_TOKEN set:", !!process.env.AI_SPECIAL_TOKEN);

    const pipeline = new MultiAgentPipeline();
    await pipeline.initialize();

    const options = {
        userId: 'test-user',
        sessionId: 'test-session-final-123',
        tenantSchema: 'u1566482_sparepart',
        onProgress: (p) => console.log(`[PROGRESS] ${p.step}: ${p.detail || ''}`)
    };

    try {
        console.log("\n--- Testing Typo Normalization: 'perk' should become 'merk' ---");
        const result = await pipeline.processQuestion("tampilkan barang dengan perk fukuyama", options);

        console.log("\n--- Final Response Summary (Visual) ---");
        console.log(result.summary);

        if (result.summary && result.summary.includes('[[DATA]]')) {
            console.log("\n✅ SUCCESS: Raw data block detected!");
            const dataMatch = result.summary.match(/\[\[DATA\]\]([\s\S]*?)\[\[\/DATA\]\]/);
            if (dataMatch) {
                const data = JSON.parse(dataMatch[1]);
                console.log("Data Type:", data.type);
                console.log("Item Count:", data.items?.length || 0);
            }
        } else {
            console.log("\n❌ FAILED: Raw data block MISSING.");
        }

    } catch (e) {
        console.error("Pipeline test failed:", e);
    } finally {
        await pipeline.shutdown();
    }
}

test();
