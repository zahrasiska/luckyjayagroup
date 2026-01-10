/**
 * Multi-Agent Pipeline Orchestrator
 *
 * Coordinates Router → Specialist → Summarizer workflow
 */

const SessionManager = require("./session-manager");
const fs = require("fs").promises;
const path = require("path");
const RouterAgent = require("./agents/router");
const SummarizerAgent = require("./agents/summarizer");

// Import all specialist agents
const SalesManagerAgent = require("./agents/sales-manager");
const FinanceManagerAgent = require("./agents/finance-manager");
const InventoryManagerAgent = require("./agents/inventory-manager");
const MemoryManagerAgent = require("./agents/memory-manager");
const GeneralAssistantAgent = require("./agents/general-assistant");
// TODO: Import other specialists as they're created

class MultiAgentPipeline {
    constructor() {
        this.sessionManager = new SessionManager();
        this.router = new RouterAgent();
        this.summarizer = new SummarizerAgent();

        // Register specialist agents
        this.specialists = {
            "sales-manager": new SalesManagerAgent(),
            "finance-manager": new FinanceManagerAgent(),
            "inventory-manager": new InventoryManagerAgent(),
            "memory-manager": new MemoryManagerAgent(),
            "general-assistant": new GeneralAssistantAgent(),
            // TODO: Add other specialists
            // 'ceo-direksi': new CEOAgent(),
            // 'purchasing-manager': new PurchasingManagerAgent(),
            // etc.
        };
    }

    /**
     * Initialize pipeline (connect to Redis)
     */
    async initialize() {
        await this.sessionManager.connect();
        console.log("✅ Multi-Agent Pipeline initialized");
    }

    /**
     * Process user question through multi-agent pipeline
     */
    async processQuestion(userQuestion, options = {}) {
        const {
            userId = "default-user",
            userRole = "user",
            tenantSchema, // REQUIRED - no default
            sessionId = null, // Qwen session ID (if continuing)
            onProgress = null, // Optional callback for real-time updates
        } = options;

        // Strict validation: tenantSchema is required
        if (!tenantSchema) {
            const errorMsg =
                "❌ CRITICAL ERROR: tenantSchema is required but not provided!";
            console.error(errorMsg);
            console.error("Options received:", options);
            return {
                success: false,
                error: errorMsg,
                sessionId: null,
            };
        }

        // Step 0: Resolve file references (e.g. @[path/to/file.sql])
        const resolvedQuestion = await this.resolveFileReferences(userQuestion);

        const emitProgress = (step, data = {}) => {
            if (onProgress && typeof onProgress === "function") {
                onProgress({ step, ...data });
            }
        };

        console.log("\n" + "=".repeat(70));
        console.log("🤖 Multi-Agent Pipeline Processing");
        console.log("=".repeat(70));
        console.log(
            `Question: "${resolvedQuestion.substring(0, 500)}${resolvedQuestion.length > 500 ? "..." : ""}"`,
        );
        console.log(`User ID: ${userId}`);
        console.log(`User Role: ${userRole}`);
        console.log(`Tenant Schema: ${tenantSchema}`);
        console.log(`Session ID: ${sessionId || "NEW"}`);
        console.log("");

        try {
            // Step 1: Create or resume Redis session
            let qwenSessionId = sessionId;
            let redisSession;

            if (!sessionId) {
                // New conversation - will get Qwen session ID from router
                redisSession = {
                    userId,
                    userRole,
                    tenantSchema,
                    context: {},
                    history: [],
                };
            } else {
                // Resume conversation
                redisSession = await this.sessionManager.getSession(sessionId);

                if (!redisSession) {
                    console.warn(
                        `⚠️ Session ${sessionId} not found in Redis. Auto-recovering...`,
                    );
                    // specific recovery: create new session structure but keep the ID
                    redisSession = {
                        userId,
                        userRole,
                        tenantSchema,
                        context: {},
                        history: [],
                    };
                    // re-save it immediately to prevent future errors
                    await this.sessionManager.createOrResumeSession(
                        sessionId,
                        userId,
                        userRole,
                        tenantSchema,
                    );
                }
            }

            // Step 2: Router determines specialist
            console.log("📍 Step 1: Routing...");
            emitProgress("routing_start", {
                detail: "Menganalisis niat user...",
            });

            const routing = await this.router.route(
                resolvedQuestion,
                redisSession,
            );

            console.log(`   → Selected: ${routing.selectedAgent}`);
            console.log(
                `   → Confidence: ${(routing.confidence * 100).toFixed(0)}%`,
            );
            console.log(`   → Intent: ${routing.userIntent}`);

            emitProgress("routing_complete", {
                selectedAgent: routing.selectedAgent,
                confidence: routing.confidence,
                intent: routing.userIntent,
            });

            // Update qwenSessionId based on Router's result
            // The Router either resumed an existing Qwen session OR started a new one
            qwenSessionId = routing.qwenSessionId;

            // If we have a stored session (redisSession), make sure it has the latest qwenSessionId
            if (redisSession) {
                if (redisSession.qwenSessionId !== qwenSessionId) {
                    console.log(
                        `🔗 Linking Frontend Session ${sessionId} -> Qwen Session ${qwenSessionId}`,
                    );
                    redisSession.qwenSessionId = qwenSessionId;

                    // Persist the mapping immediately
                    await this.sessionManager.updateContext(
                        sessionId,
                        "qwenSessionId",
                        qwenSessionId,
                    );
                    // Also update the main session object structure if needed,
                    // but sessionManager.updateContext might only update 'context' field depending on impl.
                    // Let's force a full save to be safe:
                    await this.sessionManager.createOrResumeSession(
                        sessionId, // Key = Frontend ID
                        userId,
                        userRole,
                        tenantSchema,
                        redisSession, // Pass full object to preserve history/context
                    );
                }
            } else if (!sessionId) {
                // Completely new session (no frontend ID provided) - unlikely in this UI
                // We use the Qwen ID as the Frontend ID
                await this.sessionManager.createOrResumeSession(
                    qwenSessionId,
                    userId,
                    userRole,
                    tenantSchema,
                );
            }

            // Store routing in session context
            await this.sessionManager.updateContext(
                sessionId || qwenSessionId,
                "routing",
                routing,
            );
            await this.sessionManager.addToHistory(
                sessionId || qwenSessionId,
                "router",
                resolvedQuestion,
                routing,
            );

            // Step 3: Specialist processes request
            console.log("\n📊 Step 2: Specialist Processing...");
            emitProgress("specialist_start", {
                agent: routing.selectedAgent,
                detail: `Menghubungi ${routing.selectedAgent}...`,
            });

            const specialist = this.specialists[routing.selectedAgent];

            if (!specialist) {
                throw new Error(
                    `Specialist ${routing.selectedAgent} not found`,
                );
            }

            const specialistResult = await specialist.process(
                resolvedQuestion,
                routing,
                redisSession,
                qwenSessionId,
            );

            console.log(`   → Agent: ${specialist.name}`);
            console.log(
                `   → Output (Preview): ${specialistResult.output.substring(0, 500)}`,
            );
            console.log(
                `   → Output length: ${specialistResult.output.length} chars`,
            );

            await this.sessionManager.addToHistory(
                sessionId || qwenSessionId,
                routing.selectedAgent,
                { question: resolvedQuestion, routing },
                specialistResult.output,
            );

            // Step 4: Summarizer creates business summary
            console.log("\n✨ Step 3: Summarizing...");

            let summaryResult = { summary: "" };

            // Skip summarizer for conversational agents
            if (
                ["general-assistant", "memory-manager"].includes(
                    routing.selectedAgent,
                )
            ) {
                console.log(
                    "   → Skipping summarizer for conversational agent",
                );
                summaryResult.summary = specialistResult.output;
                emitProgress("summarizing_complete", {
                    detail: "Respon siap.",
                });
            } else {
                emitProgress("summarizing_start", {
                    detail: "Menyusun ringkasan bisnis...",
                });

                summaryResult = await this.summarizer.summarize(
                    specialistResult.output,
                    redisSession,
                    qwenSessionId,
                );

                console.log(
                    `   → Summary length: ${summaryResult.summary.length} chars`,
                );
                emitProgress("summarizing_complete", {
                    detail: "Analisis selesai.",
                });
            }

            await this.sessionManager.addToHistory(
                sessionId || qwenSessionId,
                "summarizer",
                specialistResult.output,
                summaryResult.summary,
            );

            // Final result
            console.log("\n" + "=".repeat(70));
            console.log("✅ Pipeline Complete");
            console.log("=".repeat(70) + "\n");

            // Emit final completion event
            emitProgress("complete", {
                detail: "Selesai.",
                success: true,
            });

            return {
                success: true,
                sessionId: sessionId || qwenSessionId, // Keep frontend ID stable
                routing,
                specialist: {
                    agent: routing.selectedAgent,
                    output: specialistResult.output,
                },
                summary: summaryResult.summary,
                voiceResponse:
                    summaryResult.voiceSummary || summaryResult.summary, // Fallback to summary if no voice version
                metadata: {
                    userRole,
                    tenantSchema,
                    agentUsed: routing.selectedAgent,
                    confidence: routing.confidence,
                },
            };
        } catch (error) {
            console.error("\n❌ Pipeline Error:", error.message);
            console.error("Stack:", error.stack);

            return {
                success: false,
                error: error.message,
                sessionId: sessionId || null, // Return original sessionId or null
            };
        }
    }

    /**
     * Get session history (user-facing only)
     */
    async getSessionHistory(sessionId, limit = 10) {
        return await this.sessionManager.getUserFacingHistory(sessionId, limit);
    }

    /**
     * Clear session
     */
    async clearSession(sessionId) {
        return await this.sessionManager.deleteSession(sessionId);
    }

    /**
     * Cleanup
     */
    async shutdown() {
        await this.sessionManager.disconnect();
        console.log("👋 Multi-Agent Pipeline shutdown");
    }

    /**
     * Resolve @[file] references by injecting file content
     */
    async resolveFileReferences(text) {
        if (!text || typeof text !== "string") return text;

        const fileRefRegex = /@\[([^\]]+)\]/g;
        let resolvedText = text;
        const matches = [...text.matchAll(fileRefRegex)];

        for (const match of matches) {
            const ref = match[0];
            let filePath = match[1];

            // Handle line ranges (e.g. file.txt:L1-L10) - just strip for now to get path
            filePath = filePath.split(":")[0];

            // Resolve path relative to workspace root (/home/luckyjayagroup/ltech)
            const absolutePath = filePath.startsWith("/")
                ? filePath
                : path.join("/home/luckyjayagroup/ltech", filePath);

            try {
                const content = await fs.readFile(absolutePath, "utf8");
                const extension = path.extname(absolutePath).slice(1);
                const replacement = `\nFile Content [${filePath}]:\n\`\`\`${extension}\n${content}\n\`\`\`\n`;

                resolvedText = resolvedText.replace(ref, replacement);
                console.log(
                    `📄 Resolved file reference: ${filePath} (${content.length} chars)`,
                );
            } catch (err) {
                console.warn(
                    `⚠️ Failed to resolve file reference ${filePath}: ${err.message}`,
                );
                // Keep the reference as is if it fails
            }
        }

        return resolvedText;
    }
}

module.exports = MultiAgentPipeline;
