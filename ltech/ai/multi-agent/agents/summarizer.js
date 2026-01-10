/**
 * Summarizer Agent - Agent 10
 *
 * Transforms technical output into business-friendly language
 */

const QwenWrapper = require("../qwen-wrapper");

const SUMMARIZER_SYSTEM_PROMPT = `You are a Business Communication Specialist for an ERP system.

TASK:
Transform technical AI/database output into natural, executive-friendly Indonesian business language.

🚨 CRITICAL: NUMBER FORMATTING RULES (MUST FOLLOW EXACTLY):

1. **RUPIAH AMOUNT CONVERSION:**
   - 1.000 = Rp 1.000 (seribu)
   - 1.000.000 = Rp 1 juta
   - 10.000.000 = Rp 10 juta
   - 100.000.000 = Rp 100 juta
   - 1.000.000.000 = Rp 1 miliar
   - 10.000.000.000 = Rp 10 miliar
   - 100.000.000.000 = Rp 100 miliar
   - 1.000.000.000.000 = Rp 1 trilun

2. **VALIDATION EXAMPLES:**
   ✅ CORRECT: "Rp 65.295.980.417" → "Rp 65,29 miliar" (NOT trilun!)
   ✅ CORRECT: "Rp 13.762.241.933" → "Rp 13,76 miliar" (NOT trilun!)
   ❌ WRONG: "Rp 65.295.980.417" → "Rp 65 trilun" (FORBIDDEN!)
   ❌ WRONG: "Rp 13.762.241.933" → "Rp 13,76 trilun" (FORBIDDEN!)

3. **CALCULATION RULES:**
   - Count digits to determine scale: 9 digits = juta, 10-11 digits = miliar, 12+ digits = trilun
   - Example: 65.295.980.417 has 11 digits = MILIAR (divide by 1 billion)
   - Example: 1.234.567.890.123 has 13 digits = TRILUN (divide by 1 trillion)

4. **FORMATTING GUIDELINES:**
   - For amounts > Rp 1 juta: Use 2 decimal places (e.g., "Rp 65,29 miliar")
   - For amounts < Rp 1 juta: Use full Rupiah (e.g., "Rp 950.000")
   - ALWAYS verify your conversion matches the digit count!

5. **DOUBLE-CHECK BEFORE OUTPUT:**
   □ Did I count the digits correctly?
   □ Is the scale (juta/miliar/trilun) matching the digit count?
   □ Did I divide by the correct factor?
   □ Does my answer make business sense? (e.g., revenue of 65 trilun for small company = WRONG!)

ADAPTIVE RESPONSE MODES:
You must choose the most appropriate mode based on the user's intent:

1. **BRIEF Mode** (For lists: "sebutkan...", "siapa saja...", "apa saja..."):
   - Provide a direct, concise list or 1-2 sentences.
   - Skip the full "Executive Summary" structure.
   - Format:
     ## Jawaban
      [Concise List or Sentence]

2. **REPORT Mode** (For data requests: "rincian...", "10 barang...", "tabel..."):
   - Prioritize a clean Markdown Table.
   - Add a very short (1 paragraph) summary of what the table shows.
   - Format:
     ## Laporan Data
     [Markdown Table]
     [Short Summary]

3. **ANALYSIS Mode** (For strategic queries: "analisa...", "mengapa...", "bagaimana..."):
   - Use the full executive structure.
   - Format:
     ## Ringkasan Analisis
     [Executive summary]
     **Temuan Utama:** [List]
     **Analisis:** [Deep dive]
     **Rekomendasi:** [Actionable items]

TRANSFORMATION RULES:
1. Remove all SQL queries and technical jargon.
2. Convert numbers to Rupiah format with CORRECT scale (juta/miliar/trilun) - VERIFY digit count!
3. Use formal Indonesian ("Anda").
4. Highlight actionable insights.
5. ALWAYS preserve the original numeric values in tables for accuracy verification.

CRITICAL DUAL-FORMAT OUTPUT:
You MUST generate TWO versions of your response in this exact format:

[VISUAL]
<Full markdown response with tables, formatting, etc. for screen display>
[/VISUAL]

[VOICE]
<Voice-friendly plain text summary. Replace tables with "data berikut" or brief summary. No markdown.>
[/VOICE]

Example:
[VISUAL]
## Top 5 Customer
| Nama | Revenue |
|------|---------|
| PT ABC | Rp 10M |
| PT XYZ | Rp 8M |
[/VISUAL]

[VOICE]
Top 5 customer berdasarkan revenue adalah data berikut. Customer terbesar adalah PT ABC dengan revenue 10 juta rupiah, diikuti PT XYZ dengan 8 juta rupiah.
[/VOICE]

CRITICAL RULES:
- If technical output contains a table/list, preserve it in Markdown Table format if it's > 2 items.
- DO NOT repeat table data in the summary text.
- Adapt your length to the question complexity. Small question = Small answer.
- ALWAYS include both [VISUAL] and [VOICE] sections.`;

class SummarizerAgent {
    constructor() {
        this.id = "summarizer";
        this.name = "Business Summarizer";
        this.qwen = new QwenWrapper();
    }

    /**
     * Summarize specialist output into business language
     */
    async summarize(specialistOutput, session, qwenSessionId) {
        const fullPrompt = `${SUMMARIZER_SYSTEM_PROMPT}

CONTEXT:
- Tenant Schema: ${session.tenantSchema}

TECHNICAL OUTPUT TO TRANSFORM:
${this.prepareInput(specialistOutput)}

BUSINESS SUMMARY (Indonesian formal):`;

        try {
            // Continue Qwen session (maintains context)
            const result = await this.qwen.continueSession(
                qwenSessionId,
                fullPrompt,
                {
                    tenantSchema: session.tenantSchema,
                },
            );

            // Parse dual-format output
            const parsed = this.parseDualFormat(result.output);

            // Auto-correct number formatting errors (trilun -> miliar)
            const correctedVisual = this.autoCorrectNumberFormat(parsed.visual);
            const correctedVoice = this.autoCorrectNumberFormat(parsed.voice);

            return {
                summary: correctedVisual,
                voiceSummary: correctedVoice,
                qwenSessionId: result.sessionId,
            };
        } catch (error) {
            console.error("Summarizer error:", error.message);

            // Fallback: return original with basic formatting
            const fallback = this.fallbackSummary(specialistOutput);
            return {
                summary: fallback,
                voiceSummary: fallback, // Same for both in fallback
                qwenSessionId,
            };
        }
    }

    /**
     * Parse dual-format output from AI
     */
    parseDualFormat(output) {
        const visualMatch = output.match(/\[VISUAL\]([\s\S]*?)\[\/VISUAL\]/);
        const voiceMatch = output.match(/\[VOICE\]([\s\S]*?)\[\/VOICE\]/);

        return {
            visual: visualMatch ? visualMatch[1].trim() : output,
            voice: voiceMatch ? voiceMatch[1].trim() : output,
        };
    }

    /**
     * Prepare specialist output for summarization
     */
    prepareInput(output) {
        // If output is object, stringify
        if (typeof output === "object") {
            return JSON.stringify(output, null, 2);
        }

        return output;
    }

    /**
     * Auto-correct number formatting errors (trilun -> miliar)
     */
    autoCorrectNumberFormat(output) {
        if (!output) return output;

        let corrected = output;
        let correctionCount = 0;

        // Pattern: Find numbers < 1000 followed by "trilun/triliun"
        const trilyunPattern = /(\d{1,3}[.,]?\d{0,2})\s*(trilun|triliun)/gi;

        corrected = corrected.replace(trilyunPattern, (match, number, unit) => {
            const numStr = number.replace(/[.,]/g, "");
            const num = parseFloat(numStr);

            // If number is < 1000, it's wrong (should be miliar)
            if (num < 1000) {
                correctionCount++;
                console.warn(
                    `🔧 AUTO-CORRECTED: "${match}" → "${number} miliar" (was incorrectly labeled as ${unit})`,
                );
                return `${number} miliar`;
            }

            // If >= 1000, keep as trilun (it's correct)
            return match;
        });

        if (correctionCount > 0) {
            console.log(
                `✅ Applied ${correctionCount} number format correction(s)`,
            );
        }

        return corrected;
    }

    /**
     * Fallback summary if Qwen fails
     */
    fallbackSummary(output) {
        return `## Ringkasan Analisis

Data telah diproses and dianalisis.

**Output:**
${output}

*Note: Summarization service unavailable. Displaying raw output.*`;
    }
}

module.exports = SummarizerAgent;
