/**
 * Utility: Web Search (Simple Scraper)
 * Uses DuckDuckGo HTML to fetch search snippets.
 */
import axios from 'axios';
import * as cheerio from 'cheerio';

async function duckDuckGoSearch(query) {
    try {
        const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const $ = cheerio.load(data);
        const results = [];

        $('.result').each((i, element) => {
            if (i >= 5) return false; // Limit to 5 results
            const title = $(element).find('.result__title').text().trim();
            const snippet = $(element).find('.result__snippet').text().trim();
            const link = $(element).find('.result__url').attr('href');

            if (title && snippet) {
                results.push({ title, snippet, link });
            }
        });

        return results;
    } catch (error) {
        console.error("Search Error:", error.message);
        return [];
    }
}

export default { duckDuckGoSearch };
