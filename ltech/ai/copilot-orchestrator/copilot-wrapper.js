import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

class CopilotWrapper {
    constructor(options = {}) {
        this.model = options.model || 'gpt-4.1'; // 36% faster than gpt-5-mini, still FREE
        this.allowAllTools = options.allowAllTools !== false; // Default true
        this.timeout = options.timeout || 180000; // 180s default
        this.verbose = options.verbose || false;
        this.sessionStatePath = path.join(os.homedir(), '.copilot', 'session-state');
    }

    /**
     * Start a new Copilot session
     */
    async startSession(agentName, prompt, options = {}) {
        return this.execute(agentName, prompt, { ...options, continueSession: false });
    }

    /**
     * Continue an existing Copilot session
     */
    async continueSession(sessionId, agentName, prompt, options = {}) {
        return this.execute(agentName, prompt, { ...options, sessionId, continueSession: true });
    }

    /**
     * Internal helper to execute Copilot CLI using spawn
     */
    async execute(agentName, prompt, options = {}) {
        const { sessionId = null, allowAllTools = this.allowAllTools, verbose = this.verbose } = options;
        const args = [];

        if (agentName) args.push('--agent', agentName);
        if (this.model) args.push('--model', this.model);

        if (sessionId) {
            args.push('--resume', sessionId);
        } else if (options.continueSession) {
            args.push('--continue');
        }

        if (allowAllTools) args.push('--allow-all-tools');
        args.push('--allow-tool', 'ltech-db(*)');
        args.push('--silent');
        args.push('-p', prompt);

        // Capture session directory state before if we need to detect a new session
        let beforeSessions = new Set();
        if (!sessionId) {
            try {
                beforeSessions = new Set(fs.readdirSync(this.sessionStatePath).filter(f => f.endsWith('.jsonl')));
            } catch (e) {
                // Ignore errors if directory doesn't exist yet
            }
        }

        return new Promise((resolve, reject) => {
            const child = spawn('copilot', args);
            let stdout = '';
            let stderr = '';

            // Set a timeout
            const timeoutId = setTimeout(() => {
                child.kill();
                reject(new Error(`Copilot execution timed out after ${this.timeout}ms`));
            }, this.timeout);

            child.stdout.on('data', (data) => {
                stdout += data;
                if (verbose) process.stdout.write(`[STDOUT] ${data}`);
            });
            child.stderr.on('data', (data) => {
                stderr += data;
                if (verbose) process.stderr.write(`[STDERR] ${data}`);
            });

            child.on('close', (code) => {
                clearTimeout(timeoutId);
                if (code !== 0) {
                    return reject(new Error(`Copilot execution failed with code ${code}:\n${stderr}`));
                }

                // 1. Try to extract from stderr
                let extractedSessionId = this.extractSessionId(stderr);

                // 2. Fallback: Check filesystem for new or updated session file
                if (!extractedSessionId && !sessionId) {
                    try {
                        const afterSessions = fs.readdirSync(this.sessionStatePath).filter(f => f.endsWith('.jsonl'));
                        const newFiles = afterSessions.filter(f => !beforeSessions.has(f));

                        if (newFiles.length > 0) {
                            // If multiple new files (unlikely in sequential test), pick the most recent
                            const mostRecent = newFiles.reduce((a, b) => {
                                const statA = fs.statSync(path.join(this.sessionStatePath, a));
                                const statB = fs.statSync(path.join(this.sessionStatePath, b));
                                return statA.mtime > statB.mtime ? a : b;
                            });
                            extractedSessionId = mostRecent.replace('.jsonl', '');
                        } else {
                            // No new files? Maybe it updated an existing one? 
                            // This shouldn't happen for a "startSession" without sessionId.
                        }
                    } catch (e) {
                        if (verbose) console.error(`[DEBUG] Session detection failed: ${e.message}`);
                    }
                }

                resolve({
                    output: stdout.trim(),
                    stderr,
                    sessionId: extractedSessionId || sessionId
                });
            });

            child.on('error', (err) => {
                clearTimeout(timeoutId);
                reject(new Error(`Failed to start copilot: ${err.message}`));
            });
        });
    }

    /**
     * Extract session ID from Copilot output (stderr)
     */
    extractSessionId(stderr) {
        const match = stderr.match(/Session:\s*([a-zA-Z0-9-]+)/);
        if (match) return match[1];
        return null; // Don't generate mock if not found in real CLI output
    }

    /**
     * Parse JSON response from agent (for router, etc.)
     */
    parseJSON(output) {
        try {
            const jsonMatch = output.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('No JSON found in output');
            return JSON.parse(jsonMatch[0]);
        } catch (error) {
            throw new Error(`Failed to parse JSON: ${error.message}`);
        }
    }

    /**
     * Parse dual-format output ([VISUAL] and [VOICE])
     */
    parseDualFormat(output) {
        const visualMatch = output.match(/\[VISUAL\]([\s\S]*?)\[\/VISUAL\]/);
        const voiceMatch = output.match(/\[VOICE\]([\s\S]*?)\[\/VOICE\]/);

        return {
            visual: visualMatch ? visualMatch[1].trim() : output,
            voice: voiceMatch ? voiceMatch[1].trim() : output,
        };
    }
}

export default CopilotWrapper;
