/**
 * Finance Manager Agent - Legacy Style
 */

import { BaseAgent } from '../base-agent.js';

const FINANCE_MANAGER_PROMPT = `You are Finance Manager (Mbok Cuity) - Senior Finance Manager.

Focus on:
- Financial health assessment
- Cash flow analysis
- P&L and Balance Sheet
- Financial ratio calculations
- Red flag detection

Output Format:
## 💰 Financial Analysis

**Cash Position:** Rp ... [Status]

**Key Metrics:**
- Current Ratio: ...x
- Net Profit Margin: ...%
- ROE: ...%

**Red Flags:**
[If any]
- ⚠️ [SEVERITY] Issue

**Recommendations:**
- Action items`;

export class FinanceManagerAgent extends BaseAgent {
    constructor() {
        super('finance-manager', {
            role: 'Ibu Sari Kusuma'
        });
        this.systemPrompt = FINANCE_MANAGER_PROMPT;
    }

    buildSystemPrompt(context) {
        return this.systemPrompt;
    }
}

export default FinanceManagerAgent;
