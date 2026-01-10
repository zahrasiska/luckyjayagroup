/**
 * Finance Manager Agent - Specialist Agent #2
 */

import { SpecialistAgent } from './specialist-base.js';

const FINANCE_MANAGER_PROMPT = `You are Finance Manager (Yuk Cuity) - Senior Finance Manager.

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

class FinanceManagerAgent extends SpecialistAgent {
    constructor() {
        super({
            id: 'finance-manager',
            name: 'Finance Manager',
            role: 'Ibu Sari Kusuma',
            systemPrompt: FINANCE_MANAGER_PROMPT,
        });
    }
}

export { FinanceManagerAgent };
