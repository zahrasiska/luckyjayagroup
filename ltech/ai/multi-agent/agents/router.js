/**
 * Router Agent - Agent 1
 * 
 * Determines which specialist agent should handle the request
 * based on question type and user role
 */

const QwenWrapper = require('../qwen-wrapper');

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

class RouterAgent {
    constructor() {
        this.id = 'router';
        this.name = 'Router Agent';
        this.qwen = new QwenWrapper();
    }

    /**
     * Route user question to appropriate specialist
     */
    async route(userQuestion, session) {
        const fullPrompt = `${ROUTER_SYSTEM_PROMPT}

USER QUESTION:
${userQuestion}

USER CONTEXT:
- Role: ${session.userRole || 'user'}
- Tenant: ${session.tenantSchema}
- Last Agent: ${session.history && session.history.length > 0 ? session.history[session.history.length - 1].agent : 'none'}

ROUTING DECISION (JSON only):`;

        try {
            // Call Qwen (resume if we have a session ID)
            let result;
            if (session && session.qwenSessionId) {
                console.log(`📝 Router resuming session: ${session.qwenSessionId}`);
                result = await this.qwen.continueSession(session.qwenSessionId, fullPrompt, {
                    tenantSchema: session.tenantSchema,
                });
            } else {
                result = await this.qwen.startSession(fullPrompt, {
                    tenantSchema: session.tenantSchema,
                    model: 'qwen-turbo', // Fast model for routing
                });
            }

            // Parse JSON response
            const routing = this.parseRoutingResponse(result.output);

            return {
                ...routing,
                qwenSessionId: result.sessionId,
            };

        } catch (error) {
            console.error('Router error:', error.message);

            // Fallback: simple keyword matching
            return this.fallbackRouting(userQuestion, session);
        }
    }

    /**
     * Parse Qwen's routing response
     */
    parseRoutingResponse(output) {
        try {
            // Extract JSON from output (might have markdown fences)
            const jsonMatch = output.match(/\{[\s\S]*\}/);

            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }

            const routing = JSON.parse(jsonMatch[0]);

            // Validate
            if (!routing.selectedAgent) {
                throw new Error('Missing selectedAgent in routing');
            }

            // CRITICAL: Validate agent is implemented
            const implementedAgents = ['sales-manager', 'finance-manager', 'inventory-manager', 'memory-manager', 'general-assistant'];

            if (!implementedAgents.includes(routing.selectedAgent)) {
                console.warn(`⚠️ Router selected unimplemented agent: ${routing.selectedAgent}`);
                console.warn(`   Rerouting to sales-manager (default)`);

                // Reroute to safe default
                routing.selectedAgent = 'sales-manager';
                routing.reasoning = `Original: ${routing.selectedAgent} (not implemented). Rerouted to sales-manager.`;
                routing.confidence = 0.5;
            }

            return routing;

        } catch (error) {
            throw new Error(`Failed to parse routing: ${error.message}`);
        }
    }

    /**
     * Fallback routing using simple keyword matching
     * Only routes to IMPLEMENTED specialists
     */
    fallbackRouting(question, session) {
        const q = question.toLowerCase();

        let selectedAgent = 'sales-manager'; // Safe default - always available

        // Only route to implemented specialists
        if (q.includes('ingat') || q.includes('catat') || q.includes('simpan')) {
            selectedAgent = 'memory-manager';
        } else if (q.includes('kas') || q.includes('laba') || q.includes('rugi') || q.includes('neraca') || q.includes('piutang') || q.includes('hutang')) {
            selectedAgent = 'finance-manager';
        } else if (q.includes('stok') || q.includes('inventory') || q.includes('stock') || q.includes('barang')) {
            selectedAgent = 'inventory-manager';
        } else if (q.includes('cuaca') || q.includes('presiden') || q.includes('berita') || q.includes('siapa') || q.includes('apa')) {
            selectedAgent = 'general-assistant';
        }

        console.log(`   ⚠️ Fallback routing: ${q.substring(0, 30)}... → ${selectedAgent}`);

        return {
            selectedAgent,
            userIntent: 'General business query',
            reasoning: 'Keyword-based fallback (Qwen unavailable)',
            context: {},
            confidence: 0.6,
            qwenSessionId: 'fallback-' + Date.now(), // Generate mock session ID
        };
    }
}

module.exports = RouterAgent;
