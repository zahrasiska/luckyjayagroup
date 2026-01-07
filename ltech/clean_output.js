const fs = require('fs');

// Function to remove ANSI escape codes
function removeAnsiCodes(str) {
  return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
}

// Get input from file or stdin
let rawOutput;
if (process.argv[2]) {
  // Read from file
  rawOutput = fs.readFileSync(process.argv[2], 'utf8');
} else {
  // Read from stdin
  rawOutput = fs.readFileSync(0, 'utf8');
}

// Try to parse the entire input as JSON first
let jsonObjects = [];
try {
  const cleanedOutput = removeAnsiCodes(rawOutput.trim());
  const parsed = JSON.parse(cleanedOutput);
  if (Array.isArray(parsed)) {
    jsonObjects = parsed;
  } else {
    jsonObjects = [parsed];
  }
} catch (e) {
  // Fallback: split by newlines and parse each line
  const lines = rawOutput.split('\n').filter(line => line.trim());
  for (const line of lines) {
    try {
      const cleanedLine = removeAnsiCodes(line);
      const obj = JSON.parse(cleanedLine);
      jsonObjects.push(obj);
    } catch (e2) {
      // Skip invalid lines
      console.error('Skipping invalid line:', line);
    }
  }
}

// Filter for final answer: objects with type "say", say "text", and extract content
const finalAnswer = jsonObjects
  .filter(obj => obj.type === 'say' && obj.say === 'text')
  .map(obj => obj.content)
  .join('\n');

// Output the final answer to stdout
console.log(finalAnswer);