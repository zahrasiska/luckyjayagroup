# Implementation Plan: Fix Session Continuation in Olik

## Problem Statement

Session continuation using `-s <session-id>` or `-c` flags is not working in `olik` because:

1. **Kilocode Limitation**: The `--continue` flag **cannot be combined with `--auto` mode**
2. **Current Implementation**: `olik` uses `--auto -j` flags which prevent session continuation
3. **User Requirement**: User needs session continuation to maintain conversation context

## Root Cause

From Kilocode documentation:
> "Cannot be combined with --auto mode"
> "Cannot be used with a prompt argument"

Our current command:
```bash
kilo -mo x-ai/grok-code-fast-1 --yolo -m ask -a -j "$PROMPT"
```

The `-a` (--auto) flag **blocks** session continuation.

## Proposed Solution

### Option 1: Detect Session Flags and Switch Mode (RECOMMENDED)

When user provides `-c` or `-s <id>`, use **different execution strategy**:

1. **For new conversations** (no `-c` or `-s`):
   - Use current approach: `--auto -j` for clean JSON output
   
2. **For continuation** (with `-c` or `-s`):
   - Use **stdin piping** to interactive mode
   - Capture output differently
   - Parse response from interactive session

### Option 2: Always Use Interactive Mode with Stdin

Change `olik` to always use interactive mode with stdin piping, which supports continuation.

## Proposed Changes

### [MODIFY] [olik](file:///home/luckyjayagroup/ltech/olik)

**Changes:**
1. Detect if user provided `-c` or `-s` flags
2. If continuation flags detected:
   - Remove `--auto` and `-j` from default params
   - Use stdin piping: `echo "$PROMPT" | kilo -c`
   - Parse output differently (from interactive mode)
3. If no continuation:
   - Keep current behavior with `--auto -j`

**Implementation:**
```bash
# Detect continuation flags
HAS_CONTINUE=false
HAS_SESSION=false
for opt in "${KILO_OPTIONS[@]}"; do
    if [[ "$opt" == "-c" || "$opt" == "--continue" ]]; then
        HAS_CONTINUE=true
    elif [[ "$opt" == "-s" || "$opt" == "--session" ]]; then
        HAS_SESSION=true
    fi
done

# Choose execution mode
if [ "$HAS_CONTINUE" = true ] || [ "$HAS_SESSION" = true ]; then
    # Interactive mode with stdin
    echo "$PROMPT" | kilo "${KILO_OPTIONS[@]}" > "$TEMP_OUTPUT" 2>&1
else
    # Autonomous mode (current)
    kilo "${DEFAULT_PARAMS[@]}" "${KILO_OPTIONS[@]}" "$PROMPT" > "$TEMP_OUTPUT" 2>&1
fi
```

## Verification Plan

### Automated Tests

1. **Test continuation without session**:
   ```bash
   # First query
   SESSION_ID=$(olik --output-json "test query 1" | jq -r '.session.id')
   
   # Continue with -c
   olik -c "follow up question"
   # Should reference previous context
   ```

2. **Test continuation with session ID**:
   ```bash
   # Use session from previous test
   olik -s "$SESSION_ID" "another follow up"
   # Should maintain context
   ```

3. **Test that non-continuation still works**:
   ```bash
   olik "standalone query"
   # Should work as before
   ```

### Manual Verification

User should test:
1. Run initial query and note session ID
2. Use `-c` to continue conversation
3. Verify AI remembers previous context
4. Use `-s <session-id>` to resume specific session
5. Verify context is maintained

## Risks & Considerations

1. **Interactive mode output parsing**: May be more complex than JSON mode
2. **Performance**: Interactive mode might be slower
3. **Backward compatibility**: Need to ensure existing usage still works

## Alternative Approach

If stdin piping doesn't work well, we could:
- Create separate command `olikc` (olik-continue) for continuation
- Document limitation and suggest using `kilo` directly for long conversations
