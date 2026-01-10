/**
 * General Assistant Agent - Legacy Style
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { BaseAgent } from '../base-agent.js';

const execAsync = promisify(exec);

export class GeneralAssistantAgent extends BaseAgent {
    constructor() {
        super('general-assistant', {
            role: 'Assistant'
        });
    }

    async process(question, context) {
        // Strategy 1: Try Gemini CLI (Legacy behavior)
        try {
            const { stdout } = await execAsync(`gemini "${question}"`, { timeout: 45000 });
            if (stdout && stdout.trim().length > 10) {
                return {
                    success: true,
                    response: `(Source: Gemini)\n${stdout.trim()}`,
                    agent: this.id
                };
            }
        } catch (error) {
            // Fallback to basic Qwen chat
            const result = await this.callQwenCLI(question, {
                tenantSchema: context.tenant?.schema,
                sessionId: context.qwenSessionId || context.routing?.qwenSessionId
            });

            return {
                success: true,
                response: result.output,
                qwenSessionId: result.sessionId,
                agent: this.id
            };
        }
    }
}

export default GeneralAssistantAgent;
