// Use public URL for final test
process.env.BACKEND_API_URL = "https://erp.luckyjaya.tech/api";
process.env.AI_SPECIAL_TOKEN = "ltech_ai_magic_token_2026_secure";

import { InventoryTool } from './core/tools/inventory-tool.js';

async function test() {
    console.log("DEBUG: BACKEND_API_URL =", process.env.BACKEND_API_URL);

    const tool = new InventoryTool();
    try {
        console.log("--- Testing Search (with custom fields) ---");
        // Request specific fields as per user request for flexibility
        const searchResult = await tool.execute({
            type: 'search',
            schema: 'u1566482_sparepart',
            search: 'ACCU',
            fields: 'id,nama,stok,rak'
        });

        const data = searchResult.data;
        const items = data.data || (Array.isArray(data) ? data : []);

        console.log("Search Success! Items found:", items.length);
        if (items.length > 0) {
            console.log("First item sample:", items[0]);

            const firstId = items[0].id;
            console.log(`\n--- Testing Detail for ID: ${firstId} ---`);
            const detailResult = await tool.execute({
                type: 'detail',
                schema: 'u1566482_sparepart',
                id: firstId,
                fields: 'id,nama,listpeletakan'
            });

            const item = detailResult.data.data || detailResult.data;
            console.log("Detail Success! Nama:", item.nama);
            console.log("Fields returned:", Object.keys(item).join(', '));
            console.log("Peletakan (listpeletakan):", Array.isArray(item.listpeletakan) ? item.listpeletakan.length : 0, "entries");
        }
    } catch (e) {
        console.error("Test Failed:", e.message);
    }
}

test();
