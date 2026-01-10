import { StockReportTool } from './core/tools/stock-report-tool.js';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    const tool = new StockReportTool();
    try {
        const result = await tool.execute({
            schema: 'u1566482_sparepart',
            search: 'FUKUYAMA'
        });
        console.log(JSON.stringify(result, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await tool.close();
    }
}

test();
