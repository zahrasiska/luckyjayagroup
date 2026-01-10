/**
 * Input Refiner Agent
 * 
 * Pre-processes user input to fix typos and grammar before routing.
 * Uses Qwen CLI for intelligent correction.
 */

import { execSync } from 'child_process';
import fs from 'fs/promises';

class InputRefinerAgent {
    constructor() {
        this.id = 'input-refiner';
        this.name = 'Input Refiner';
        this.enabled = true; // Can be disabled via config
        this.minSimilarity = 0.99; // Only skip if almost identical (99%+)
    }

    /**
     * Refine user input by fixing typos and grammar
     */
    async refine(userInput, session = {}) {
        if (!this.enabled) {
            console.log(`🔧 [InputRefiner] Disabled, returning original input`);
            return userInput;
        }

        try {
            // Skip if input is too short (likely already clean)
            if (userInput.length < 10) {
                console.log(`🔧 [InputRefiner] Input too short, skipping correction`);
                return userInput;
            }

            const prompt = this.buildPrompt(userInput);
            const corrected = await this.callQwen(prompt, session);

            // Calculate similarity
            const similarity = this.calculateSimilarity(userInput, corrected);

            if (similarity > this.minSimilarity) {
                console.log(`🔧 [InputRefiner] No significant changes (${(similarity * 100).toFixed(1)}% similar), using original`);
                return userInput;
            }

            console.log(`🔧 [InputRefiner] Corrected input:`);
            console.log(`   Original: "${userInput}"`);
            console.log(`   Refined:  "${corrected}"`);
            console.log(`   Similarity: ${(similarity * 100).toFixed(1)}%`);

            return corrected;

        } catch (error) {
            console.error(`❌ [InputRefiner] Error: ${error.message}`);
            // Fallback to original on error
            return userInput;
        }
    }

    /**
     * Build correction prompt for Qwen
     */
    buildPrompt(userInput) {
        return `Periksa dan perbaiki HANYA typo atau kesalahan grammar dalam kalimat berikut.

ATURAN PENTING:
- Perbaiki HANYA typo yang jelas (contoh: "perk" → "merk", "brg" → "barang")
- JANGAN ubah nama brand, produk, atau istilah teknis
- JANGAN ubah angka, tanggal, atau kode
- JANGAN tambahkan penjelasan atau komentar
- Output HANYA kalimat yang sudah diperbaiki

Kalimat: ${userInput}

Kalimat yang diperbaiki:`;
    }

    /**
     * Call Qwen CLI for correction
     */
    async callQwen(prompt, session) {
        const tmpFile = `/tmp/qwen_input_refiner_${Date.now()}.txt`;

        try {
            // Write prompt to temp file
            await fs.writeFile(tmpFile, prompt);

            // Build Qwen command
            let cmd = `qwen chat`;

            // Use session if available
            if (session.qwenSessionId) {
                cmd += ` --resume ${session.qwenSessionId}`;
            }

            // Set schema context if available
            const envVars = [];
            if (session.tenantSchema) {
                envVars.push(`PGSCHEMA="${session.tenantSchema},prive,public"`);
                envVars.push(`DB_NAME="luckyjayagroup"`);
            }

            const envPrefix = envVars.length > 0 ? envVars.join(' ') + ' ' : '';
            const fullCmd = `${envPrefix}${cmd} < ${tmpFile}`;

            console.log(`🔧 [InputRefiner] Calling Qwen with ${session.qwenSessionId ? 'session' : 'new chat'}...`);

            // Execute Qwen
            const output = execSync(fullCmd, {
                encoding: 'utf-8',
                maxBuffer: 10 * 1024 * 1024,
                timeout: 10000 // 10 second timeout for quick response
            });

            // Extract corrected sentence
            const corrected = this.extractCorrectedSentence(output);

            return corrected;

        } finally {
            // Clean up temp file
            try {
                await fs.unlink(tmpFile);
            } catch (e) {
                // Ignore cleanup errors
            }
        }
    }

    /**
     * Extract the corrected sentence from Qwen output
     */
    extractCorrectedSentence(output) {
        // Look for the last "say:" message which contains the response
        const sayMatch = output.match(/say:\s*("?)([^\n]+?)\1\s*$/m);
        if (sayMatch && sayMatch[2]) {
            return sayMatch[2].trim();
        }

        // Fallback: get last non-empty line
        const lines = output.split('\n').filter(l => l.trim());
        if (lines.length > 0) {
            return lines[lines.length - 1].trim();
        }

        throw new Error('Could not extract corrected sentence from Qwen output');
    }

    /**
     * Calculate similarity between two strings (simple Levenshtein-based)
     */
    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;

        if (longer.length === 0) return 1.0;

        const distance = this.levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
        return (longer.length - distance) / longer.length;
    }

    /**
     * Levenshtein distance algorithm
     */
    levenshteinDistance(str1, str2) {
        const matrix = [];

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[str2.length][str1.length];
    }

    /**
     * Enable or disable the refiner
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        console.log(`🔧 [InputRefiner] ${enabled ? 'Enabled' : 'Disabled'}`);
    }
}

export { InputRefinerAgent };
