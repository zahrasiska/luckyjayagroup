# Schema Validation - Quick Reference Card

## 🚨 CRITICAL RULE

**ALWAYS send `tenantSchema` in every request. No exceptions!**

---

## ✅ Correct Usage

### WebSocket (Socket.IO)
```javascript
socket.emit('chat-message', {
    question: "Berapa penjualan hari ini?",
    tenantSchema: "u1566482_sparepart",  // ← REQUIRED!
    userId: "user123",
    userRole: "admin",
    sessionId: "optional-session-id"
});
```

### REST API (Legacy)
```javascript
fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        question: "Berapa penjualan hari ini?",
        tenantSchema: "u1566482_sparepart",  // ← REQUIRED!
        userId: "user123",
        userRole: "admin"
    })
});
```

---

## ❌ WRONG - Will Error

```javascript
// Missing tenantSchema
socket.emit('chat-message', {
    question: "Berapa penjualan?",
    userId: "user123"
    // ❌ Error: "tenantSchema is required"
});
```

---

## 📋 Valid Schema Values

### Full Names (Recommended)
```javascript
"u1566482_sparepart"  // Sparepart module
"u1566482_leontech"   // Leontech module
```

### Short Names (Auto-normalized)
```javascript
"sparepart"  // → normalized to "u1566482_sparepart"
"leontech"   // → normalized to "u1566482_leontech"
```

---

## 🔍 Error Messages

### Missing Schema
```
Error: "tenantSchema is required but not provided. Please select a tenant schema."
```
**Fix:** Add `tenantSchema` to your request payload

### Table Not Found
```
Error: "relation 'brgmerk' does not exist"
```
**Fix:** Check schema name is correct

---

## 🐛 Debugging

### Check Logs
```bash
# View schema validation in logs
pm2 logs ltech-multi-agent --lines 50 | grep "Schema"

# Look for these lines:
# ✅ 🔍 [START SESSION] Schema: u1566482_sparepart
# ✅ 🔧 [ENV] PGSCHEMA="u1566482_sparepart,prive,public"
# ⚠️ 📝 Schema normalized: "sparepart" → "u1566482_sparepart"
```

### Test Schema in Database
```sql
-- Verify table exists in schema
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'u1566482_sparepart' 
AND table_name = 'brgmerk';
```

---

## 💡 Pro Tips

1. **Always Validate**: Check schema is selected before sending request
2. **Use Full Names**: Prefer `u1566482_sparepart` over `sparepart`
3. **Monitor Logs**: Watch for normalization messages
4. **Test First**: Try simple queries when testing new schema

---

## 📞 Quick Commands

```bash
# Restart service
pm2 restart ltech-multi-agent

# View logs
pm2 logs ltech-multi-agent

# Check status
pm2 status ltech-multi-agent

# Test validation
node test-schema-validation.js
```

---

## 🔗 Related Docs

- Full details: `SCHEMA_VALIDATION_FIX.md`
- Changelog: `CHANGELOG.md`
- README: `README.md`

---

**Version:** 1.3.0  
**Updated:** Jan 8, 2025