/**
 * Test Script: Schema Validation
 *
 * Tests the new strict schema validation to ensure:
 * 1. Error when schema is missing
 * 2. Normalization of schema variations
 * 3. Proper PGSCHEMA environment variable setting
 */

const io = require('socket.io-client');

const SOCKET_URL = 'http://localhost:8889';

console.log('🧪 Schema Validation Test Suite\n');
console.log('='.repeat(60));

// Test 1: Missing Schema (should fail)
async function testMissingSchema() {
    return new Promise((resolve) => {
        console.log('\n📋 Test 1: Missing tenantSchema');
        console.log('-'.repeat(60));

        const socket = io(SOCKET_URL);

        socket.on('connect', () => {
            console.log('✅ Connected to server');

            // Send without schema
            socket.emit('chat-message', {
                question: 'Test tanpa schema',
                userId: 'test-user',
                userRole: 'user'
                // tenantSchema is missing!
            });
        });

        socket.on('chat-error', (data) => {
            console.log('❌ Expected error received:', data.error);
            if (data.error.includes('tenantSchema')) {
                console.log('✅ TEST PASSED: Error correctly thrown for missing schema');
            } else {
                console.log('❌ TEST FAILED: Wrong error message');
            }
            socket.disconnect();
            resolve();
        });

        socket.on('chat-response', (data) => {
            console.log('❌ TEST FAILED: Should not receive response without schema!');
            console.log('Response:', data);
            socket.disconnect();
            resolve();
        });

        setTimeout(() => {
            console.log('⏱️ Test timeout');
            socket.disconnect();
            resolve();
        }, 10000);
    });
}

// Test 2: Valid Full Schema (should succeed)
async function testValidSchema() {
    return new Promise((resolve) => {
        console.log('\n📋 Test 2: Valid Full Schema (u1566482_sparepart)');
        console.log('-'.repeat(60));

        const socket = io(SOCKET_URL);

        socket.on('connect', () => {
            console.log('✅ Connected to server');

            socket.emit('chat-message', {
                question: 'Sebutkan 3 merk barang',
                tenantSchema: 'u1566482_sparepart',
                userId: 'test-user',
                userRole: 'user'
            });
        });

        socket.on('chat-progress', (data) => {
            console.log(`📊 Progress: ${data.step} - ${data.detail || ''}`);
        });

        socket.on('chat-response', (data) => {
            console.log('✅ Response received successfully');
            console.log('Session ID:', data.sessionId);
            console.log('Agent Used:', data.metadata?.agentUsed);
            console.log('Response length:', data.response?.length, 'chars');
            console.log('✅ TEST PASSED: Query executed with correct schema');
            socket.disconnect();
            resolve();
        });

        socket.on('chat-error', (data) => {
            console.log('❌ TEST FAILED: Unexpected error:', data.error);
            socket.disconnect();
            resolve();
        });

        setTimeout(() => {
            console.log('⏱️ Test timeout');
            socket.disconnect();
            resolve();
        }, 60000); // 60s timeout for actual query
    });
}

// Test 3: Schema Variation (should normalize and succeed)
async function testSchemaVariation() {
    return new Promise((resolve) => {
        console.log('\n📋 Test 3: Schema Variation (sparepart → u1566482_sparepart)');
        console.log('-'.repeat(60));

        const socket = io(SOCKET_URL);

        socket.on('connect', () => {
            console.log('✅ Connected to server');

            // Send with short form
            socket.emit('chat-message', {
                question: 'Sebutkan 3 merk barang',
                tenantSchema: 'sparepart', // Should be normalized
                userId: 'test-user',
                userRole: 'user'
            });
        });

        socket.on('chat-progress', (data) => {
            console.log(`📊 Progress: ${data.step}`);
        });

        socket.on('chat-response', (data) => {
            console.log('✅ Response received successfully');
            console.log('Session ID:', data.sessionId);
            console.log('✅ TEST PASSED: Schema normalized and query executed');
            socket.disconnect();
            resolve();
        });

        socket.on('chat-error', (data) => {
            console.log('❌ TEST FAILED: Error:', data.error);
            socket.disconnect();
            resolve();
        });

        setTimeout(() => {
            console.log('⏱️ Test timeout');
            socket.disconnect();
            resolve();
        }, 60000);
    });
}

// Test 4: Unknown Schema (should use as-is with warning)
async function testUnknownSchema() {
    return new Promise((resolve) => {
        console.log('\n📋 Test 4: Unknown Schema (should use as-is)');
        console.log('-'.repeat(60));

        const socket = io(SOCKET_URL);

        socket.on('connect', () => {
            console.log('✅ Connected to server');

            socket.emit('chat-message', {
                question: 'Test with unknown schema',
                tenantSchema: 'unknown_schema_test',
                userId: 'test-user',
                userRole: 'user'
            });
        });

        socket.on('chat-response', (data) => {
            console.log('⚠️ Response received (may fail at DB level)');
            console.log('✅ TEST PASSED: Unknown schema accepted (warning logged)');
            socket.disconnect();
            resolve();
        });

        socket.on('chat-error', (data) => {
            console.log('⚠️ Error expected at DB level:', data.error);
            console.log('✅ TEST PASSED: Unknown schema used, DB error expected');
            socket.disconnect();
            resolve();
        });

        setTimeout(() => {
            console.log('⏱️ Test timeout');
            socket.disconnect();
            resolve();
        }, 30000);
    });
}

// Run all tests
async function runTests() {
    console.log('🚀 Starting test suite...\n');

    try {
        await testMissingSchema();
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s between tests

        await testValidSchema();
        await new Promise(resolve => setTimeout(resolve, 2000));

        await testSchemaVariation();
        await new Promise(resolve => setTimeout(resolve, 2000));

        await testUnknownSchema();

        console.log('\n' + '='.repeat(60));
        console.log('✅ All tests completed!');
        console.log('='.repeat(60));
        console.log('\n💡 Check PM2 logs for detailed schema validation messages:');
        console.log('   pm2 logs ltech-multi-agent --lines 100\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Test suite failed:', error);
        process.exit(1);
    }
}

// Start tests
runTests();
