const fs = require('fs');

// Function to remove ANSI escape codes
function removeAnsiCodes(str) {
  return str.replace(/\x1B\].*?\x07/g, '').replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
}

// Read the messy result.json
const rawOutput = fs.readFileSync('result.json', 'utf8');

// Split by newlines and filter out empty lines
const lines = rawOutput.split('\n').filter(line => line.trim());

// Parse each line as JSON, remove ANSI codes first
const jsonObjects = [];
for (const line of lines) {
  try {
    const cleanedLine = removeAnsiCodes(line);
    const obj = JSON.parse(cleanedLine);
    jsonObjects.push(obj);
  } catch (e) {
    // Skip invalid lines
  }
}

// Find the completion_result event
const completion = jsonObjects.find(obj => obj.type === 'completion_result');

if (completion) {
  console.log('Jawaban akhir:');
  console.log(completion.content);
} else {
  console.log('Belum ada completion_result. Mungkin perintah masih berjalan.');
  console.log('JSON objects yang ditemukan:', jsonObjects.length);
}