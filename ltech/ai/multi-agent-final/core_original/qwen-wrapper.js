/**
 * Qwen CLI Wrapper dengan Session Management
 *
 * Integrates dengan Qwen CLI session system untuk multi-agent pipeline
 */

const { exec } = require("child_process");
const { promisify } = require("util");
const fs = require("fs").promises;
const path = require("path");
const os = require("os");

const execAsync = promisify(exec);

class QwenWrapper {
    constructor() {
        this.qwenDir = path.join(os.homedir(), ".qwen");
        this.projectsDir = path.join(this.qwenDir, "projects");
    }

    /**
     * Start new Qwen chat session
     * Returns: { sessionId, output }
     */
    async startSession(prompt, options = {}) {
        const {
            tenantSchema,
            model = "qwen-plus",
            continueSession = false,
        } = options;

        // Validate and normalize schema (will throw error if not provided)
        const normalizedSchema = this.normalizeSchema(tenantSchema);
        console.log(`🔍 [START SESSION] Schema: ${normalizedSchema}`);

        const tempFile = path.join(os.tmpdir(), `qwen_input_${Date.now()}.txt`);

        try {
            // Write prompt to temp file to avoid shell escaping issues
            await fs.writeFile(tempFile, prompt, "utf8");

            const env = {
                ...process.env,
                PGSCHEMA: `${normalizedSchema},prive,public`,
                DB_NAME: "luckyjayagroup",
            };

            console.log(
                `🔧 [ENV] PGSCHEMA="${env.PGSCHEMA}", DB_NAME="${env.DB_NAME}"`,
            );

            // Build command using input redirection and JSON output format
            let command = `qwen chat --output-format json < ${tempFile}`;

            // Check for image files in prompt
            const imageMatch = prompt.match(
                /(\/[^"'\n]+?\.(png|jpg|jpeg|webp|gif|bmp))/i,
            );
            if (imageMatch && imageMatch[1]) {
                const imagePath = imageMatch[1];
                const imageDir = path.dirname(imagePath);
                command += ` --include-directories ${imageDir}`;
            }

            if (model) {
                command += ` --model ${model}`;
            }

            if (continueSession) {
                command += ` --continue`;
            }

            const { stdout, stderr } = await execAsync(command, {
                env,
                timeout: 180000,
            });

            // Parse JSON output
            let events = [];
            try {
                events = JSON.parse(stdout);
            } catch (e) {
                // Fallback for non-JSON output (should not happen with --output-format json)
                console.error("Failed to parse Qwen JSON:", e);
                return {
                    sessionId: "error-parse-" + Date.now(),
                    output: stdout,
                    error: stderr,
                };
            }

            // Extract Session ID from init event
            const initEvent = events.find(
                (e) => e.type === "system" && e.subtype === "init",
            );
            const sessionId = initEvent
                ? initEvent.session_id
                : await this.getLatestSessionId(); // Fallback just in case

            // Extract content from result event
            const resultEvent = events.find((e) => e.type === "result");
            const outputText = resultEvent
                ? resultEvent.result
                : events
                      .map((e) =>
                          e.type === "assistant"
                              ? e.message.content.map((c) => c.text).join("")
                              : "",
                      )
                      .join("")
                      .trim();

            return {
                sessionId,
                output: outputText || stdout, // Fallback to raw if no result found
                error: stderr,
            };
        } catch (error) {
            console.error(`❌ Qwen CLI Error: ${error.message}`);
            return {
                sessionId: "error-" + Date.now(),
                output: `Maaf, saya mengalami kendala teknis.\nError: ${error.message}`,
                error: error.message,
            };
        } finally {
            try {
                await fs.unlink(tempFile);
            } catch (e) {}
        }
    }

    /**
     * Continue existing Qwen session
     */
    async continueSession(sessionId, prompt, options = {}) {
        const { tenantSchema } = options;

        // Validate and normalize schema (will throw error if not provided)
        const normalizedSchema = this.normalizeSchema(tenantSchema);
        console.log(
            `🔍 [CONTINUE SESSION] Session: ${sessionId}, Schema: ${normalizedSchema}`,
        );

        // If sessionId is null, undefined, or a mock ID, start a new session instead
        if (
            !sessionId ||
            sessionId === "null" ||
            sessionId.toString().startsWith("fallback-")
        ) {
            console.log(
                `ℹ️ Invalid/Mock Session ID (${sessionId}), starting new session instead.`,
            );
            return this.startSession(prompt, options);
        }

        const tempFile = path.join(
            os.tmpdir(),
            `qwen_input_cont_${Date.now()}.txt`,
        );

        try {
            await fs.writeFile(tempFile, prompt, "utf8");

            const env = {
                ...process.env,
                PGSCHEMA: `${normalizedSchema},prive,public`,
                DB_NAME: "luckyjayagroup",
            };

            console.log(
                `🔧 [ENV] PGSCHEMA="${env.PGSCHEMA}", DB_NAME="${env.DB_NAME}"`,
            );

            // Resume specific session using input redirection
            let command = `qwen chat --resume ${sessionId} < ${tempFile}`;

            // Check for image files in prompt
            const imageMatch = prompt.match(
                /(\/[^"'\n]+?\.(png|jpg|jpeg|webp|gif|bmp))/i,
            );
            if (imageMatch && imageMatch[1]) {
                const imagePath = imageMatch[1];
                const imageDir = path.dirname(imagePath);
                command += ` --include-directories ${imageDir}`;
            }

            const { stdout, stderr } = await execAsync(command, {
                env,
                timeout: 180000,
            });

            return {
                sessionId,
                output: stdout,
                error: stderr,
            };
        } catch (error) {
            console.warn(
                `⚠️ Failed to resume session ${sessionId}: ${error.message}`,
            );
            console.log(`🔄 Attempting to start new session instead...`);
            return this.startSession(prompt, options);
        } finally {
            try {
                await fs.unlink(tempFile);
            } catch (e) {}
        }
    }

    /**
     * Get latest Qwen session ID
     * Checks ~/.qwen/projects for most recent chat
     */
    async getLatestSessionId() {
        try {
            // List projects
            const projects = await fs.readdir(this.projectsDir);

            if (projects.length === 0) {
                return null;
            }

            let allSessions = [];

            // Scan all projects for chats
            for (const project of projects) {
                const chatsPath = path.join(this.projectsDir, project, "chats");

                if (await this.pathExists(chatsPath)) {
                    const files = await fs.readdir(chatsPath);

                    for (const file of files) {
                        if (file.endsWith(".jsonl")) {
                            const filePath = path.join(chatsPath, file);
                            const stats = await fs.stat(filePath);
                            allSessions.push({
                                id: file.replace(".jsonl", ""),
                                mtime: stats.mtime,
                            });
                        }
                    }
                }
            }

            if (allSessions.length === 0) {
                return null;
            }

            // Sort by most recent
            allSessions.sort((a, b) => b.mtime - a.mtime);

            return allSessions[0].id;
        } catch (error) {
            console.error("Error getting session ID:", error.message);
            return null;
        }
    }

    /**
     * Get session history from Qwen
     */
    async getSessionHistory(sessionId) {
        try {
            // Find session directory
            const projects = await fs.readdir(this.projectsDir);

            for (const project of projects) {
                const sessionPath = path.join(
                    this.projectsDir,
                    project,
                    "sessions",
                    sessionId,
                );

                if (await this.pathExists(sessionPath)) {
                    // Read session data (usually in data.json or similar)
                    const dataPath = path.join(sessionPath, "data.json");

                    if (await this.pathExists(dataPath)) {
                        const data = await fs.readFile(dataPath, "utf8");
                        return JSON.parse(data);
                    }
                }
            }

            return null;
        } catch (error) {
            console.error("Error reading session history:", error.message);
            return null;
        }
    }

    /**
     * List all Qwen sessions
     */
    async listSessions() {
        try {
            const { stdout } = await execAsync(
                "qwen sessions list --format json",
            );
            return JSON.parse(stdout);
        } catch (error) {
            console.error("Error listing sessions:", error.message);
            return [];
        }
    }

    /**
     * Helper: Check if path exists
     */
    async pathExists(filepath) {
        try {
            await fs.access(filepath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Normalize and validate tenant schema
     * Ensures consistent schema naming
     */
    normalizeSchema(schema) {
        if (!schema) {
            const errorMsg =
                "❌ CRITICAL: No schema provided. Schema is required!";
            console.error(errorMsg);
            throw new Error(errorMsg);
        }

        // Handle common variations
        const schemaMap = {
            sparepart: "u1566482_sparepart",
            u1566482_sparepart: "u1566482_sparepart",
            leontech: "u1566482_leontech",
            u1566482_leontech: "u1566482_leontech",
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

module.exports = QwenWrapper;
