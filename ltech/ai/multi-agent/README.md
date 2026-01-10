# Multi-Agent Pipeline - Session Management

## ⚠️ CRITICAL: Schema Validation (Updated Jan 2025)

### Strict Schema Requirements

Starting from version 1.3.0, **tenantSchema is REQUIRED** for all requests. No default values are provided to prevent accidental data access to wrong schemas.

#### Changes Made:
1. ✅ **No Default Schema**: Removed all default `tenantSchema` values
2. ✅ **Validation Added**: Pipeline will error if schema not provided
3. ✅ **Schema Normalization**: Automatic mapping of common schema variations
4. ✅ **Enhanced Logging**: Every request logs the schema being used

#### Schema Mapping:
```javascript
// Normalized automatically:
"sparepart" → "u1566482_sparepart"
"leontech"  → "u1566482_leontech"
```

#### Error Handling:
```javascript
// ❌ This will ERROR:
socket.emit('chat-message', {
    question: "Berapa penjualan?",
    // Missing tenantSchema - will return error
});

// ✅ This is CORRECT:
socket.emit('chat-message', {
    question: "Berapa penjualan?",
    tenantSchema: "u1566482_sparepart", // REQUIRED
    userId: "user123",
    userRole: "admin"
});
```

#### Logs to Monitor:
```
🔍 [START SESSION] Schema: u1566482_sparepart
🔧 [ENV] PGSCHEMA="u1566482_sparepart,prive,public", DB_NAME="luckyjayagroup"
```

If you see schema normalization:
```
📝 Schema normalized: "sparepart" → "u1566482_sparepart"
```

## Session Integration dengan Qwen

### Flow

```
User Request
    ↓
[Qwen creates/resumes session] ← SESSION ID dari Qwen
    ↓
[Redis stores session metadata] ← Link to Qwen session
    ↓
[Multi-agent pipeline executes]
    ↓
[Results stored in Redis + Qwen session]
```

### Key Points

1. **Session ID Source:** Qwen CLI creates session ID
   - Tidak auto-generate UUID
   - Menggunakan Qwen's native session system
   - Session di-store di `~/.qwen/projects/[project]/sessions/[sessionId]`

2. **Redis Role:** 
   - Stores metadata (userId, userRole, tenantSchema)
   - Tracks agent execution history
   - Fast context lookup for routing

3. **Qwen Session Role:**
   - Actual conversation history
   - Model context window
   - Native session management (--continue, --resume)

## Usage Examples

### Example 1: Start New Conversation

```javascript
const QwenWrapper = require('./qwen-wrapper');
const SessionManager = require('./session-manager');

const qwen = new QwenWrapper();
const sessionMgr = new SessionManager();

// Start new chat with Qwen
const result = await qwen.startSession(
  "Berapa penjualan Merk Fukuyama 2025?",
  { tenantSchema: 'u1566482_sparepart' }
);

// Store session in Redis
await sessionMgr.createOrResumeSession(
  result.sessionId,      // From Qwen
  'user123',             // User ID
  'CEO',                 // User role
  'u1566482_sparepart'   // Tenant
);

console.log('Session ID:', result.sessionId);
console.log('Response:', result.output);
```

### Example 2: Continue Conversation

```javascript
// User asks follow-up question
const qwenSessionId = 'abc-123'; // From previous response

// Continue Qwen session
const result = await qwen.continueSession(
  qwenSessionId,
  "Bagaimana perbandingannya dengan tahun lalu?"
);

// Update Redis metadata
await sessionMgr.addToHistory(
  qwenSessionId,
  'sales-manager',
  'Follow-up question',
  result.output
);
```

### Example 3: Multi-Agent Pipeline

```javascript
// 1. User question
const userQuestion = "Penjualan Merk Fukuyama 2025?";

// 2. Start Qwen session (Router)
const routerResult = await qwen.startSession(
  `${routerPrompt}\n\nUser: ${userQuestion}`,
  { tenantSchema }
);

const qwenSessionId = routerResult.sessionId;

// 3. Create Redis session
await sessionMgr.createOrResumeSession(
  qwenSessionId,
  userId,
  userRole,
  tenantSchema
);

// 4. Continue session with Specialist
const specialistResult = await qwen.continueSession(
  qwenSessionId,
  `${salesManagerPrompt}\n\n${routerResult.output}`
);

// 5. Continue session with Summarizer
const summaryResult = await qwen.continueSession(
  qwenSessionId,
  `${summarizerPrompt}\n\n${specialistResult.output}`
);

// 6. Final response
console.log(summaryResult.output);
```

## Benefits

✅ **Native Qwen Integration:**
- Leverage Qwen's session management
- Use --continue and --resume flags
- Access full conversation history via Qwen

✅ **Redis for Performance:**
- Fast metadata lookup
- Agent execution tracking
- Custom context storage

✅ **Best of Both Worlds:**
- Qwen handles AI conversation flow
- Redis handles business logic metadata
- Clean separation of concerns

## Session Data Structure

### In Redis
```json
{
  "id": "qwen-session-abc123",
  "qwenSessionId": "abc123",
  "userId": "user123",
  "userRole": "CEO",
  "tenantSchema": "u1566482_sparepart",
  "context": {
    "routing": {...},
    "agentUsed": "sales-manager"
  },
  "history": [
    {
      "agent": "router",
      "input": "...",
      "output": "...",
      "timestamp": "..."
    }
  ]
}
```

### In Qwen Session (~/.qwen/projects/...)
```
- Full conversation turns
- Model responses
- Tool calls (MCP)
- Token usage
```

## API Integration

```javascript
// Express route
app.post('/api/chat', async (req, res) => {
  const { question, sessionId, tenantSchema } = req.body;
  
  let qwenSessionId = sessionId;
  
  if (!qwenSessionId) {
    // New conversation
    const result = await qwen.startSession(question, { tenantSchema });
    qwenSessionId = result.sessionId;
    
    await sessionMgr.createOrResumeSession(
      qwenSessionId,
      req.user.id,
      req.user.role,
      tenantSchema
    );
  } else {
    // Continue conversation
    const result = await qwen.continueSession(qwenSessionId, question);
  }
  
  res.json({
    sessionId: qwenSessionId,
    response: result.output,
  });
});
```

## Notes

1. **Session Persistence:** Qwen sessions persist in filesystem, Redis session expires after 24h
2. **Resume Capability:** Can resume old Qwen sessions even if Redis expired
3. **Cleanup:** Redis TTL handles automatic cleanup, Qwen sessions managed separately
4. **Schema Validation:** Always verify `tenantSchema` is sent from frontend to prevent data access errors

## Troubleshooting

### "Table not found" Errors

If you encounter errors like "table brgmerk not found", check:

1. **Schema is provided**: Check frontend is sending `tenantSchema`
2. **Schema is correct**: Verify the schema name matches database schema
3. **Check logs**: Look for schema normalization messages
4. **WebSocket data**: Ensure all socket.emit includes tenantSchema

```javascript
// Frontend must send:
{
    question: "...",
    tenantSchema: "u1566482_sparepart",  // Required!
    userId: "...",
    userRole: "..."
}
```

### PM2 Management

```bash
# Restart after code changes
pm2 restart ltech-multi-agent

# View logs
pm2 logs ltech-multi-agent --lines 50

# Monitor status
pm2 status
```
