/**
 * Express API Server for Multi-Agent Pipeline
 *
 * Exposes multi-agent chat functionality via REST API
 */

const express = require("express");
const cors = require("cors");
const http = require("http");
const https = require("https");
const { Server } = require("socket.io");
const rateLimit = require("express-rate-limit");
const MultiAgentPipeline = require("./pipeline-orchestrator");
const metadataRoutes = require("./routes/metadata");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();

// Trust proxy for X-Forwarded-For headers (behind Nginx)
app.set("trust proxy", true);

// HTTP Server
const server = http.createServer(app);

// HTTPS Server (Self-Signed)
let httpsServer = null;
const SSL_KEY_PATH = path.join(__dirname, "certs", "server.key");
const SSL_CERT_PATH = path.join(__dirname, "certs", "server.crt");

if (fs.existsSync(SSL_KEY_PATH) && fs.existsSync(SSL_CERT_PATH)) {
    const sslOptions = {
        key: fs.readFileSync(SSL_KEY_PATH),
        cert: fs.readFileSync(SSL_CERT_PATH),
    };
    httpsServer = https.createServer(sslOptions, app);
    console.log("🔒 SSL Certificates loaded successfully.");
} else {
    console.warn("⚠️ SSL Certificates not found. HTTPS will be disabled.");
}

const io = new Server({
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

io.attach(server);
if (httpsServer) {
    io.attach(httpsServer);
}

const PORT = process.env.API_PORT || 8889;
const HTTPS_PORT = process.env.API_PORT_HTTPS || 8443;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "./public"))); // Serve static files from public directory

// Ensure uploads directory exists
const UPLOADS_BASE = path.join(__dirname, "uploads", "sessions");
if (!fs.existsSync(UPLOADS_BASE)) {
    fs.mkdirSync(UPLOADS_BASE, { recursive: true });
}

// Multer Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Session ID passed in body or header.
        // For simplicity, if not present, use 'temp'.
        // Note: Multer parses body AFTER file if not careful.
        // We will default to 'temp' and move it later if needed,
        // OR rely on client sending sessionId in query/headers.
        const sessionId = req.body.sessionId || req.query.sessionId || "temp";
        const dir = path.join(UPLOADS_BASE, sessionId);

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + "-" + file.originalname);
    },
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000, // Higher limit for WebSocket environments
    message: "Too many requests from this IP, please try again later.",
});

app.use("/api/", limiter);

// Initialize pipeline
const pipeline = new MultiAgentPipeline();

// WebSocket Logic
io.on("connection", (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Handle chat message
    socket.on("chat-message", async (data) => {
        const {
            question,
            sessionId = null,
            userId = "web-user",
            userRole = "user",
            tenantSchema, // REQUIRED - no default
        } = data;

        if (!question) {
            return socket.emit("chat-error", { error: "Question is required" });
        }

        if (!tenantSchema) {
            return socket.emit("chat-error", {
                error: "tenantSchema is required but not provided. Please select a tenant schema.",
            });
        }

        console.log(
            `\n💬 WS Message from ${socket.id}: "${question.substring(0, 50)}..."`,
        );

        try {
            // Process through multi-agent pipeline
            const result = await pipeline.processQuestion(question, {
                userId,
                userRole,
                tenantSchema,
                sessionId,
                onProgress: (progress) => {
                    // Send progress to this specific client
                    socket.emit("chat-progress", progress);
                },
            });

            if (result.success) {
                socket.emit("chat-response", {
                    success: true,
                    sessionId: result.sessionId,
                    response: result.summary,
                    voiceResponse: result.voiceResponse, // Voice-friendly version for TTS
                    metadata: {
                        agentUsed: result.routing.selectedAgent,
                        confidence: result.routing.confidence,
                        userIntent: result.routing.userIntent,
                    },
                });
            } else {
                socket.emit("chat-error", { error: result.error });
            }
        } catch (error) {
            console.error("❌ Socket chat error:", error.message);
            socket.emit("chat-error", { error: error.message });
        }
    });

    socket.on("disconnect", () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
    });
});

/**
 * REST API as fallback/metadata
 */

/**
 * POST /api/upload
 * Handles file uploads associated with a session
 */
app.post("/api/upload", upload.single("file"), (req, res) => {
    try {
        if (!req.file) {
            return res
                .status(400)
                .json({ success: false, error: "No file uploaded" });
        }

        res.json({
            success: true,
            filePath: req.file.path, // Absolute path
            fileName: req.file.filename,
            originalName: req.file.originalname,
        });
    } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/chat (Legacy Support)
 */
app.post("/api/chat", async (req, res) => {
    try {
        const {
            question,
            sessionId = null,
            userId = "web-user",
            userRole = "user",
            tenantSchema = process.env.TENANT_SCHEMA_SPAREPART ||
            "u1566482_sparepart",
        } = req.body;

        if (!question) {
            return res
                .status(400)
                .json({ success: false, error: "Question is required" });
        }

        const result = await pipeline.processQuestion(question, {
            userId,
            userRole,
            tenantSchema,
            sessionId,
        });

        if (result.success) {
            res.json({
                success: true,
                sessionId: result.sessionId,
                response: result.summary,
                metadata: {
                    agentUsed: result.routing.selectedAgent,
                    confidence: result.routing.confidence,
                    userIntent: result.routing.userIntent,
                },
            });
        } else {
            res.status(500).json({ success: false, error: result.error });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/session/:sessionId
 */
app.get("/api/session/:sessionId", async (req, res) => {
    try {
        const { sessionId } = req.params;
        const history = await pipeline.getSessionHistory(sessionId);
        res.json({ success: true, sessionId, history });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/session/:sessionId
 * Clears session history AND deletes uploaded files
 */
app.delete("/api/session/:sessionId", async (req, res) => {
    try {
        const { sessionId } = req.params;

        // 1. Clear session history in Redis
        await pipeline.clearSession(sessionId);

        // 2. Delete session upload directory
        const sessionDir = path.join(UPLOADS_BASE, sessionId);
        if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true, force: true });
            console.log(`🗑️ Deleted files for session ${sessionId}`);
        }

        res.json({ success: true, message: "Session cleared successfully" });
    } catch (error) {
        console.error("Clear session error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/agents
 */
app.get("/api/agents", (req, res) => {
    const agents = [
        {
            id: "sales-manager",
            name: "Sales Manager",
            icon: "📈",
            description: "Revenue & customer analysis",
        },
        {
            id: "finance-manager",
            name: "Finance Manager",
            icon: "💰",
            description: "Financial reports & ratios",
        },
        {
            id: "inventory-manager",
            name: "Inventory Manager",
            icon: "📦",
            description: "Stock levels & reorder",
        },
    ];
    res.json({ success: true, agents });
});

app.use("/api/metadata", metadataRoutes);

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        service: "multi-agent-pipeline-api (WebSocket Enabled)",
        version: "1.2.0",
        status: "running",
    });
});

// Start server
async function startServer() {
    try {
        await pipeline.initialize();
        server.listen(PORT, () => {
            console.log("\n" + "=".repeat(60));
            console.log("🚀 Multi-Agent WebSocket Server Started");
            console.log("=".repeat(60));
            console.log(`\n📡 HTTP  Server: http://localhost:${PORT}`);
        });

        if (httpsServer) {
            httpsServer.listen(HTTPS_PORT, () => {
                console.log(`🔒 HTTPS Server: https://localhost:${HTTPS_PORT}`);
                console.log(
                    `   (Use this port for Voice Input & Secure Access)`,
                );
            });
        }
    } catch (error) {
        console.error("❌ Failed to start server:", error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on("SIGINT", async () => {
    console.log("\n👋 Shutting down server...");
    await pipeline.shutdown();
    process.exit(0);
});

startServer();

module.exports = app;
