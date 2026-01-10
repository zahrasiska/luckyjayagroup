# Changelog

All notable changes to the Multi-Agent Pipeline will be documented in this file.

## [1.3.7] - 2025-01-08

### 🎯 CRITICAL FIX: Laba Rugi Structure & Number Formatting

#### Problem
1. **Incomplete Laba Rugi Query:**
   - Used `r.klas IN (4, 5)` which only captures 2 categories
   - Missing categories: Pengeluaran Operasional (6), Non Operasional (7), Pendapatan Lain (8), Pengeluaran Lain (9)
   - Should use `sk.noklasifikasi > 3` to get all income/expense accounts (4-9)

2. **Wrong Number Format:**
   - Summarizer displayed "Rp 65,76 trilun" for Rp 65.295.980.417 (should be "Rp 65,29 miliar")
   - Displayed "Rp 13,76 trilun" for Rp 13.762.241.933 (should be "Rp 13,76 miliar")
   - Wrong digit counting and scale conversion

#### Root Cause
- Finance knowledge base had incorrect query structure for Laba Rugi
- Missing JOIN with `prive.subklas` to access `noklasifikasi`
- Summarizer lacked strict rules for number scale validation (juta/miliar/trilun)
- No digit counting validation before output

#### Solution Implemented

**1. Fixed Laba Rugi Query Structure**

Updated query to use proper klasifikasi:
```sql
-- OLD (WRONG):
WHERE r.klas IN (4, 5)

-- NEW (CORRECT):
FROM j
JOIN prive.rekening r ON j.idrekening = r.kode
JOIN prive.subklas sk ON r.nosubklasifikasi = sk.nosubklasifikasi
WHERE sk.noklasifikasi > 3
```

Now captures all 6 categories:
- 4: Pendapatan (Sales Income)
- 5: Biaya atas Pendapatan (Cost of Sales)
- 6: Pengeluaran Operasional (Operating Expense)
- 7: Pengeluaran Non Operasional (Non Operating Expense)
- 8: Pendapatan Lain (Other Income)
- 9: Pengeluaran Lain (Other Expense)

**2. Added Number Formatting Validation**

Added strict rules to summarizer:
- Digit counting: 9 digits = juta, 10-11 = miliar, 12+ = trilun
- Validation examples for common mistakes
- Auto-warning if "trilun" used with numbers < 1000
- Double-check checklist before output

**3. Enhanced CORE_MEMORY Documentation**

Added comprehensive Chart of Accounts structure:
- Table of all 9 classifications
- JOIN patterns with subklas
- Formula for Laba Rugi calculation
- Clear separation: Neraca (≤3) vs Laba Rugi (>3)

#### Files Modified
- `agents/summarizer.js`: Added number formatting rules and validation
- `knowledge/finance-manager/QWEN.md`: Updated Laba Rugi query with correct structure
- `knowledge/CORE_MEMORY.md`: Added Section 2 - Struktur Klasifikasi Akun (1-9)

### 🔒 CRITICAL FIX: Schema Search Path

#### Problem
- Queries returning data from wrong schema (e.g., getting DENSO/BOSCH from sparepart when using leontech schema)
- MCP server `ltech-db` hardcoded with default schema `u1566482_sparepart,public`
- Environment variable `PGSCHEMA` set correctly but not effective due to MCP server already running with old schema
- First query in new session sometimes uses wrong schema despite correct tenant selection

#### Root Cause
- MCP PostgreSQL server launched with hardcoded schema in Qwen config
- `qwen mcp list` shows: `ltech-db: ... u1566482_sparepart,public`
- PostgreSQL connection maintains `search_path` from initial connection
- Changing `PGSCHEMA` environment variable doesn't affect already-connected MCP server
- No explicit `SET search_path` executed before queries

#### Solution Implemented

**1. Force SET search_path Before Every Query**

Added critical instruction to specialist agents:
```javascript
🔴 CRITICAL DATABASE SCHEMA RULE:
BEFORE EVERY QUERY, you MUST execute this command first:
SET search_path TO ${session.tenantSchema}, prive, public;

Then execute your actual query.
```

This ensures every query runs with correct schema regardless of MCP server's initial configuration.

**2. Removed Hardcoded Schema References**

- Updated `knowledge-loader.js` to remove hardcoded `u1566482_sparepart` mention
- Changed to: "Schema will be set dynamically based on user's tenant"

**3. Enhanced Specialist Prompt**

Added explicit example in prompt:
```
Step 1: SET search_path TO u1566482_leontech, prive, public;
Step 2: SELECT * FROM brgmerk WHERE deleted_at IS NULL;
```

#### Files Modified

1. **specialist-base.js**
   - Added `SET search_path` instruction in buildPrompt()
   - Made it prominent with 🔴 marker
   - Included example usage
   - Warning about consequences of skipping

2. **knowledge-loader.js**
   - Removed hardcoded `u1566482_sparepart` reference
   - Updated to dynamic schema message

#### How It Works

**Before (Broken):**
```
User selects leontech schema
  ↓
Backend sets PGSCHEMA=u1566482_leontech
  ↓
Qwen calls MCP tool
  ↓
MCP uses default search_path (u1566482_sparepart) ❌
  ↓
Query returns wrong data (DENSO, BOSCH from sparepart)
```

**After (Fixed):**
```
User selects leontech schema
  ↓
Backend sets PGSCHEMA=u1566482_leontech
  ↓
Specialist prompt includes: SET search_path TO u1566482_leontech...
  ↓
Qwen executes: SET search_path TO u1566482_leontech, prive, public;
  ↓
Qwen executes actual query
  ↓
Query returns correct data from leontech schema ✅
```

#### Testing

**Test Case 1: Leontech Schema**
```
Schema: u1566482_leontech
Query: "Tampilkan penjualan bulan lalu per merk"
Expected: Data from leontech schema only
Result: ✅ PASS
```

**Test Case 2: Sparepart Schema**
```
Schema: u1566482_sparepart
Query: "Tampilkan penjualan bulan lalu per merk"
Expected: Data from sparepart schema (DENSO, BOSCH, etc)
Result: ✅ PASS
```

**Test Case 3: Session Continuation**
```
Session 1: leontech schema
Session 2: Same session, different query
Expected: Still uses leontech schema
Result: ✅ PASS (SET search_path executed each time)
```

#### Benefits

- ✅ Guarantees correct schema usage regardless of MCP server config
- ✅ Works with session continuation
- ✅ No need to restart MCP server when switching schemas
- ✅ Explicit and visible in Qwen's tool calls
- ✅ Self-documenting (SET search_path visible in logs)

#### Related Issues

- Fixed: Queries returning data from wrong tenant
- Fixed: First query in new session using default schema
- Fixed: Schema confusion between leontech and sparepart modules

---

## [1.3.1] - 2025-01-08

### 🎨 UI/UX Improvements: Progress Tracker

#### Changes

**1. Moved Progress Tracker to Chat Message Card**
- Relocated progress indicator from top of chat container to inside loading message card
- Better visual integration with chat flow
- More intuitive user experience

**2. Fixed "Final Summarizing" Not Showing Completed**
- Added `complete` event emission after pipeline finishes
- Updated status logic to mark all steps as completed when receiving `summarizing_complete` or `complete` event
- Added visual "✓ Proses Selesai" indicator when all steps completed

**3. Added Delay Before Clearing Progress**
- Added 1.5 second delay before clearing progress tracker
- Allows users to see completed state before it disappears
- Improved user feedback

#### Visual Changes

**Before:**
```
┌─────────────────────────────┐
│ Progress Tracker (top)       │ ← Separate from messages
├─────────────────────────────┤
│ Messages...                  │
│ [User message]              │
│ [AI response]               │
│ Loading...                  │
└─────────────────────────────┘
```

**After:**
```
┌─────────────────────────────┐
│ Messages...                  │
│ [User message]              │
│ [AI response]               │
│ ┌─────────────────────────┐ │
│ │ ✓ Routing & Analysis    │ │ ← Inside message card
│ │ ✓ Specialist Thinking   │ │
│ │ ✓ Final Summarizing     │ │
│ │ ✓ Proses Selesai        │ │
│ │ Loading...              │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

#### Files Modified

1. **index.html** (Frontend)
   - Moved `<ProgressTracker>` from messages-container to inside loading message card
   - Updated `getStatusClass()` logic to handle completion states
   - Added "Proses Selesai" indicator
   - Added 1.5s delay before clearing progress on success

2. **pipeline-orchestrator.js** (Backend)
   - Added `complete` event emission after pipeline finishes
   - Ensures frontend receives final completion signal

#### Benefits

- ✅ Better visual hierarchy - progress integrated with loading state
- ✅ Users can now see all steps marked as completed
- ✅ Clear indication when processing is done
- ✅ More polished user experience

---

## [1.3.0] - 2025-01-08

### 🔒 CRITICAL SECURITY FIX: Schema Validation

#### Problem
- Intermittent "table not found" errors (e.g., `brgmerk` table)
- Schema sometimes defaulted to incorrect values (`sparepart` instead of `u1566482_sparepart`)
- No validation when schema was missing from requests

#### Root Cause
- Default schema values allowed missing schemas to pass silently
- Frontend sometimes sent `sparepart` instead of full schema name
- No normalization of schema variations

#### Solution Implemented

**1. Removed All Default Schemas**
- `qwen-wrapper.js`: Removed `tenantSchema = "u1566482_sparepart"` defaults
- `pipeline-orchestrator.js`: Made `tenantSchema` required parameter
- `server.js`: Added validation in WebSocket handler

**2. Added Schema Validation**
```javascript
// Pipeline now throws error if schema missing
if (!tenantSchema) {
    throw new Error("tenantSchema is required!");
}
```

**3. Schema Normalization**
```javascript
normalizeSchema(schema) {
    // Maps common variations to correct schema
    "sparepart" → "u1566482_sparepart"
    "leontech"  → "u1566482_leontech"
}
```

**4. Enhanced Logging**
```
🔍 [START SESSION] Schema: u1566482_sparepart
🔧 [ENV] PGSCHEMA="u1566482_sparepart,prive,public"
📝 Schema normalized: "sparepart" → "u1566482_sparepart"
```

### Breaking Changes

⚠️ **Frontend MUST now provide `tenantSchema`**

**Before (would use default):**
```javascript
socket.emit('chat-message', {
    question: "Berapa penjualan?"
});
```

**After (required):**
```javascript
socket.emit('chat-message', {
    question: "Berapa penjualan?",
    tenantSchema: "u1566482_sparepart"  // REQUIRED!
});
```

### Files Modified

1. **qwen-wrapper.js**
   - Removed default schema values
   - Added `normalizeSchema()` method
   - Enhanced logging for schema tracking

2. **pipeline-orchestrator.js**
   - Added strict schema validation at entry point
   - Improved error messages
   - Enhanced logging with schema info

3. **server.js**
   - Added WebSocket schema validation
   - Return error if schema missing
   - Formatted code with Prettier

4. **README.md**
   - Added schema validation documentation
   - Troubleshooting guide
   - Updated examples

### Testing

✅ Test with valid schema:
```javascript
{
    question: "Siapa 3 pelanggan terbesar?",
    tenantSchema: "u1566482_sparepart",
    userId: "user123",
    userRole: "admin"
}
// Expected: Query executes correctly
```

✅ Test with schema variation:
```javascript
{
    question: "Siapa 3 pelanggan terbesar?",
    tenantSchema: "sparepart",  // Will be normalized
    userId: "user123",
    userRole: "admin"
}
// Expected: Normalized to "u1566482_sparepart", query executes
```

❌ Test without schema:
```javascript
{
    question: "Siapa 3 pelanggan terbesar?",
    // Missing tenantSchema
    userId: "user123",
    userRole: "admin"
}
// Expected: Error returned immediately
```

### Deployment

```bash
# Restart service
pm2 restart ltech-multi-agent

# Verify logs
pm2 logs ltech-multi-agent --lines 50

# Check for schema validation messages
# Should see: 🔍 [START SESSION] Schema: u1566482_sparepart
```

### Migration Guide

**For Frontend Developers:**

1. Update all WebSocket emissions to include `tenantSchema`
2. Ensure schema selector dropdown is working
3. Test all chat flows with schema validation

**For Backend Developers:**

1. Never add default schema values back
2. Always pass schema through the call chain
3. Monitor logs for normalization messages

### Impact

- ✅ Eliminates "table not found" errors
- ✅ Prevents wrong schema access
- ✅ Better debugging with enhanced logs
- ✅ Forces explicit schema selection
- ⚠️ Requires frontend update

### Related Issues

- Fixed intermittent `brgmerk` table not found errors
- Resolved schema mismatch between sessions
- Improved error messages for troubleshooting

---

## [1.2.0] - 2024-12-XX

### Added
- WebSocket support with Socket.IO
- Real-time progress updates
- Voice response generation
- File upload capability

### Changed
- Migrated from REST-only to WebSocket-first
- Improved session management with Redis

---

## [1.1.0] - 2024-11-XX

### Added
- Multi-agent pipeline architecture
- Router, Specialist, Summarizer agents
- Redis session management
- Qwen CLI integration

### Initial Release
- Sales Manager agent
- Finance Manager agent
- Inventory Manager agent
- Memory Manager agent
- General Assistant agent