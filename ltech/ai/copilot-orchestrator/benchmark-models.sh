#!/bin/bash
# Speed test: claude-haiku-4.5 vs gpt-5-mini (with cost info)

echo "🚀 SPEED TEST: Model Comparison (with Cost)"
echo "============================================="

# Test 1: claude-haiku-4.5
echo -e "\n📊 Testing claude-haiku-4.5..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
START=$(date +%s%3N)
copilot -p "Berapa 2+2?" --model claude-haiku-4.5
END=$(date +%s%3N)
HAIKU_TIME=$((END - START))
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⏱️  Time: ${HAIKU_TIME}ms"

# Test 2: gpt-5-mini (current)
echo -e "\n\n📊 Testing gpt-5-mini (current)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
START=$(date +%s%3N)
copilot -p "Berapa 2+2?" --model gpt-5-mini
END=$(date +%s%3N)
GPT_TIME=$((END - START))
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⏱️  Time: ${GPT_TIME}ms"

# Test 3: claude-sonnet-4.5 (balance)
echo -e "\n\n📊 Testing claude-sonnet-4.5 (balance)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
START=$(date +%s%3N)
copilot -p "Berapa 2+2?" --model claude-sonnet-4.5
END=$(date +%s%3N)
SONNET_TIME=$((END - START))
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⏱️  Time: ${SONNET_TIME}ms"

# Summary
echo -e "\n\n============================================="
echo "📈 SPEED SUMMARY:"
echo "   claude-haiku-4.5:   ${HAIKU_TIME}ms 🚀"
echo "   claude-sonnet-4.5:  ${SONNET_TIME}ms ⚖️"
echo "   gpt-5-mini:         ${GPT_TIME}ms 🐌"
echo "============================================="

# Winner
if [ $HAIKU_TIME -lt $GPT_TIME ]; then
    SPEEDUP=$(awk "BEGIN {printf \"%.1fx\", $GPT_TIME/$HAIKU_TIME}")
    echo "🏆 FASTEST: claude-haiku-4.5 (${SPEEDUP} faster than gpt-5-mini)"
else
    echo "🏆 FASTEST: gpt-5-mini"
fi

echo -e "\n💡 Note: Copilot shows cost at the end of each test above"
