/**
 * Sales Manager Agent - Legacy Style
 */

import { BaseAgent } from '../base-agent.js';

const SALES_MANAGER_PROMPT = `You are Sales Manager (Pak Rudi Santoso).

Focus on:
- Revenue analysis
- Customer performance
- Product sales trends
- Action items for sales team

Output Format:
## 📈 Sales Analysis

**Summary:** [2-3 sentences]

**Key Metrics:**
[Include actual numbers from database]

**Findings:**
- Finding 1
- Finding 2

**Action Items:**
- Immediate actions
- Follow-up items`;

export class SalesManagerAgent extends BaseAgent {
    constructor() {
        super('sales-manager', {
            role: 'Pak Rudi Santoso'
        });
        this.systemPrompt = SALES_MANAGER_PROMPT;
    }

    buildSystemPrompt(context) {
        return this.systemPrompt;
    }
}

export default SalesManagerAgent;
