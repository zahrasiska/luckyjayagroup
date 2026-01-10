#!/bin/bash
# Comprehensive Speed & Cost Benchmark
# Testing all available FREE models (0x cost)

echo "🚀 COMPREHENSIVE MODEL BENCHMARK"
echo "Testing FREE models (0x cost) from screenshot"
echo "============================================="

# Array of models to test (FREE models only)
models=(
    "gpt-4.1"
    "gpt-4o"
    "gpt-5-mini"
    "grok-code-fast-1"
    "raptor-mini"
)

# Test query
query="Berapa 2+2?"

# Results array
declare -A times
declare -A costs

# Run tests
for model in "${models[@]}"; do
    echo -e "\n📊 Testing ${model}..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    START=$(date +%s%3N)
    
    # Try to run the model, skip if not available
    if copilot -p "$query" --model "$model" 2>&1; then
        END=$(date +%s%3N)
        elapsed=$((END - START))
        times[$model]=$elapsed
        
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "⏱️  Time: ${elapsed}ms"
    else
        echo "❌ Model not available: $model"
        times[$model]=999999
    fi
    
    sleep 1  # Cooldown between tests
done

# Summary
echo -e "\n\n============================================="
echo "📈 SPEED RANKING (Fastest to Slowest):"
echo "============================================="

# Sort by time
for model in "${!times[@]}"; do
    echo "${times[$model]} $model"
done | sort -n | while read time model; do
    if [ "$time" != "999999" ]; then
        printf "   %-25s %6dms\n" "$model" "$time"
    fi
done

# Find fastest
fastest_time=999999
fastest_model=""
for model in "${!times[@]}"; do
    if [ "${times[$model]}" -lt "$fastest_time" ]; then
        fastest_time=${times[$model]}
        fastest_model=$model
    fi
done

echo "============================================="
echo "🏆 FASTEST: ${fastest_model} (${fastest_time}ms)"
echo "============================================="
echo ""
echo "💡 All tested models are FREE (0x Premium cost)"
echo "💡 Choose based on speed + quality for your use case"
