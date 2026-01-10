/**
 * Test: FINAL Global Memory Integration Verification
 *
 * 1. Add memory: "TEST FINAL FIX <timestamp>"
 * 2. Validate memory exists in file
 */

import PipelineOrchestrator from "./pipeline-orchestrator.js";
import fs from "fs/promises";

async function testFix() {
    const orchestrator = new PipelineOrchestrator({
        allowAllTools: true,
        model: "gpt-4.1",
    });

    const TEST_CODE = `TEST_FINAL_FIX_${Date.now()}`;
    console.log(`🧪 TESTING WITH CODE: ${TEST_CODE}\n`);

    // STEP 1: Add memory
    console.log("📝 Adding memory...");
    const addResult = await orchestrator.executeMultiAgentPipeline(
        `Simpan ke memory global: Kode verifikasi adalah ${TEST_CODE}. Gunakan tool sekarang juga tanpa tanya.`,
        { tenantSchema: "prive", userId: "test" },
    );

    console.log(`Response: ${addResult.summary}\n`);

    // STEP 2: Validate file
    console.log("🔍 Checking file system...");
    const content = await fs.readFile(
        "/home/luckyjayagroup/ltech/ai/copilot-orchestrator/knowledge/CORE_MEMORY.md",
        "utf-8",
    );

    if (content.includes(TEST_CODE)) {
        console.log("✅ SUCCESS! Code found in CORE_MEMORY.md");
    } else {
        console.log("❌ FAILED! Code NOT found in CORE_MEMORY.md");
        console.log("File content tail:\n" + content.slice(-200));
    }
}

testFix();
