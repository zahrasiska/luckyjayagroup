#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { google } from 'googleapis';
import { readFileSync, createReadStream, existsSync } from 'fs';

// Configuration paths
const CREDS_PATH = '/home/client_secret_534278350163-5v18184rl652urdjqpr9m3rr6br6q4jg.apps.googleusercontent.com.json';
const TOKEN_PATH = '/home/luckyjayagroup/ltech/xdrive-user-token.json';

// Initialize OAuth2 Client
const credentials = JSON.parse(readFileSync(CREDS_PATH, 'utf8'));
const { client_id, client_secret, redirect_uris } = credentials.installed;
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

// Set stored tokens
oAuth2Client.setCredentials(JSON.parse(readFileSync(TOKEN_PATH, 'utf8')));

const drive = google.drive({ version: 'v3', auth: oAuth2Client });

// Create MCP server
const server = new Server(
    {
        name: 'gdrive-user-mcp',
        version: '2.0.0',
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// List tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: 'search',
            description: 'Search for files in Google Drive',
            inputSchema: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'Search query' },
                    maxResults: { type: 'number', default: 10 },
                },
                required: ['query'],
            },
        },
        {
            name: 'list_files',
            description: 'List files in Google Drive',
            inputSchema: {
                type: 'object',
                properties: {
                    folderId: { type: 'string' },
                    maxResults: { type: 'number', default: 20 },
                },
            },
        },
        {
            name: 'upload_file',
            description: 'Upload a file to Google Drive',
            inputSchema: {
                type: 'object',
                properties: {
                    localPath: { type: 'string', description: 'Local path of the file to upload' },
                    name: { type: 'string', description: 'Desired filename in Drive' },
                    folderId: { type: 'string', description: 'Parent folder ID (optional)' },
                },
                required: ['localPath', 'name'],
            },
        },
        {
            name: 'create_folder',
            description: 'Create a new folder in Google Drive',
            inputSchema: {
                type: 'object',
                properties: {
                    name: { type: 'string', description: 'Folder name' },
                    parentFolderId: { type: 'string', description: 'Parent folder ID (optional)' },
                },
                required: ['name'],
            },
        },
    ],
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        switch (name) {
            case 'search': {
                const res = await drive.files.list({
                    q: args.query,
                    pageSize: args.maxResults,
                    fields: 'files(id, name, mimeType, webViewLink)',
                });
                return { content: [{ type: 'text', text: JSON.stringify(res.data.files, null, 2) }] };
            }

            case 'list_files': {
                const query = args.folderId ? `'${args.folderId}' in parents` : undefined;
                const res = await drive.files.list({
                    q: query,
                    pageSize: args.maxResults,
                    fields: 'files(id, name, mimeType, webViewLink)',
                });
                return { content: [{ type: 'text', text: JSON.stringify(res.data.files, null, 2) }] };
            }

            case 'upload_file': {
                const { localPath, name, folderId } = args;
                if (!existsSync(localPath)) throw new Error('Local file not found');

                const fileMetadata = { name };
                if (folderId) fileMetadata.parents = [folderId];

                const media = { body: createReadStream(localPath) };
                const file = await drive.files.create({
                    resource: fileMetadata,
                    media: media,
                    fields: 'id, name, webViewLink'
                });
                return { content: [{ type: 'text', text: `✅ Uploaded: ${file.data.name}\nLink: ${file.data.webViewLink}` }] };
            }

            case 'create_folder': {
                const { name, parentFolderId } = args;
                const fileMetadata = { name, mimeType: 'application/vnd.google-apps.folder' };
                if (parentFolderId) fileMetadata.parents = [parentFolderId];

                const folder = await drive.files.create({
                    resource: fileMetadata,
                    fields: 'id, name, webViewLink'
                });
                return { content: [{ type: 'text', text: `✅ Folder created: ${folder.data.name}\nID: ${folder.data.id}` }] };
            }

            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    } catch (error) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('GDrive User OAuth MCP Server running');
