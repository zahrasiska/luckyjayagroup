/**
 * Router Agent
 * 100% Duplicate of Legacy Logic
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import logger from '../../utils/logger.js';

const execAsync = promisify(exec);

const ROUTER_SYSTEM_PROMPT = `You are a Router Agent for a business intelligence system.

TASK:
Analyze user questions and determine the appropriate specialist agent.

AVAILABLE SPECIALIST AGENTS:
1. **sales-manager**: Sales analysis, revenue, customers, products, transactions
   - Keywords: "penjualan", "sales", "customer", "produk", "revenue", "top customer"
   
2. **finance-manager**: Financial reports, cash flow, P&L, balance sheet, accounting
   - Keywords: "kas", "laba rugi", "neraca", "hutang", "piutang", "financial"
   
3. **inventory-manager**: Stock levels, dead stock, inventory, reorder points
   - Keywords: "stok", "inventory", "stock", "barang", "dead stock", "reorder"

4. **memory-manager**: Saving new facts/rules to global memory
   - Keywords: "ingat", "catat", "simpan", "hafalkan", "save", "remember"

CRITICAL ROUTING RULES:
- If question requests modification of previous result ("tambahkan kolom", "filter", "urutan"), KEEP SAME AGENT.
- If question starts with "Ingat..." or "Catat..." → select "memory-manager"
- If question mentions finance/accounting → "finance-manager"
- If question mentions inventory/stock → "inventory-manager"
- If question is general info (Weather, News, Facts) → "general-assistant"
- If question is unidentified → select "sales-manager" (default)

OUTPUT FORMAT (JSON only):
{
  "selectedAgent": "sales-manager",
  "userIntent": "Analyze sales by brand",
  "reasoning": "Question asks about sales data",
  "context": {
    "focus": "brand analysis",
    "period": "2025"
  },
  "confidence": 0.95
}

IMPORTANT: 
- Output ONLY valid JSON, no markdown, no explanation
- selectedAgent MUST be one of: sales-manager, finance-manager, inventory-manager, memory-manager
- NO other agents exist in the system`;

export class RouterAgent {
    constructor() {
        this.log = logger.agents;
    }

    /**
     * Call Qwen via CLI
     */
    async callQwen(prompt, options = {}) {
        const tempFile = path.join(os.tmpdir(), `router_qwen_${Date.now()}.txt`);
        try {
            await fs.writeFile(tempFile, prompt, 'utf8');
            const env = {
                ...process.env,
                PGSCHEMA: options.tenantSchema ? `${options.tenantSchema},prive,public` : process.env.PGSCHEMA,
                DB_NAME: 'luckyjayagroup',
            };

            let command = `qwen chat --output-format json --model qwen-turbo < ${tempFile}`;
            if (options.sessionId && options.sessionId !== 'new') {
                command = `qwen chat --resume ${options.sessionId} --output-format json < ${tempFile}`;
            }

            const { stdout } = await execAsync(command, { env, timeout: 60000 });
            const events = JSON.parse(stdout);

            const initEvent = events.find(e => e.type === 'system' && e.subtype === 'init');
            const resultEvent = events.find(e => e.type === 'result');

            return {
                sessionId: initEvent?.session_id || options.sessionId,
                output: resultEvent?.result || stdout
            };
        } finally {
            try { await fs.unlink(tempFile); } catch (e) { }
        }
    }

    /**
     * Route user question
     */
    async process(userQuestion, session) {
        const fullPrompt = `${ROUTER_SYSTEM_PROMPT}

USER QUESTION:
${userQuestion}

USER CONTEXT:
- Role: ${session.userRole || 'user'}
- Tenant: ${session.tenantSchema || session.tenant?.schema}
- Last Agent: ${session.history && session.history.length > 0 ? session.history[session.history.length - 1].agent : 'none'}

ROUTING DECISION (JSON only):`;

        try {
            const result = await this.callQwen(fullPrompt, {
                tenantSchema: session.tenantSchema || session.tenant?.schema,
                sessionId: session.qwenSessionId
            });

            const routing = this.parseRoutingResponse(result.output);

            return {
                ...routing,
                targetAgent: routing.selectedAgent, // Compatibility with final orchestrator
                qwenSessionId: result.sessionId,
                success: true
            };
        } catch (error) {
            this.log.error('Router error:', error.message);
            return this.fallbackRouting(userQuestion, session);
        }
    }

    parseRoutingResponse(output) {
        try {
            const jsonMatch = output.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('No JSON found');
            const routing = JSON.parse(jsonMatch[0]);

            const implementedAgents = ['sales-manager', 'finance-manager', 'inventory-manager', 'memory-manager', 'general-assistant'];
            if (!implementedAgents.includes(routing.selectedAgent)) {
                routing.selectedAgent = 'sales-manager';
            }
            return routing;
        } catch (error) {
            throw new Error(`Failed to parse routing: ${error.message}`);
        }
    }

    fallbackRouting(question, session) {
        const q = question.toLowerCase();
        let selectedAgent = 'sales-manager';

        if (q.includes('ingat') || q.includes('catat')) selectedAgent = 'memory-manager';
        else if (q.includes('kas') || q.includes('laba') || q.includes('rugi') || q.includes('neraca')) selectedAgent = 'finance-manager';
        else if (q.includes('stok') || q.includes('barang')) selectedAgent = 'inventory-manager';

        return {
            selectedAgent,
            targetAgent: selectedAgent,
            userIntent: 'Fallback query',
            reasoning: 'Keyword-based fallback',
            confidence: 0.6,
            qwenSessionId: 'fallback-' + Date.now(),
            success: true
        };
    }
}

export default RouterAgent;
