/**
 * Knowledge Base Loader
 *
 * Loads QWEN.md files and injects access control rules
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getAccessRulesForAgent } from '../config/access-rules.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class KnowledgeLoader {
    constructor(knowledgeDir) {
        this.knowledgeDir = knowledgeDir || path.join(__dirname, '..', 'knowledge');
    }

    /**
     * Load knowledge base for specific agent
     */
    async loadKnowledge(agentId) {
        try {
            // 1. Load Core Memory (Global)
            const corePath = path.join(this.knowledgeDir, "CORE_MEMORY.md");
            let coreMemory = "";
            try {
                coreMemory = await fs.readFile(corePath, "utf8");
            } catch (e) {
                console.warn(
                    "CORE_MEMORY.md not found, proceeding without it.",
                );
            }

            // 2. Load agent's specific knowledge (Try subfolder/QWEN.md first, then agentId.md)
            let knowledge = "";
            const subfolderPath = path.join(
                this.knowledgeDir,
                agentId,
                "QWEN.md",
            );
            const directPath = path.join(this.knowledgeDir, `${agentId}.md`);

            try {
                if (await this.pathExists(subfolderPath)) {
                    knowledge = await fs.readFile(subfolderPath, "utf8");
                } else {
                    knowledge = await fs.readFile(directPath, "utf8");
                }
            } catch (e) {
                console.warn(
                    `Specific knowledge not found for ${agentId}, using default.`,
                );
                knowledge = this.getDefaultKnowledge(agentId);
            }

            // 3. Combine and Inject access control rules
            let combined = `${coreMemory}\n\n---\n\n${knowledge}`;
            const accessRules = getAccessRulesForAgent(agentId);
            combined = combined.replace("{{ACCESS_RULES}}", accessRules);

            return combined;
        } catch (error) {
            console.error(
                `Failed to load knowledge for ${agentId}:`,
                error.message,
            );
            return this.getDefaultKnowledge(agentId);
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
     * Get default knowledge if QWEN.md not found
     */
    getDefaultKnowledge(agentId) {
        const accessRules = getAccessRulesForAgent(agentId);

        return `# ${agentId} Knowledge Base

## Access Permissions
${accessRules}

## Database
You have access to luckyjayagroup database via MCP.
Schema will be set dynamically based on user's tenant.

## Must Know
- Always check deleted_at IS NULL
- Use proper transaction codes (kdtrans)
- Format currency as Rupiah
- Provide actionable insights

*Note: Default knowledge loaded. Create ${agentId}.md for customization.*`;
    }

    /**
     * List available knowledge bases
     */
    async listKnowledgeBases() {
        try {
            const files = await fs.readdir(this.knowledgeDir);
            return files
                .filter((f) => f.endsWith(".md"))
                .map((f) => f.replace(".md", ""));
        } catch (error) {
            console.error("Failed to list knowledge bases:", error.message);
            return [];
        }
    }
}

export { KnowledgeLoader };
export default KnowledgeLoader;
