#!/usr/bin/env node

const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

// Load client credentials
const credentials = JSON.parse(
    fs.readFileSync('/home/client_secret_534278350163-5v18184rl652urdjqpr9m3rr6br6q4jg.apps.googleusercontent.com.json')
);

const { client_id, client_secret, redirect_uris } = credentials.installed;
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

// Scopes for full Drive access
const SCOPES = ['https://www.googleapis.com/auth/drive'];

// Token storage path
const TOKEN_PATH = path.join(process.env.HOME, '.gdrive-token.json');

console.log('\n🔐 Google Drive OAuth Setup\n');

// Generate auth URL
const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
});

console.log('📋 Open this URL in your browser:\n');
console.log(authUrl);
console.log('\n');

// Simple HTTP server to receive the code
const server = http.createServer(async (req, res) => {
    if (req.url.indexOf('/?code=') > -1) {
        const qs = new url.URL(req.url, 'http://localhost:8080').searchParams;
        const code = qs.get('code');

        res.end('✅ Authorization successful! You can close this window.');
        server.close();

        try {
            const { tokens } = await oAuth2Client.getToken(code);
            oAuth2Client.setCredentials(tokens);

            // Save token
            fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
            console.log('✅ Token saved to:', TOKEN_PATH);
            console.log('\n🎉 Google Drive MCP is now authenticated!\n');
            process.exit(0);
        } catch (err) {
            console.error('❌ Error retrieving access token:', err);
            process.exit(1);
        }
    }
});

server.listen(8080, () => {
    console.log('⏳ Waiting for authorization... (listening on http://localhost:8080)');
});
