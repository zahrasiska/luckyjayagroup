/**
 * Test: Session ID Capture & Context Retention
 * 
 * Scenario:
 * - Chat 1 (Cold Start): "nama saya sic"
 * - Chat 2 (Resume): "siapa nama saya?"
 * - Chat 3 (Resume): "apa pertanyaan pertama saya?"
 * 
 * Expected: Agent should remember name and first question
 */

import PipelineOrchestrator from './pipeline-orchestrator.js';

async function testSessionRetention() {
    const orchestrator = new PipelineOrchestrator({
        allowAllTools: true,
        model: 'gpt-5-mini'
    });

    const sessionContext = {
        tenantSchema: 'u1566482_sparepart',
        userId: 'test-user-sic',
        userRole: 'CEO'
    };

    console.log('🧪 === TEST: SESSION CONTEXT RETENTION ===\n');

    try {
        // CHAT 1: Cold Start - Introduction
        console.log('💬 Chat 1: "nama saya sic" (Cold Start)');
        console.log('─'.repeat(60));
        const chat1 = await orchestrator.executeMultiAgentPipeline(
            "nama saya sic",
            sessionContext
        );

        console.log(`\n✅ Session ID Captured: ${chat1.sessionId}`);
        console.log(`📝 Response: ${chat1.summary.substring(0, 100)}...`);

        if (!chat1.sessionId) {
            throw new Error('❌ FAILED: Session ID not captured in Chat 1!');
        }

        // CHAT 2: Resume - Question about name
        console.log('\n\n💬 Chat 2: "siapa nama saya?" (Resume Session)');
        console.log('─'.repeat(60));
        const chat2 = await orchestrator.executeMultiAgentPipeline(
            "siapa nama saya?",
            { ...sessionContext, sessionId: chat1.sessionId }
        );

        console.log(`\n✅ Session ID: ${chat2.sessionId}`);
        console.log(`📝 Response: ${chat2.summary}`);

        // Validate: Should mention "sic"
        const remembersName = chat2.summary.toLowerCase().includes('sic');
        console.log(`\n🔍 Context Check: ${remembersName ? '✅ Agent remembers name' : '❌ Agent forgot name'}`);

        // CHAT 3: Resume - Question about first question
        console.log('\n\n💬 Chat 3: "apa pertanyaan pertama saya?" (Resume Session)');
        console.log('─'.repeat(60));
        const chat3 = await orchestrator.executeMultiAgentPipeline(
            "apa pertanyaan pertama saya?",
            { ...sessionContext, sessionId: chat1.sessionId }
        );

        console.log(`\n✅ Session ID: ${chat3.sessionId}`);
        console.log(`📝 Response: ${chat3.summary}`);

        // Validate: Should mention first question about name
        const remembersFirstQuestion = chat3.summary.toLowerCase().includes('nama');
        console.log(`\n🔍 Context Check: ${remembersFirstQuestion ? '✅ Agent remembers first question' : '❌ Agent forgot first question'}`);

        // Final Report
        console.log('\n\n' + '═'.repeat(60));
        console.log('📊 FINAL VALIDATION REPORT');
        console.log('═'.repeat(60));
        console.log(`Session ID Persistence: ${chat1.sessionId === chat2.sessionId && chat2.sessionId === chat3.sessionId ? '✅ VALID' : '❌ FAILED'}`);
        console.log(`Context Retention (Name): ${remembersName ? '✅ VALID' : '❌ FAILED'}`);
        console.log(`Context Retention (First Question): ${remembersFirstQuestion ? '✅ VALID' : '❌ FAILED'}`);
        console.log('═'.repeat(60));

        if (remembersName && remembersFirstQuestion) {
            console.log('\n🎉 TEST PASSED: Session context retention working perfectly!');
        } else {
            console.log('\n⚠️ TEST PARTIALLY FAILED: Some context was lost');
        }

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
        throw error;
    }
}

testSessionRetention();
