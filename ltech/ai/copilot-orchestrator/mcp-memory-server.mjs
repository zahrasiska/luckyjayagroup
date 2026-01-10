#!/usr/bin/env node
/**
 * MCP Server for Global Memory Management
 * Provides tools to read and write to CORE_MEMORY.md
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs/promises";
import path from "path";

const MEMORY_PATH =
    process.env.MEMORY_PATH ||
    "/home/luckyjayagroup/ltech/ai/copilot-orchestrator/knowledge/CORE_MEMORY.md";

const server = new Server(
    {
        name: "ltech-memory",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    },
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "get_core_memory",
                description:
                    "Read the entire global memory (CORE_MEMORY.md) containing business rules and stored facts.",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
            {
                name: "add_memory",
                description:
                    "Add a new fact, rule, or piece of knowledge to the global memory.",
                inputSchema: {
                    type: "object",
                    properties: {
                        fact: {
                            type: "string",
                            description:
                                "The fact or rule to store (will be prefixed with current date)",
                        },
                    },
                    required: ["fact"],
                },
            },
            {
                name: "search_memory",
                description:
                    "Search for specific keywords within the global memory.",
                inputSchema: {
                    type: "object",
                    properties: {
                        keyword: {
                            type: "string",
                            description: "Keyword to search for",
                        },
                    },
                    required: ["keyword"],
                },
            },
            {
                name: "delete_memory",
                description:
                    "Remove an entry from memory by providing a unique keyword or part of the sentence to match.",
                inputSchema: {
                    type: "object",
                    properties: {
                        match: {
                            type: "string",
                            description:
                                "Text or keyword to identify the entry to be deleted",
                        },
                    },
                    required: ["match"],
                },
            },
        ],
    };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        switch (name) {
            case "get_core_memory": {
                const content = await fs.readFile(MEMORY_PATH, "utf-8");
                return {
                    content: [{ type: "text", text: content }],
                };
            }

            case "add_memory": {
                const { fact } = args;
                const timestamp = new Date().toISOString().split("T")[0];
                const entry = `\n- [${timestamp}] ${fact}`;

                await fs.appendFile(MEMORY_PATH, entry);

                return {
                    content: [
                        {
                            type: "text",
                            text: `✅ Berhasil ditambahkan ke memori global: "${fact}"`,
                        },
                    ],
                };
            }

            case "search_memory": {
                const { keyword } = args;
                const content = await fs.readFile(MEMORY_PATH, "utf-8");
                const lines = content.split("\n");
                const results = lines.filter((line) =>
                    line.toLowerCase().includes(keyword.toLowerCase()),
                );

                if (results.length === 0) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Tidak ada hasil untuk keyword: "${keyword}"`,
                            },
                        ],
                    };
                }

                return {
                    content: [{ type: "text", text: results.join("\n") }],
                };
            }

            case "delete_memory": {
                const { match } = args;
                const content = await fs.readFile(MEMORY_PATH, "utf-8");
                const lines = content.split("\n");
                const filteredLines = lines.filter(
                    (line) => !line.toLowerCase().includes(match.toLowerCase()),
                );

                if (lines.length === filteredLines.length) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `❌ Tidak ditemukan entry yang cocok dengan: "${match}"`,
                            },
                        ],
                    };
                }

                await fs.writeFile(MEMORY_PATH, filteredLines.join("\n"));

                return {
                    content: [
                        {
                            type: "text",
                            text: `✅ Berhasil menghapus entry memori yang mengandung: "${match}"`,
                        },
                    ],
                };
            }

            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    } catch (error) {
        console.error("Memory Server error:", error);
        return {
            content: [{ type: "text", text: `ERROR: ${error.message}` }],
            isError: true,
        };
    }
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);

console.error("LTech Memory MCP Server started");
