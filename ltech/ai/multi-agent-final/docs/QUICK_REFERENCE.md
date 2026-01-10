# Multi-Agent System - Quick Reference

Fast reference untuk developer yang bekerja dengan Lucky Tech Multi-Agent System.

---

## 🚀 Quick Start

```bash
# Development
npm install
npm run dev

# Production
pm2 start ecosystem.config.js --name multi-agent-final
pm2 logs multi-agent-final
```

---

## 📁 File Locations

| Component | Path |
|-----------|------|
| Main Server | `server.js` |
| Orchestrator | `core/orchestrator.js` |
| Agents | `agents/*.js` |
| Tools | `core/tools/*.js` |
| SQL Templates | `tools/*/` |
| Config | `.env` |
| Docs | `docs/` |

---

## 🤖 Agent Quick Reference

| Agent | Purpose | Main Use Cases |
|-------|---------|----------------|
| `InputRefinerAgent` | Typo correction | Auto-fix grammar/typo |
| `RouterAgent` | Intent detection | Route to specialist |
| `FinanceManagerAgent` | Finance queries | Neraca, L/R, Saldo Kas |
| `InventoryManagerAgent` | Inventory queries | Stock, products, prices |
| `SalesManagerAgent` | Sales queries | Orders, customers |
| `MemoryManagerAgent` | Memory ops | Save/recall context |
| `GeneralAssistantAgent` | Fallback | General questions |
| `SummarizerAgent` | Format response | Markdown + JSON |

---

## 🔧 Common Commands

### PM2 Management
```bash
# Restart
pm2 restart multi-agent-final

# Logs (real-time)
pm2 logs multi-agent-final --lines 50

# Monitor
pm2 monit

# Stop
pm2 stop multi-agent-final

# Delete
pm2 delete multi-agent-final
```

### Testing
```bash
# Test Input Refiner
node test_input_refiner.js

# Test Speed & Accuracy
node test_speed_accuracy.js

# Test Pipeline
node test_pipeline_direct.js

# Debug Qwen
node test_debug_qwen.js
```

### Health Checks
```bash
# API Health
curl http://localhost:8899/api/health

# Redis
redis-cli ping

# Backend API
curl https://erp.luckyjaya.tech/api/health
```

---

## 🛠️ Tool Usage

### InventoryTool

```javascript
await inventoryTool.execute({
    type: 'search',
    schema: 'u1566482_sparepart',
    search: 'fukuyama',
    fields: 'id,nama,stok,jual1',
    filters: {
        idmerk: 146,
        limit: 10
    }
});
```

### PriceConfigTool

```javascript
await priceConfigTool.execute({
    schema: 'u1566482_sparepart'
});

// Returns:
{
    success: true,
    data: {
        fields: { jual1: {...}, jual2: {...} },
        publicFields: ['jual1', 'jual2'],
        labels: { jual1: 'Eceran', jual2: 'Partai' }
    }
}
```

---

## 📊 Response Formats

### Visual (Markdown)
```
[VISUAL]
# Header
**Bold text**
| Col 1 | Col 2 |
|-------|-------|
| Data  | Data  |
[/VISUAL]
```

### Voice (TTS-friendly)
```
[VOICE]
Simple text for text-to-speech.
No markdown formatting.
[/VOICE]
```

### Structured Data
```
[[DATA]]
{"type":"inventory_list","items":[...]}
[[/DATA]]
```

---

## 🔍 Debugging

### Enable Debug Logs
```javascript
// In orchestrator.js or agent file
log.level = 'debug';
```

### Common Log Patterns
```bash
# Input refinement
grep "🔧.*InputRefiner" -A 5

# Routing decisions
grep "📍.*Routing" -A 3

# Tool executions
grep "📡.*Tool:" -A 2

# Errors
grep "❌" -B 2 -A 5
```

---

## ⚙️ Configuration Snippets

### Disable Input Refiner
```javascript
// In orchestrator.js after getAgent('input-refiner')
const inputRefiner = getAgent('input-refiner');
inputRefiner.setEnabled(false);
```

### Adjust Similarity Threshold
```javascript
// In input-refiner.js constructor
this.minSimilarity = 0.95; // Lower = more corrections applied
```

### Change Qwen Timeout
```javascript
// In input-refiner.js callQwen method
timeout: 15000 // 15 seconds
```

---

## 🔑 Environment Variables

```bash
# Required
BACKEND_API_URL=https://erp.luckyjaya.tech/api
AI_SPECIAL_TOKEN=your-token-here

# Optional
PORT=8899
REDIS_URL=redis://localhost:6379
NODE_ENV=production
```

---

## 📞 API Quick Reference

### WebSocket Message
```javascript
{
    type: 'message',
    content: 'user query',
    tenantSchema: 'u1566482_sparepart',
    userId: 'user123',
    userRole: 'admin'
}
```

### REST API
```bash
curl -X POST http://localhost:8899/api/query \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "tampilkan stok barang",
    "tenantSchema": "u1566482_sparepart",
    "userId": "user123"
  }'
```

---

## 🚨 Common Issues

| Issue | Solution |
|-------|----------|
| Qwen timeout | Check `qwen --version`, increase timeout |
| Redis error | Verify `redis-cli ping` works |
| Backend API 401 | Check `AI_SPECIAL_TOKEN` in .env |
| Agent not found | Check AGENTS registry in orchestrator.js |
| Price config error | Verify tenant has `harga` table |

---

## 📈 Performance Tips

1. **Session Reuse**: Use same `sessionId` untuk context continuity
2. **Field Selection**: Request only needed fields (faster queries)
3. **Caching**: Price config auto-cached per schema
4. **Batch Queries**: Combine related questions when possible

---

## 🎯 Best Practices

### Agent Development
1. Always extend `SpecialistBaseAgent` untuk consistency
2. Implement proper error handling dengan fallback
3. Log important decisions dengan structured log format
4. Return standardized response format

### Tool Development
1. Validate input parameters
2. Handle API errors gracefully
3. Cache when appropriate
4. Document input/output schema clearly

### Testing
1. Test standalone before integration
2. Use realistic user queries
3. Measure latency dan accuracy
4. Test edge cases (empty responses, errors, etc.)

---

**Last Updated**: 2026-01-09  
**Maintained by**: Lucky Tech Development Team
