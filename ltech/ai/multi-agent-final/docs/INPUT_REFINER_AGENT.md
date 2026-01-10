# InputRefinerAgent - Implementation Guide

## Overview
`InputRefinerAgent` adalah pre-processor agent yang menggunakan Qwen untuk memperbaiki typo dan grammar dalam user input sebelum masuk ke pipeline routing.

## Current Status
✅ **Agent Created**: `/agents/input-refiner.js`  
⚠️ **Not Yet Integrated**: Pending orchestrator integration untuk avoid breaking changes

## Benefits
- **Centralized Correction**: Satu tempat untuk handle semua typo
- **LLM-Powered**: Menggunakan Qwen untuk intelligent correction
- **Clean Pipeline**: Specialist agents menerima input yang sudah bersih
- **Scalable**: Bisa handle complex typos, grammar, bahkan slang

## Integration Steps (Future)

### 1. Import di Orchestrator
```javascript
// core/orchestrator.js
import { InputRefinerAgent } from '../agents/input-refiner.js';

export class MultiAgentPipeline {
    constructor() {
        this.inputRefiner = new InputRefinerAgent();
        // ... existing code
    }
}
```

### 2. Add Refinement Step
```javascript
async processQuestion(userQuestion, options = {}) {
    // ... existing session setup

    // Step 0: Input Refinement
    console.log('🔧 Step 0: Input Refinement...');
    emitProgress('refining_start', { detail: 'Memperbaiki typo dan grammar...' });

    const refinedQuestion = await this.inputRefiner.refine(resolvedQuestion, {
        qwenSessionId,
        tenantSchema
    });

    emitProgress('refining_complete', { 
        original: resolvedQuestion,
        refined: refinedQuestion 
    });

    // Step 1: Router (use refined question instead of resolvedQuestion)
    const routing = await this.router.route(refinedQuestion, redisSession);
    
    // ... rest of pipeline
}
```

### 3. Remove Local normalizeTypo()
Once InputRefinerAgent is integrated, you can remove the `normalizeTypo()` method from individual agents like `InventoryManagerAgent` since correction will be centralized.

## Configuration

### Enable/Disable
```javascript
// Disable if causing issues
inputRefiner.setEnabled(false);
```

### Adjust Similarity Threshold
```javascript
// Skip correction if change is < 5%
inputRefiner.minSimilarity = 0.95;
```

### Timeout
Default: 10 seconds  
Adjust in`input-refiner.js` line 98:
```javascript
timeout: 10000 // milliseconds
```

## Testing

### Standalone Test
```javascript
import { InputRefinerAgent } from './agents/input-refiner.js';

const refiner = new InputRefinerAgent();
const original = "tampilkan barang dengan perk fukuyama";
const refined = await refiner.refine(original, {});

console.log(`Original: ${original}`);
console.log(`Refined: ${refined}`);
// Expected: "tampilkan barang dengan merk fukuyama"
```

### Integration Test
After integration, test with:
```bash
node test_pipeline_direct.js
```

Look for logs like:
```
🔧 [InputRefiner] Corrected input:
   Original: "tampilkan barang dengan perk fukuyama"
   Refined:  "tampilkan barang dengan merk fukuyama"
   Similarity: 92.5%
```

## Known Issues & Considerations

### Latency
- Adds 1-3 seconds per query (Qwen CLI call)
- **Mitigation**: Set aggressive timeout, use similarity threshold to skip

### Over-Correction
- LLM might "fix" brand names or technical terms
- **Mitigation**: Prompt explicitly warns against changing brand names

### Error Handling
- Fallback to original input on any error
- No pipeline breakage if Qwen fails

## Rollback Plan
If InputRefinerAgent causes issues:
1. Set `enabled: false` in constructor
2. Or comment out `Step 0` in orchestrator
3. Existing `normalizeTypo()` in agents will continue to work

## Future Enhancements
- [ ] Cache common corrections (Redis)
- [ ] Use lighter model (Gemini Flash instead of Qwen)
- [ ] A/B testing: Compare correction quality vs latency
- [ ] Metrics: Track correction hit rate, false positives

## Notes
- Created: 2026-01-09
- Status: Standalone, not integrated yet
- Reason: Avoiding risky changes to orchestrator during active session
