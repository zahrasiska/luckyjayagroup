/**
 * General Assistant Agent
 * 
 * Handles non-business queries:
 * - General knowledge (President, Capital cities)
 * - Weather / News (via gemini-cli or web_search fallback)
 * - Casual conversation
 */
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const { duckDuckGoSearch } = require('../utils/web-search');
const QwenWrapper = require('../qwen-wrapper');

const SYSTEM_PROMPT = `
You are the **General Assistant** for the LTech Multi-Agent System.
Your job is to synthesize search results into a helpful answer.
`;

class GeneralAssistantAgent {
    constructor() {
        this.id = 'general-assistant';
        this.name = 'General Assistant';
        this.qwen = new QwenWrapper();
    }

    /**
     * Process general questions
     */
    async process(question, routingData, session, qwenSessionId) {
        // Strategy 1: Try Gemini CLI (Fast & Up-to-date)
        try {
            console.log(`   [General] Trying Gemini CLI...`);
            // Increased timeout to 45s for longer chains of thought
            const { stdout } = await execAsync(`gemini "${question}"`, { timeout: 45000 });

            if (stdout && stdout.trim().length > 10) {
                return {
                    output: `(Source: Gemini)\n${stdout.trim()}`
                };
            }
        } catch (error) {
            console.warn(`   ⚠️ Gemini CLI failed: ${error.message}. Switch to Fallback.`);
        }

        // Strategy 2: Web Search + Qwen Summarization (Fallback)
        console.log(`   [General] Fallback: Web Search...`);
        try {
            const results = await duckDuckGoSearch(question);

            if (results.length === 0) {
                return { output: "Maaf, saya tidak menemukan informasi terkini mengenai hal tersebut." };
            }

            const context = results.map(r => `## ${r.title}\n${r.snippet}\nSource: ${r.link}`).join('\n\n');
            const prompt = `${SYSTEM_PROMPT}\n\nUSER QUESTION: ${question}\n\nSEARCH RESULTS:\n${context}\n\nANSWER:`;

            // Use Qwen to summarize the search results
            // We use startSession here because we just want a one-off summary, 
            // but we can pass the session ID if we want to keep it in the thread.
            const result = await this.qwen.continueSession(qwenSessionId, prompt, {
                tenantSchema: session.tenantSchema
            });

            return {
                output: result.output || "Maaf, saya gagal merangkum informasi."
            };

        } catch (err) {
            return {
                output: `Maaf, terjadi kesalahan teknis saat mencari informasi. (${err.message})`
            };
        }
    }
}

module.exports = GeneralAssistantAgent;
