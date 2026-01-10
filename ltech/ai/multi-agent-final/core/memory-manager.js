/**
 * Memory Manager
 * Handles persistent business rules (CORE_MEMORY) and session-specific knowledge.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const log = logger.agent.child({ component: 'memory-manager' });

export class MemoryManager {
    constructor() {
        this.coreMemoryPath = path.join(__dirname, '../knowledge/CORE_MEMORY.md');
        this.memoriesDir = path.join(__dirname, '../memories');
        this.coreMemory = '';
        this.isInitialized = false;
    }

    /**
     * Initialize memory manager: load CORE_MEMORY
     */
    async init() {
        if (this.isInitialized) return;

        try {
            // Ensure memories directory exists
            await fs.mkdir(this.memoriesDir, { recursive: true });

            // Load CORE_MEMORY
            const content = await fs.readFile(this.coreMemoryPath, 'utf-8');
            this.coreMemory = content;

            this.isInitialized = true;
            log.info('Memory Manager initialized');
        } catch (error) {
            log.error('Failed to initialize Memory Manager', { error: error.message });
            // Fallback to empty core memory if file doesn't exist yet
            this.coreMemory = '# CORE MEMORY\n(Memory file not found)';
        }
    }

    /**
     * Get the global business rules and constraints
     */
    getCoreMemory() {
        return this.coreMemory;
    }

    /**
     * Get or create a session ID for a client based on user context
     * This implements "cold start" logic where AI defines the session.
     */
    getSessionId(context) {
        if (!context?.user?.id || !context?.tenant?.schema) {
            return `temp_${Date.now()}`;
        }
        // Consistent ID per user/tenant combination if we want long-term memory
        // Or unique per connection if we want clean sessions
        // User requested "session id by AI", implies persistence or identification
        const userId = context.user.id;
        const tenant = context.tenant.schema;
        return `session_${tenant}_${userId}`;
    }

    /**
     * Save dynamic knowledge learned during conversation
     */
    async saveUserKnowledge(sessionId, knowledge) {
        const filePath = path.join(this.memoriesDir, `${sessionId}_knowledge.json`);
        try {
            let existing = {};
            try {
                const content = await fs.readFile(filePath, 'utf-8');
                existing = JSON.parse(content);
            } catch (e) {
                // File doesn't exist
            }

            const updated = {
                ...existing,
                ...knowledge,
                updatedAt: new Date().toISOString()
            };

            await fs.writeFile(filePath, JSON.stringify(updated, null, 2));
            log.debug('User knowledge saved', { sessionId });
        } catch (error) {
            log.error('Failed to save user knowledge', { sessionId, error: error.message });
        }
    }

    /**
     * Get dynamic knowledge for a session
     */
    async getUserKnowledge(sessionId) {
        const filePath = path.join(this.memoriesDir, `${sessionId}_knowledge.json`);
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(content);
        } catch (e) {
            return {};
        }
    }

    /**
     * Save a message to conversation history
     */
    async saveMessage(sessionId, message) {
        const filePath = path.join(this.memoriesDir, `${sessionId}_history.json`);
        try {
            let history = [];
            try {
                const content = await fs.readFile(filePath, 'utf-8');
                history = JSON.parse(content);
            } catch (e) {
                // File doesn't exist, start fresh
            }

            history.push({
                ...message,
                timestamp: message.timestamp || new Date().toISOString(),
            });

            await fs.writeFile(filePath, JSON.stringify(history, null, 2));
            log.debug('Message saved to history', { sessionId, messageId: message.id });
        } catch (error) {
            log.error('Failed to save message', { sessionId, error: error.message });
        }
    }

    /**
     * Get conversation history for a session
     */
    async getHistory(sessionId) {
        const filePath = path.join(this.memoriesDir, `${sessionId}_history.json`);
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(content);
        } catch (error) {
            return []; // No history yet
        }
    }

    /**
     * Clear conversation history for a session
     */
    async clearHistory(sessionId) {
        const filePath = path.join(this.memoriesDir, `${sessionId}_history.json`);
        try {
            await fs.unlink(filePath);
            log.info('History cleared', { sessionId });
            return true;
        } catch (error) {
            if (error.code === 'ENOENT') {
                return true; // Already cleared
            }
            throw error;
        }
    }

    /**
     * Format full memory context for LLM prompt
     */
    async getFullMemoryContext(sessionId) {
        const knowledge = await this.getUserKnowledge(sessionId);
        let context = `\n--- CORE BUSINESS RULES ---\n${this.coreMemory}\n`;

        if (Object.keys(knowledge).length > 0) {
            context += `\n--- DYNAMIC USER KNOWLEDGE ---\n`;
            for (const [key, value] of Object.entries(knowledge)) {
                if (key === 'updatedAt') continue;
                context += `- ${key}: ${JSON.stringify(value)}\n`;
            }
        }

        return context;
    }
}

// Singleton instance
const memoryManager = new MemoryManager();
export default memoryManager;
