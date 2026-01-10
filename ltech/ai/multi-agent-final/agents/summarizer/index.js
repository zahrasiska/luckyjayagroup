/**
 * Summarizer Agent - Legacy Style
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import logger from '../../utils/logger.js';

const execAsync = promisify(exec);

const SUMMARIZER_SYSTEM_PROMPT = `You are a Business Communication Specialist for an ERP system.

TASK:
Transform technical AI/database output into natural, executive-friendly Indonesian business language.

🚨 CRITICAL: NUMBER FORMATTING RULES (MUST FOLLOW EXACTLY):
1. **RUPIAH AMOUNT CONVERSION:**
   - Count digits to determine scale: 9 digits = juta, 10-11 digits = miliar, 12+ digits = trilun
   - ✅ CORRECT: "Rp 65.295.980.417" → "Rp 65,29 miliar"

CRITICAL DUAL-FORMAT OUTPUT:
You MUST generate TWO versions of your response in this exact format:

[VISUAL]
<Full markdown response with tables, formatting, etc. for screen display>
[/VISUAL]

[VOICE]
<Voice-friendly plain text summary. Replace tables with "data berikut" or brief summary. No markdown.>
[/VOICE]`;

export class SummarizerAgent {
    constructor() {
        this.log = logger.agents;
    }

    async callQwenCLI(prompt, options = {}) {
        const tempFile = path.join(os.tmpdir(), `summarizer_input_${Date.now()}.txt`);
        try {
            await fs.writeFile(tempFile, prompt, 'utf8');
            const env = {
                ...process.env,
                PGSCHEMA: options.tenantSchema ? `${options.tenantSchema},prive,public` : process.env.PGSCHEMA,
            };
            let command = `qwen chat --output-format json --model qwen-turbo < ${tempFile}`;
            if (options.sessionId && options.sessionId !== 'new') {
                command = `qwen chat --resume ${options.sessionId} --output-format json < ${tempFile}`;
            }

            const { stdout } = await execAsync(command, { env, timeout: 60000 });
            const events = JSON.parse(stdout);
            const resultEvent = events.find(e => e.type === 'result');
            return resultEvent?.result || stdout;
        } finally {
            try { await fs.unlink(tempFile); } catch (e) { }
        }
    }

    async summarize(specialistResult, session, qwenSessionId) {
        const content = typeof specialistResult === 'object' ? JSON.stringify(specialistResult) : specialistResult;

        const fullPrompt = `${SUMMARIZER_SYSTEM_PROMPT}

CONTEXT:
- Tenant: ${session.tenantSchema}

TECHNICAL OUTPUT TO TRANSFORM:
${content}

BUSINESS SUMMARY (Indonesian formal):`;

        try {
            const output = await this.callQwenCLI(fullPrompt, {
                tenantSchema: session.tenantSchema,
                sessionId: qwenSessionId
            });

            const visualMatch = output.match(/\[VISUAL\]([\s\S]*?)\[\/VISUAL\]/);
            const voiceMatch = output.match(/\[VOICE\]([\s\S]*?)\[\/VOICE\]/);

            return {
                summary: visualMatch ? visualMatch[1].trim() : output,
                voiceSummary: voiceMatch ? voiceMatch[1].trim() : output,
                success: true
            };
        } catch (error) {
            this.log.error('Summarizer error:', error.message);
            return {
                summary: content,
                voiceSummary: content,
                success: false
            };
        }
    }
}

export default SummarizerAgent;
