/**
 * Qwen CLI Wrapper dengan Session Management
 * Adapted to ES Modules
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

export class QwenWrapper {
    constructor() {
        this.qwenDir = path.join(os.homedir(), '.qwen');
        this.projectsDir = path.join(this.qwenDir, 'projects');
    }

    async startSession(prompt, options = {}) {
        const { tenantSchema, model = 'qwen-plus' } = options;

        const normalizedSchema = this.normalizeSchema(tenantSchema);
        console.log(`🔍 [START SESSION] Schema: ${normalizedSchema}`);

        const tempFile = path.join(os.tmpdir(), `qwen_input_${Date.now()}.txt`);

        try {
            await fs.writeFile(tempFile, prompt, 'utf8');

            const env = {
                ...process.env,
                PGSCHEMA: `${normalizedSchema},prive,public`,
                DB_NAME: 'luckyjayagroup',
            };

            console.log(`🔧 [ENV] PGSCHEMA="${env.PGSCHEMA}", DB_NAME="${env.DB_NAME}"`);

            let command = `qwen chat --output-format json < ${tempFile}`;

            const imageMatch = prompt.match(/(\/[^ "'\s]+?\.(png|jpg|jpeg|webp|gif|bmp))/i);
            if (imageMatch && imageMatch[1]) {
                const imagePath = imageMatch[1];
                const imageDir = path.dirname(imagePath);
                command += ` --include-directories ${imageDir}`;
            }

            if (model) {
                command += ` --model ${model}`;
            }

            const { stdout, stderr } = await execAsync(command, { env, timeout: 180000 });

            let events = [];
            try {
                events = JSON.parse(stdout);
            } catch (e) {
                console.error('Failed to parse Qwen JSON:', e);
                return {
                    sessionId: 'error-parse-' + Date.now(),
                    output: stdout,
                    error: stderr,
                };
            }

            const initEvent = events.find((e) => e.type === 'system' && e.subtype === 'init');
            const sessionId = initEvent ? initEvent.session_id : await this.getLatestSessionId();

            const resultEvent = events.find((e) => e.type === 'result');
            const outputText = resultEvent
                ? resultEvent.result
                : events
                    .map((e) =>
                        e.type === 'assistant' ? e.message.content.map((c) => c.text).join('') : ''
                    )
                    .join('')
                    .trim();

            return {
                sessionId,
                output: outputText || stdout,
                error: stderr,
            };
        } catch (error) {
            console.error(`❌ Qwen CLI Error: ${error.message}`);
            return {
                sessionId: 'error-' + Date.now(),
                output: `Maaf, saya mengalami kendala teknis.\nError: ${error.message}`,
                error: error.message,
            };
        } finally {
            try {
                await fs.unlink(tempFile);
            } catch (e) { }
        }
    }

    async continueSession(sessionId, prompt, options = {}) {
        const { tenantSchema } = options;

        const normalizedSchema = this.normalizeSchema(tenantSchema);
        console.log(`🔍 [CONTINUE SESSION] Session: ${sessionId}, Schema: ${normalizedSchema}`);

        if (!sessionId || sessionId === 'null' || sessionId.toString().startsWith('fallback-')) {
            console.log(`ℹ️ Invalid/Mock Session ID (${sessionId}), starting new session instead.`);
            return this.startSession(prompt, options);
        }

        const tempFile = path.join(os.tmpdir(), `qwen_input_cont_${Date.now()}.txt`);

        try {
            await fs.writeFile(tempFile, prompt, 'utf8');

            const env = {
                ...process.env,
                PGSCHEMA: `${normalizedSchema},prive,public`,
                DB_NAME: 'luckyjayagroup',
            };

            console.log(`🔧 [ENV] PGSCHEMA="${env.PGSCHEMA}", DB_NAME="${env.DB_NAME}"`);

            // PENTING: Gunakan --resume [sessionId] bukan --continue untuk memastikan session yang benar
            let command = `qwen chat --resume ${sessionId} < ${tempFile}`;
            console.log(`📝 [RESUME] Using --resume ${sessionId} (NOT --continue)`);

            const imageMatch = prompt.match(/(\/[^"'\s]+?\.(png|jpg|jpeg|webp|gif|bmp))/i);
            if (imageMatch && imageMatch[1]) {
                const imagePath = imageMatch[1];
                const imageDir = path.dirname(imagePath);
                command += ` --include-directories ${imageDir}`;
            }

            const { stdout, stderr } = await execAsync(command, { env, timeout: 180000 });

            return {
                sessionId,
                output: stdout,
                error: stderr,
            };
        } catch (error) {
            console.warn(`⚠️ Failed to resume session ${sessionId}: ${error.message}`);
            console.log(`🔄 Attempting to start new session instead...`);
            return this.startSession(prompt, options);
        } finally {
            try {
                await fs.unlink(tempFile);
            } catch (e) { }
        }
    }

    async getLatestSessionId() {
        try {
            const projects = await fs.readdir(this.projectsDir);

            if (projects.length === 0) {
                return null;
            }

            let allSessions = [];

            for (const project of projects) {
                const chatsPath = path.join(this.projectsDir, project, 'chats');

                if (await this.pathExists(chatsPath)) {
                    const files = await fs.readdir(chatsPath);

                    for (const file of files) {
                        if (file.endsWith('.jsonl')) {
                            const filePath = path.join(chatsPath, file);
                            const stats = await fs.stat(filePath);
                            allSessions.push({
                                id: file.replace('.jsonl', ''),
                                mtime: stats.mtime,
                            });
                        }
                    }
                }
            }

            if (allSessions.length === 0) {
                return null;
            }

            allSessions.sort((a, b) => b.mtime - a.mtime);

            return allSessions[0].id;
        } catch (error) {
            console.error('Error getting session ID:', error.message);
            return null;
        }
    }

    async pathExists(filepath) {
        try {
            await fs.access(filepath);
            return true;
        } catch {
            return false;
        }
    }

    normalizeSchema(schema) {
        if (!schema) {
            const errorMsg = '❌ CRITICAL: No schema provided. Schema is required!';
            console.error(errorMsg);
            throw new Error(errorMsg);
        }

        const schemaMap = {
            sparepart: 'u1566482_sparepart',
            u1566482_sparepart: 'u1566482_sparepart',
            leontech: 'u1566482_leontech',
            u1566482_leontech: 'u1566482_leontech',
        };

        const normalized = schemaMap[schema.toLowerCase()];

        if (!normalized) {
            console.warn(`⚠️ Unknown schema "${schema}", using as-is`);
            return schema;
        }

        if (normalized !== schema) {
            console.log(`📝 Schema normalized: "${schema}" → "${normalized}"`);
        }

        return normalized;
    }
}

export default QwenWrapper;
