/**
 * Redis Session Manager untuk Multi-Agent Pipeline
 *
 * Manages conversation sessions dengan context sharing antar agents
 */

import Redis from "redis";
import { v4 as uuidv4 } from "uuid";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

class SessionManager {
    constructor(redisConfig = {}) {
        this.client = Redis.createClient({
            host: redisConfig.host || process.env.REDIS_HOST || "localhost",
            port: redisConfig.port || process.env.REDIS_PORT || 6379,
            password: redisConfig.password || process.env.REDIS_PASSWORD,
            db: redisConfig.db || 0,
        });

        this.client.on("error", (err) => console.error("Redis Error:", err));
        this.client.on("connect", () => console.log("✅ Redis connected"));

        // Session expiry (24 hours)
        this.SESSION_TTL = 24 * 60 * 60;
    }

    async connect() {
        await this.client.connect();
    }

    /**
     * Create or resume session with Qwen
     * SessionId comes from Qwen CLI, not auto-generated
     */
    async createOrResumeSession(
        qwenSessionId,
        userId,
        userRole,
        tenantSchema,
        existingData = null,
    ) {
        // Check if session already exists (resume case) unless we serve a specific update
        if (!existingData) {
            const existing = await this.getSession(qwenSessionId);

            if (existing) {
                console.log(`📝 Resuming session: ${qwenSessionId}`);
                return qwenSessionId;
            }
        }

        // Create new session or use existing data
        const sessionData = existingData || {
            id: qwenSessionId, // Use Qwen's session ID (or Frontend ID if mapped)
            qwenSessionId, // Store explicitly for clarity
            userId,
            userRole, // CEO, Manager, Staff, etc.
            tenantSchema,
            context: {},
            history: [],
            createdAt: new Date().toISOString(),
            lastAccessAt: new Date().toISOString(),
        };

        await this.client.setEx(
            `session:${qwenSessionId}`,
            this.SESSION_TTL,
            JSON.stringify(sessionData),
        );

        console.log(`🆕 Created new session: ${qwenSessionId}`);
        return qwenSessionId;
    }

    /**
     * Get Qwen session ID from current chat
     * This extracts session ID from Qwen CLI or creates new one
     */
    async getQwenSessionId(continueSession = false) {
        if (continueSession) {
            // Continue most recent session
            const { stdout } = await execAsync(
                "qwen sessions list --format json | head -1",
            );
            const sessions = JSON.parse(stdout);
            return sessions[0]?.id || null;
        }

        // Start new Q wen session - Qwen will create session ID
        // We'll extract it from the response
        return null; // New session, ID akan di-set by Qwen
    }

    /**
     * Get session data
     */
    async getSession(sessionId) {
        const data = await this.client.get(`session:${sessionId}`);

        if (!data) {
            return null;
        }

        const session = JSON.parse(data);

        // Update last access
        session.lastAccessAt = new Date().toISOString();
        await this.client.setEx(
            `session:${sessionId}`,
            this.SESSION_TTL,
            JSON.stringify(session),
        );

        return session;
    }

    /**
     * Update session context (for agent-to-agent communication)
     */
    async updateContext(sessionId, key, value) {
        const session = await this.getSession(sessionId);

        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        session.context[key] = value;

        await this.client.setEx(
            `session:${sessionId}`,
            this.SESSION_TTL,
            JSON.stringify(session),
        );
    }

    /**
     * Add to conversation history
     */
    async addToHistory(sessionId, agentId, input, output, metadata = {}) {
        const session = await this.getSession(sessionId);

        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        session.history.push({
            agent: agentId,
            input,
            output,
            metadata,
            timestamp: new Date().toISOString(),
        });

        // Keep last 50 exchanges (prevent memory bloat)
        if (session.history.length > 50) {
            session.history = session.history.slice(-50);
        }

        await this.client.setEx(
            `session:${sessionId}`,
            this.SESSION_TTL,
            JSON.stringify(session),
        );
    }

    /**
     * Get conversation history for context (includes all internal agent communications)
     */
    async getHistory(sessionId, limit = 10) {
        const session = await this.getSession(sessionId);

        if (!session) {
            return [];
        }

        return session.history.slice(-limit);
    }

    /**
     * Get user-facing history (filters out internal agent communications)
     * Only returns user questions and final summaries
     */
    async getUserFacingHistory(sessionId, limit = 10) {
        const session = await this.getSession(sessionId);

        if (!session) {
            return [];
        }

        // Group history by conversation turns
        // Each turn consists of: user question → router → specialist → summarizer
        const conversations = [];
        let currentConversation = {
            userQuestion: null,
            finalSummary: null,
            agent: null,
            timestamp: null,
        };

        for (const item of session.history) {
            if (item.agent === "router") {
                // Start of a new conversation turn
                if (
                    currentConversation.userQuestion &&
                    currentConversation.finalSummary
                ) {
                    conversations.push({ ...currentConversation });
                }
                currentConversation = {
                    userQuestion:
                        typeof item.input === "string"
                            ? item.input
                            : item.input?.question ||
                            JSON.stringify(item.input),
                    finalSummary: null,
                    agent: item.output?.selectedAgent || "unknown",
                    timestamp: item.timestamp,
                };
            } else if (item.agent === "summarizer") {
                // End of conversation turn - this is the final output
                currentConversation.finalSummary = item.output;
                currentConversation.timestamp = item.timestamp;
            }
        }

        // Add last conversation if complete
        if (
            currentConversation.userQuestion &&
            currentConversation.finalSummary
        ) {
            conversations.push(currentConversation);
        }

        // Return only the requested number of conversations
        return conversations.slice(-limit);
    }

    /**
     * Delete session
     */
    async deleteSession(sessionId) {
        await this.client.del(`session:${sessionId}`);
    }

    /**
     * Cleanup old sessions (called periodically)
     */
    async cleanup() {
        // Redis TTL handles this automatically
        console.log("Session cleanup handled by Redis TTL");
    }

    async disconnect() {
        await this.client.quit();
    }
}

export { SessionManager };
export default SessionManager;
