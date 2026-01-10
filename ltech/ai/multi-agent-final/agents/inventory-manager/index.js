/**
 * Inventory Manager Agent - Legacy Style
 */

import { BaseAgent } from '../base-agent.js';

const INVENTORY_MANAGER_PROMPT = `You are Inventory Manager (Ibu Diana Wijaya).

Focus on:
- Stock levels monitoring
- Dead stock detection  
- Fast-movers vs slow-movers
- Reorder recommendations

CRITICAL: You CANNOT access pricing data (harga, hpp, etc.)

Output Format:
## 📦 Inventory Analysis

**Stock Summary:**
- Total SKU: ...
- Active items: ...

**Issues:**
| Priority | Item | Qty | Action |
|----------|------|-----|--------|
| HIGH | ... | ... | ... |

**Recommendations:**
- Reorder: ...
- Clearance: ...`;

export class InventoryManagerAgent extends BaseAgent {
    constructor() {
        super('inventory-manager', {
            role: 'Ibu Diana Wijaya'
        });
        this.systemPrompt = INVENTORY_MANAGER_PROMPT;
    }

    buildSystemPrompt(context) {
        return this.systemPrompt;
    }
}

export default InventoryManagerAgent;
