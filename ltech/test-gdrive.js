#!/usr/bin/env node

const { google } = require('googleapis');
const fs = require('fs');

async function testGDriveAccess() {
    try {
        // Load service account credentials
        const credentials = JSON.parse(
            fs.readFileSync('/home/luckyjayagroup/ltech/xdrive-service-account.json')
        );

        // Create auth client
        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/drive'],
        });

        const authClient = await auth.getClient();
        const drive = google.drive({ version: 'v3', auth: authClient });

        console.log('✅ Service Account authenticated successfully!\n');
        console.log('📧 Service Account Email:', credentials.client_email);
        console.log('\n🔍 Testing Drive access...\n');

        // List files (will only show files shared with service account)
        const res = await drive.files.list({
            pageSize: 10,
            fields: 'files(id, name, mimeType, createdTime)',
        });

        const files = res.data.files;
        if (files.length === 0) {
            console.log('📂 No files found.');
            console.log('\n💡 To access files, share them with:');
            console.log('   ' + credentials.client_email);
        } else {
            console.log(`📁 Found ${files.length} file(s):\n`);
            files.forEach((file) => {
                console.log(`   - ${file.name} (${file.mimeType})`);
            });
        }

        console.log('\n✅ Google Drive API access is working!');
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

testGDriveAccess();
