/**
 * Memory Manager Agent - Legacy Style
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { BaseAgent } from '../base-agent.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MEMORY_MANAGER_PROMPT = `You are the Memory Manager Archivist.
TASK: Extract ONLY the core fact or technical rule from the user's input for permanent storage.

STRICT RULES:
1. OUTPUT ONLY the data to be saved. No conversational filler, no greetings, no bot persona.
2. FOR TECHNICAL CONTENT: Extract exactly verbatim.
3. LANGUAGE: Keep original language.`;

export class MemoryManagerAgent extends BaseAgent {
    constructor() {
        super('memory-manager', {
            role: 'Archivist'
        });
        this.systemPrompt = MEMORY_MANAGER_PROMPT;
        // In final structure, knowledge is in a different place
        this.coreMemoryPath = path.join(__dirname, '../../knowledge/CORE_MEMORY.md');
    }

    async process(userQuestion, context) {
        try {
            // 1. Extract fact via Qwen CLI
            const result = await this.callQwenCLI(
                `Extract the facts to save from: "${userQuestion}"`,
                {
                    tenantSchema: context.tenant?.schema,
                    sessionId: context.qwenSessionId || context.routing?.qwenSessionId
                }
            );

            const cleanFact = result.output.trim();

            // 2. Append to memory
            const timestamp = new Date().toISOString().split('T')[0];
            const entry = `\n- [${timestamp}] ${cleanFact}`;

            // Ensure directory exists
            await fs.mkdir(path.dirname(this.coreMemoryPath), { recursive: true });
            await fs.appendFile(this.coreMemoryPath, entry);

            return {
                success: true,
                response: `Tersimpan. Informasi berikut telah ditambahkan ke ingatan global:\n"${cleanFact}"\n\n(Semua agent akan mengetahui hal ini pada request berikutnya)`,
                qwenSessionId: result.sessionId,
                agent: this.id
            };
        } catch (error) {
            return {
                success: false,
                response: `Gagal menyimpan memori: ${error.message}`,
                agent: this.id
            };
        }
    }
}

export default MemoryManagerAgent;
