/**
 * Inventory Manager Agent - Specialist Agent #4
 */

const SpecialistAgent = require('./specialist-base');

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

class InventoryManagerAgent extends SpecialistAgent {
    constructor() {
        super({
            id: 'inventory-manager',
            name: 'Inventory Manager',
            role: 'Ibu Diana Wijaya',
            systemPrompt: INVENTORY_MANAGER_PROMPT,
        });
    }
}

module.exports = InventoryManagerAgent;
