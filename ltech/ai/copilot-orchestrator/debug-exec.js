import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function debugCommand() {
    const command = `copilot --agent finance-manager --model gpt-5-mini --allow-all-tools --silent -p 'Test query'`;
    console.log(`Running: ${command}`);

    try {
        const { stdout, stderr } = await execAsync(command);
        console.log('STDOUT:', stdout);
        console.log('STDERR:', stderr);
    } catch (error) {
        console.error('ERROR:', error.message);
        if (error.stdout) console.log('ERROR STDOUT:', error.stdout);
        if (error.stderr) console.log('ERROR STDERR:', error.stderr);
    }
}

debugCommand();
