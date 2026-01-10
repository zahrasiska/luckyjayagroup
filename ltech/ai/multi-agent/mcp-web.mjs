#!/usr/bin/env node
/**
 * MCP Server for Web Search (Simple Scraper)
 * Uses DuckDuckGo HTML to fetch search snippets.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import axios from 'axios';
import * as cheerio from 'cheerio';

const server = new Server(
    {
        name: "ltech-web-search",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

/**
 * duckDuckGoSearch
 * Scrapes DuckDuckGo HTML version for titles and snippets.
 */
async function duckDuckGoSearch(query) {
    try {
        const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const $ = cheerio.load(data);
        const results = [];

        $('.result').each((i, element) => {
            if (i >= 5) return false; // Limit to 5 results
            const title = $(element).find('.result__title').text().trim();
            const snippet = $(element).find('.result__snippet').text().trim();
            const link = $(element).find('.result__url').attr('href');

            if (title && snippet) {
                results.push({ title, snippet, link });
            }
        });

        return results;
    } catch (error) {
        console.error("Search Error:", error.message);
        return [];
    }
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "web_search",
                description: "Search the internet for real-time information, news, weather, or facts.",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: {
                            type: "string",
                            description: "The search query (e.g. 'Presiden Indonesia saat ini', 'Cuaca Jakarta hari ini')",
                        },
                    },
                    required: ["query"],
                },
            },
        ],
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "web_search") {
        const query = request.params.arguments.query;
        const results = await duckDuckGoSearch(query);

        if (results.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: `No results found for '${query}'. Try modifying the query.`,
                    },
                ],
            };
        }

        const formatted = results.map(r => `## ${r.title}\n${r.snippet}\nSource: ${r.link}`).join('\n\n');

        return {
            content: [
                {
                    type: "text",
                    text: `Search Results for '${query}':\n\n${formatted}`,
                },
            ],
        };
    }
    throw new Error("Tool not found");
});

const transport = new StdioServerTransport();
await server.connect(transport);
