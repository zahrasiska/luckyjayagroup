# AI Workflow Backend - LTECH Multi-Agent System

**Complete flow dari user input sampai AI response**

---

## 🔄 Complete System Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERACTION                             │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
            1. WebSocket Connect          2. Send Message
                    │                             │
                    ▼                             ▼
┌────────────────────────────────────────────────────────────────────┐
│                         BACKEND SERVER                              │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  CONNECTION PHASE (WebSocket)                                │  │
│  │  ├─ Authenticate (token + tenant)                            │  │
│  │  ├─ Build initial context                                    │  │
│  │  ├─ Generate session ID (AI cold start)                      │  │
│  │  ├─ Emit 'session-ready' to client                           │  │
│  │  └─ Load history from file system                            │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  MESSAGE PROCESSING PHASE                                    │  │
│  │  ├─ Receive 'chat-message' event                             │  │
│  │  ├─ Extract question & sessionId                             │  │
│  │  ├─ Check for greetings (fast path)                          │  │
│  │  ├─ Build full context:                                      │  │
│  │  │  • User info (from token)                                 │  │
│  │  │  • Tenant schema                                          │  │
│  │  │  • Roles & permissions                                    │  │
│  │  │  • CORE_MEMORY (business rules)                           │  │
│  │  │  • User knowledge (session memory)                        │  │
│  │  └─ Send to Orchestrator                                     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  ORCHESTRATOR PIPELINE                                       │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │  STEP 1: ROUTER AGENT                                  │  │  │
│  │  │  ├─ Analyze question intent                            │  │  │
│  │  │  ├─ Detect required agent (finance/sales/inventory)    │  │  │
│  │  │  ├─ Check RBAC permissions                             │  │  │
│  │  │  └─ Route to specialist agent                          │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  │           │                                                     │  │
│  │           ▼                                                     │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │  STEP 2: SPECIALIST AGENT                              │  │  │
│  │  │  (Finance/Sales/Inventory Manager)                     │  │  │
│  │  │  ├─ Load CORE_MEMORY + user knowledge                  │  │  │
│  │  │  ├─ Identify required tool                             │  │  │
│  │  │  ├─ Parse parameters (dates, filters, etc)             │  │  │
│  │  │  ├─ Call tool(s)                                        │  │  │
│  │  │  │  ┌──────────────────────────────────────┐           │  │  │
│  │  │  │  │  TOOL EXECUTION                      │           │  │  │
│  │  │  │  │  ├─ Build SQL query                  │           │  │  │
│  │  │  │  │  ├─ Execute via tenant schema        │           │  │  │
│  │  │  │  │  ├─ Format results                   │           │  │  │
│  │  │  │  │  └─ Return structured data           │           │  │  │
│  │  │  │  └──────────────────────────────────────┘           │  │  │
│  │  │  ├─ Format response for business users                 │  │  │
│  │  │  └─ Add metadata (agent, tool, duration)               │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  │           │                                                     │  │
│  │           ▼                                                     │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │  STEP 3: SUMMARIZER (Optional)                         │  │  │
│  │  │  ├─ Format for business audience                       │  │  │
│  │  │  ├─ Add insights & recommendations                     │  │  │
│  │  │  └─ Clean formatting (tables, bullets)                 │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  RESPONSE & PERSISTENCE                                      │  │
│  │  ├─ Emit 'chat-response' to client                           │  │
│  │  ├─ Save user message to history (async)                     │  │
│  │  ├─ Save assistant response to history (async)               │  │
│  │  └─ Update user knowledge (if learned something new)         │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
                        ┌──────────────────────┐
                        │    FILE SYSTEM       │
                        │  memories/           │
                        │  ├─ *_history.json   │
                        │  └─ *_knowledge.json │
                        └──────────────────────┘
```

---

## 📝 Detailed Flow Breakdown

### 1️⃣ Connection Phase (WebSocket)

```javascript
// server.js
io.on('connection', async (socket) => {
    // 1.1 Extract credentials
    const token = socket.handshake.auth?.token;
    const tenantSchema = socket.handshake.query?.tenantSchema;
    
    // 1.2 Validate authentication
    if (!token || !tenantSchema) {
        socket.emit('error', { message: 'Authentication required' });
        socket.disconnect();
        return;
    }
    
    // 1.3 Build initial context
    const initialContext = {
        tenant: { schema: tenantSchema, name: 'LTECH ERP' },
        user: { id: token, username: 'user' }
    };
    
    // 1.4 AI generates session ID (COLD START)
    const sessionId = memoryManager.getSessionId(initialContext);
    // Result: "session_u1566482_sparepart_demo-token"
    
    // 1.5 Store in socket
    socket.data.sessionId = sessionId;
    socket.data.tenantSchema = tenantSchema;
    
    // 1.6 Notify client
    socket.emit('session-ready', { 
        sessionId, 
        message: 'Session initialized by AI' 
    });
    
    logger.ws.info('Session created by AI', { sessionId });
});
```

**Output:**
- ✅ Session ID generated: `session_u1566482_sparepart_demo-token`
- ✅ Client receives session ID
- ✅ Connection established

---

### 2️⃣ Message Processing Phase

```javascript
socket.on('chat-message', async (data) => {
    const { question } = data;
    const sessionId = socket.data.sessionId;
    
    // 2.1 Fast path for greetings
    const greeting = handleGreeting(question);
    if (greeting.isGreeting) {
        socket.emit('chat-response', {
            success: true,
            response: greeting.response,
            agent: 'general-assistant'
        });
        return;
    }
    
    // 2.2 Build full context
    const context = {
        tenant: { schema: tenantSchema, name: 'LTECH ERP' },
        user: { id: token, username: 'user' },
        roleCodes: ['MANAGER', 'FINANCE'], // From token
        sessionId,
        memory: {
            core: memoryManager.getCoreMemory(),     // CORE_MEMORY.md
            user: await memoryManager.getUserKnowledge(sessionId)
        }
    };
    
    // 2.3 Send progress update
    socket.emit('chat-progress', {
        step: 'processing',
        message: 'Memproses pertanyaan...'
    });
    
    // 2.4 Process through pipeline
    const result = await processMessage(question, context, {
        onProgress: (event) => socket.emit('chat-progress', event)
    });
    
    // 2.5 Send response
    socket.emit('chat-response', {
        success: result.success,
        response: result.response,
        agent: result.metadata?.agent,
        tool: result.metadata?.tool,
        sessionId
    });
    
    // 2.6 Persist to history (background)
    memoryManager.saveMessage(sessionId, {
        id: `msg_${Date.now()}_user`,
        role: 'user',
        content: question
    });
    
    memoryManager.saveMessage(sessionId, {
        id: `msg_${Date.now()}_assistant`,
        role: 'assistant',
        content: result.response,
        agent: result.metadata?.agent,
        tool: result.metadata?.tool
    });
});
```

---

### 3️⃣ Orchestrator Pipeline

```javascript
// core/orchestrator.js
export async function processMessage(question, context, options) {
    const startTime = Date.now();
    
    try {
        // STEP 1: ROUTER AGENT
        options.onProgress?.({
            step: 'routing',
            message: 'Menganalisis pertanyaan...'
        });
        
        const routerResult = await routerAgent.process(question, context);
        // Output: { targetAgent: 'finance-manager', confidence: 0.95 }
        
        // Check permissions
        const hasAccess = checkAgentAccess(
            context.roleCodes, 
            routerResult.targetAgent
        );
        
        if (!hasAccess) {
            return {
                success: false,
                response: 'Anda tidak memiliki akses ke fitur ini.'
            };
        }
        
        // STEP 2: SPECIALIST AGENT
        options.onProgress?.({
            step: 'executing',
            message: 'Mengambil data...'
        });
        
        const agent = getAgent(routerResult.targetAgent);
        const result = await agent.process(question, context);
        
        // STEP 3: SUMMARIZER (if needed)
        if (result.needsSummary) {
            options.onProgress?.({
                step: 'summarizing',
                message: 'Menyusun ringkasan...'
            });
            
            const summary = await summarizerAgent.process(
                result.response, 
                context
            );
            result.response = summary;
        }
        
        return {
            success: true,
            response: result.response,
            metadata: {
                agent: routerResult.targetAgent,
                tool: result.tool,
                duration: Date.now() - startTime
            }
        };
        
    } catch (error) {
        logger.error('Pipeline error', { error: error.message });
        return {
            success: false,
            response: 'Maaf, terjadi kesalahan dalam memproses permintaan Anda.'
        };
    }
}
```

---

### 4️⃣ Agent Processing (Finance Manager Example)

```javascript
// agents/finance-manager/index.js
class FinanceManagerAgent extends BaseAgent {
    async process(question, context) {
        // 4.1 Load memory
        const coreMemory = context.memory.core;
        const userKnowledge = context.memory.user;
        
        // 4.2 Detect intent & tool
        const intent = this.detectIntent(question);
        // Options: 'neraca', 'laba-rugi', 'saldo-kas', 'buku-besar'
        
        // 4.3 Parse parameters
        const params = this.parseParameters(question, userKnowledge);
        // { startDate: '2026-01-01', endDate: '2026-01-31' }
        
        // 4.4 Get tool
        const tool = this.tools[intent.tool];
        
        // 4.5 Execute tool
        const result = await tool.execute({
            tenantSchema: context.tenant.schema,
            ...params
        });
        
        // 4.6 Format response
        const formattedResponse = this.formatResponse(result, intent.tool);
        
        return {
            success: true,
            response: formattedResponse,
            tool: intent.tool,
            needsSummary: false
        };
    }
    
    detectIntent(question) {
        const q = question.toLowerCase();
        
        if (q.includes('neraca') || q.includes('balance sheet')) {
            return { tool: 'neraca', confidence: 0.95 };
        }
        if (q.includes('laba rugi') || q.includes('income')) {
            return { tool: 'laba-rugi', confidence: 0.95 };
        }
        if (q.includes('kas') || q.includes('cash')) {
            return { tool: 'saldo-kas', confidence: 0.9 };
        }
        if (q.includes('buku besar') || q.includes('ledger')) {
            return { tool: 'buku-besar', confidence: 0.9 };
        }
        
        return { tool: 'neraca', confidence: 0.5 }; // Default
    }
    
    parseParameters(question, userKnowledge) {
        const dateParser = new DateParser();
        const dates = dateParser.parse(question);
        
        return {
            startDate: dates.startDate || userKnowledge.defaultStartDate,
            endDate: dates.endDate || userKnowledge.defaultEndDate
        };
    }
    
    formatResponse(result, toolName) {
        if (!result.success || result.data.length === 0) {
            return 'Data tidak ditemukan untuk periode tersebut.';
        }
        
        // Format based on tool
        switch (toolName) {
            case 'neraca':
                return this.formatNeraca(result.data);
            case 'laba-rugi':
                return this.formatLabaRugi(result.data);
            // ... etc
        }
    }
}
```

---

### 5️⃣ Tool Execution (Neraca Example)

```javascript
// tools/neraca/index.js
class NeracaTool extends BaseTool {
    async execute(params) {
        const { tenantSchema, startDate, endDate } = params;
        
        // 5.1 Build SQL query
        const query = `
            SELECT 
                r.kode,
                r.nama,
                SUM(COALESCE(j.debit, 0) - COALESCE(j.kredit, 0)) as saldo
            FROM ${tenantSchema}.prive.rekening r
            LEFT JOIN ${tenantSchema}.prive.jurnal j ON r.kode = j.rek
            WHERE j.tgl BETWEEN $1 AND $2
            GROUP BY r.kode, r.nama
            ORDER BY r.kode
        `;
        
        // 5.2 Execute query
        const pool = getDatabasePool();
        const result = await pool.query(query, [startDate, endDate]);
        
        // 5.3 Format results
        const formatted = this.formatResult(result.rows);
        
        return {
            success: true,
            data: formatted,
            rowCount: result.rowCount
        };
    }
    
    formatResult(rows) {
        const neraca = {
            aktiva: { lancar: [], tetap: [] },
            pasiva: { hutang: [], modal: [] }
        };
        
        for (const row of rows) {
            const kategori = this.kategorikan(row.kode);
            neraca[kategori.jenis][kategori.sub].push({
                kode: row.kode,
                nama: row.nama,
                saldo: parseFloat(row.saldo)
            });
        }
        
        return neraca;
    }
}
```

---

## 🗂️ File Structure & Responsibility

```
server.js
├─ WebSocket connection handling
├─ Session ID generation (AI cold start)
├─ Message routing to orchestrator
└─ Response & history persistence

core/orchestrator.js
├─ Pipeline coordination
├─ Router → Specialist → Summarizer
├─ RBAC enforcement
└─ Error handling

core/memory-manager.js
├─ CORE_MEMORY loading (business rules)
├─ User knowledge management
├─ History persistence (CRUD)
└─ Session management

agents/*/index.js
├─ Intent detection
├─ Parameter parsing
├─ Tool selection & execution
└─ Response formatting

tools/*/index.js
├─ SQL query building
├─ Database execution
├─ Result formatting
└─ Schema validation

config/database.js
├─ Pool management
├─ Multi-tenant schema handling
└─ Connection health check

config/roles.js
├─ ROLE_AGENT_MAP
├─ DATA_ACCESS_RULES
└─ Permission checking
```

---

## ⏱️ Performance Metrics

### Typical Request Timeline

```
0ms     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        │ User sends message
        │
10ms    ├─ Message received by server
        │
15ms    ├─ Context built (user, roles, memory)
        │
50ms    ├─ Router agent analyzes intent
        │
55ms    ├─ Permission check (RBAC)
        │
100ms   ├─ Finance agent called
        │
150ms   ├─ Neraca tool executes SQL
        │  └─ Database query: 50ms
        │
200ms   ├─ Format response
        │
220ms   ├─ Send to client
        │
230ms   ├─ Save to history (async, non-blocking)
        │
250ms   └─ Update user knowledge (async)
```

**Target Latency:**
- Simple queries (greetings): < 50ms
- Tool-based queries: < 500ms
- Complex aggregations: < 2000ms

---

## 🔐 Security Flow

```
┌─────────────────────────────────────────────────────────────┐
│  1. Authentication (Connection)                              │
│     ├─ Validate PASETO token                                │
│     ├─ Extract user ID & tenant                             │
│     └─ Generate session ID                                  │
└─────────────────────────────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Authorization (Per Message)                              │
│     ├─ Load user roles from DB                              │
│     ├─ Check ROLE_AGENT_MAP                                 │
│     └─ Verify access to target agent                        │
└─────────────────────────────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Data Access Control                                      │
│     ├─ Apply DATA_ACCESS_RULES per role                     │
│     ├─ Filter SQL queries by schema                         │
│     └─ Mask sensitive fields (if needed)                    │
└─────────────────────────────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Rate Limiting                                            │
│     ├─ Track requests per tenant                            │
│     └─ Apply limits (e.g., 100 req/min)                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Error Handling Strategy

```javascript
try {
    // Main pipeline
    const result = await processMessage(question, context);
    
} catch (error) {
    // Error hierarchy
    if (error instanceof AuthenticationError) {
        return { success: false, error: 'Please login again' };
    }
    
    if (error instanceof PermissionError) {
        return { success: false, error: 'Access denied' };
    }
    
    if (error instanceof DatabaseError) {
        logger.error('DB error', { error });
        return { success: false, error: 'Data unavailable' };
    }
    
    if (error instanceof ToolExecutionError) {
        logger.error('Tool error', { error });
        return { success: false, error: 'Failed to process request' };
    }
    
    // Generic error
    logger.error('Unknown error', { error });
    return { success: false, error: 'Internal server error' };
}
```

---

## 📊 Memory & Context Flow

```
┌────────────────────────────────────────────────────────┐
│  CORE_MEMORY (Global - All Agents)                     │
│  ├─ Anti-hallucination protocol                        │
│  ├─ SQL safety rules (COALESCE, NULL handling)         │
│  ├─ Business terminology (Indonesian)                  │
│  └─ Data validation rules                              │
└────────────────────────────────────────────────────────┘
                        +
┌────────────────────────────────────────────────────────┐
│  USER_KNOWLEDGE (Session-Specific)                     │
│  ├─ Preferred date format                              │
│  ├─ Default period selection                           │
│  ├─ Frequent queries                                   │
│  └─ Last used parameters                               │
└────────────────────────────────────────────────────────┘
                        =
┌────────────────────────────────────────────────────────┐
│  AGENT CONTEXT (Per Request)                           │
│  ├─ User info (ID, name, roles)                        │
│  ├─ Tenant schema                                      │
│  ├─ Session ID                                         │
│  ├─ Combined memory (CORE + USER)                      │
│  └─ Request metadata                                   │
└────────────────────────────────────────────────────────┘
```

---

## 🚀 Deployment Workflow

```bash
# 1. Start services with PM2
pm2 start ecosystem.config.cjs

# 2. Check health
curl http://localhost:8899/api/health

# 3. Test WebSocket connection
# Open browser: http://localhost:5174

# 4. Monitor logs
pm2 logs multi-agent-backend

# 5. View metrics
pm2 monit
```

---

## 📈 Monitoring & Observability

```javascript
// Key metrics to track
{
    "requests_total": 1234,
    "requests_per_minute": 45,
    "average_latency_ms": 250,
    "error_rate": 0.02,
    "active_sessions": 12,
    "tools_called": {
        "neraca": 450,
        "laba-rugi": 320,
        "saldo-kas": 280
    },
    "agent_usage": {
        "finance-manager": 850,
        "sales-manager": 200,
        "inventory-manager": 184
    }
}
```

---

## 🎯 Next Steps

- [ ] Add LLM integration (Gemini/Qwen CLI)
- [ ] Implement rate limiting per tenant
- [ ] Add request/response caching
- [ ] Implement conversation context window
- [ ] Add streaming responses for LLM
- [ ] Performance profiling & optimization

---

**Status:** ✅ Production Ready  
**Last Updated:** 9 Januari 2026  
**Version:** 2.0.0
