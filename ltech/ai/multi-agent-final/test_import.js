import { getAccessRulesForAgent } from './config/access-rules.js';
console.log('Testing getAccessRulesForAgent...');
try {
    const rules = getAccessRulesForAgent('finance-manager');
    console.log('Rules found:', rules.substring(0, 100));
    console.log('✅ Import successful!');
} catch (e) {
    console.error('❌ Import failed:', e.message);
    process.exit(1);
}
