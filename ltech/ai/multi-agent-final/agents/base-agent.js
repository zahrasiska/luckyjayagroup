/**
 * Base Agent (Pure Brain Mode)
 * No Tools, No JSON extraction for toolCall, No Handcuffs.
 * 100% focused on Natural Intelligence and CLI power.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import logger from '../utils/logger.js';
import { KnowledgeLoader } from '../core/knowledge-loader.js';

const execAsync = promisify(exec);

export class BaseAgent {
    constructor(name, config = {}) {
        this.id = name;
        this.name = name;
        this.role = config.role || 'Expert Assistant';
        this.log = logger.agents;
        this.knowledgeLoader = new KnowledgeLoader();
    }

    /**
     * Pure CLI Interaction (Thinking Phase)
     */
    async process(userQuestion, context) {
        try {
            const session = {
                tenantSchema: context.tenant?.schema || context.tenant?.kode,
                qwenSessionId: context.qwenSessionId || context.routing?.qwenSessionId
            };

            // 1. Load Knowledge (Persona + Schema Info + Rules)
            const knowledge = await this.knowledgeLoader.loadKnowledge(this.id);

            // 2. Build the Expert Prompt (No mention of tools/json)
            const fullPrompt = `${knowledge}

---

YOU ARE: ${this.role} (${this.name})
CONTEXT: Working for ${context.tenant?.name || 'Lucky Tech Group'}
CURRENT DATE: ${new Date().toLocaleDateString('id-ID')}

USER QUESTION:
${userQuestion}

MISSION:
- Think deeply. Analyze the request.
- Use your full terminal capabilities (including MCP tools if enabled in your environment) to find the truth.
- Do NOT talk about "calling tools". Just provide the expert analysis.
- If you need data, get it. Then present it clearly.

BEGIN THINKING AND ANALYSIS:`;

            // 3. Execution (Direct Terminal Chat)
            const tempFile = path.join(os.tmpdir(), `ai_brain_${this.id}_${Date.now()}.txt`);
            await fs.writeFile(tempFile, fullPrompt, 'utf8');

            const env = {
                ...process.env,
                PGSCHEMA: session.tenantSchema ? `${session.tenantSchema},prive,public` : process.env.PGSCHEMA,
                DB_NAME: 'luckyjayagroup',
            };

            // We use standard chat. The AI will use its internal MCP (ltech-db) automatically if needed.
            // NO parsing for toolCall here. We just want the raw expert response.
            // We use JSON output format to capture the session_id and the final result
            let command = `qwen chat --output-format json --model qwen-turbo < ${tempFile}`;
            if (session.qwenSessionId && session.qwenSessionId !== 'new') {
                command = `qwen chat --resume ${session.qwenSessionId} --output-format json < ${tempFile}`;
            }

            this.log.info('Specialist Thinking Mode', { agent: this.id, sessionId: session.qwenSessionId });

            const { stdout } = await execAsync(command, { env, timeout: 180000 });
            const events = JSON.parse(stdout);

            const initEvent = events.find(e => e.type === 'system' && e.subtype === 'init');
            const resultEvent = events.find(e => e.type === 'result');

            return {
                success: true,
                response: resultEvent?.result || stdout,
                qwenSessionId: initEvent?.session_id || session.qwenSessionId,
                agent: this.id
            };

        } catch (error) {
            this.log.error('Brain failure:', error.message);
            throw error;
        } finally {
            // Cleanup temp file
        }
    }

    // Explicitly removed: agenticProcess, executeTool, registerTool, getToolSchemas
}
