/**
 * Memory Manager Agent
 * 
 * Responsible for saving user-taught facts to global memory (CORE_MEMORY.md)
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SpecialistAgent } from './specialist-base.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MemoryManagerAgent extends SpecialistAgent {
    constructor() {
        super({
            id: 'memory-manager',
            name: 'Memory Manager',
            role: 'Archivist',
            systemPrompt: `You are the Memory Manager Archivist.
TASK: Extract ONLY the core fact or technical rule from the user's input for permanent storage.

STRICT RULES:
1. OUTPUT ONLY the data to be saved. No conversational filler, no greetings, no bot persona (e.g., DON'T say "Saya adalah Memory Manager").
2. FOR TECHNICAL CONTENT (SQL, Code, Complex Logic): DO NOT summarize. Extract the content VELBATIM (exactly as provided).
3. If the user says "Ingat query ini: [SQL]", your output MUST be only the [SQL].
4. FORMATTING: Use markdown code blocks for SQL or code.
5. LANGUAGE: Keep the data in its original language.

EXAMPLE 1 (Verbatim):
Input: "Ingat rumus laba: Total - HPP"
Output: "Rumus laba: Total - HPP"

EXAMPLE 2 (SQL):
Input: "Catat query neraca ini: SELECT * FROM t"
Output: "Query neraca:\n\`\`\`sql\nSELECT * FROM t\n\`\`\`"
`
        });

        // Path to Core Memory
        this.coreMemoryPath = path.join(__dirname, '../knowledge/CORE_MEMORY.md');
    }

    /**
     * Override process to perform file write
     */
    async process(userQuestion, routing, session, qwenSessionId) {
        try {
            // 1. Use Qwen to extract the clean fact
            // We use the base process to get the "Clean Fact"
            const extractResult = await super.process(
                `Extract the facts to save from: "${userQuestion}"`,
                routing,
                session,
                qwenSessionId
            );

            const cleanFact = extractResult.output.trim();

            // 2. Append to CORE_MEMORY.md
            const timestamp = new Date().toISOString().split('T')[0];
            const memoryEntry = `\n- [${timestamp}] ${cleanFact}`;

            await fs.appendFile(this.coreMemoryPath, memoryEntry);

            // 3. Return confirmation
            return {
                output: `Tersimpan. Informasi berikut telah ditambahkan ke ingatan global:\n"${cleanFact}"\n\n(Semua agent akan mengetahui hal ini pada request berikutnya)`,
                qwenSessionId: extractResult.qwenSessionId,
                agent: this.id
            };

        } catch (error) {
            console.error('Memory Manager Error:', error);
            return {
                output: `Gagal menyimpan memori: ${error.message}`,
                qwenSessionId: qwenSessionId, // Return original ID
                agent: this.id
            };
        }
    }
}

export { MemoryManagerAgent };
