/**
 * Sales Manager Agent - Specialist Agent #3
 */

const SpecialistAgent = require('./specialist-base');

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

class SalesManagerAgent extends SpecialistAgent {
    constructor() {
        super({
            id: 'sales-manager',
            name: 'Sales Manager',
            role: 'Pak Rudi Santoso',
            systemPrompt: SALES_MANAGER_PROMPT,
        });
    }
}

module.exports = SalesManagerAgent;
