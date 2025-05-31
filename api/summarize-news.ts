// File: api/summarize-news.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
// Ensure 'cheerio' is in your package.json for Vercel deployment
import * as cheerio from 'cheerio'; 

// Helper function to fetch with timeout
async function fetchWithTimeout(resource: string, options: RequestInit & { timeout?: number } = {}) {
  const { timeout = 15000 } = options; // Default 15 seconds timeout
  
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  const response = await fetch(resource, {
    ...options,
    signal: controller.signal  
  });
  clearTimeout(id);
  return response;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const allowedOrigin = process.env.NODE_ENV === 'production' 
                         ? 'https://calcpro2.vercel.app'
                         : '*'; 

  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'OPTIONS']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { articleUrl } = req.body;

  if (!articleUrl || typeof articleUrl !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid articleUrl in request body.' });
  }

  try {
    new URL(articleUrl); // Validate URL format
  } catch (e) {
    return res.status(400).json({ error: 'Invalid article URL format.' });
  }
  
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY for Gemini is not set in environment variables.");
    return res.status(500).json({ error: 'AI service configuration error.' });
  }

  try {
    // 1. Fetch article content
    const articleResponse = await fetchWithTimeout(articleUrl, {
      headers: { 'User-Agent': 'TheWealthLab-NewsSummarizer/1.0 (+https://calcpro2.vercel.app)' },
      timeout: 10000 // 10 seconds for fetching article
    });

    if (!articleResponse.ok) {
      throw new Error(`Failed to fetch article: ${articleResponse.status} ${articleResponse.statusText}`);
    }
    const htmlContent = await articleResponse.text();

    // 2. Extract text using Cheerio
    const $ = cheerio.load(htmlContent);
    let articleText = '';
    
    // Try common selectors for main content
    const selectors = ['article', 'main', '.post-content', '.entry-content', 'div[role="main"]', 'body'];
    let foundContent = false;
    for (const selector of selectors) {
        const element = $(selector);
        if (element.length) {
            element.find('p, h1, h2, h3, li').each((i, el) => {
                articleText += $(el).text().trim() + '\n';
            });
            if (articleText.trim().length > 200) { // Check if substantial text is found
                foundContent = true;
                break;
            }
        }
        if (foundContent) break;
        articleText = ''; // Reset if not enough content from this selector
    }
     if (!foundContent) { // Fallback if specific selectors fail
        $('p').each((i, el) => {
          articleText += $(el).text().trim() + '\n';
        });
    }
    
    articleText = articleText.replace(/\s\s+/g, ' ').trim(); // Clean up whitespace
    const MAX_TEXT_LENGTH = 15000; // Limit text to avoid huge payloads to Gemini
    if (articleText.length > MAX_TEXT_LENGTH) {
      articleText = articleText.substring(0, MAX_TEXT_LENGTH) + "... (conteúdo truncado)";
    }
    
    if (!articleText.trim()) {
        console.warn(`No text content extracted from ${articleUrl}`);
        return res.status(200).json({ summary: "Não foi possível extrair conteúdo textual do artigo para resumir." });
    }

    // 3. Summarize with Gemini
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Você é um assistente especialista em finanças. Por favor, resuma o seguinte artigo de notícias em português brasileiro, focando nos principais pontos econômicos e financeiros. Seja conciso e informativo, em no máximo 3 frases curtas. Artigo: \n\n${articleText}`;
    
    const geminiResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-04-17',
      contents: prompt,
    });

    const summary = geminiResponse.text || "Não foi possível gerar um resumo.";

    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400'); // Cache for 1h, SWR 1 day
    return res.status(200).json({ summary });

  } catch (error: any) {
    console.error(`Error in summarize-news function for ${articleUrl}:`, error);
    let errorMessage = 'Failed to summarize news article.';
    if (error.message.includes('fetch article')) {
        errorMessage = `Erro ao buscar o conteúdo do artigo: ${error.message.replace('Failed to fetch article: ', '')}. Verifique a URL ou tente mais tarde.`;
    } else if (error.message.includes('timeout')) {
        errorMessage = 'Tempo limite excedido ao buscar o conteúdo do artigo.';
    } else if (error.message.toLowerCase().includes('token')) {
        errorMessage = 'O conteúdo do artigo é muito longo para ser processado pela IA neste momento.';
    }
    return res.status(500).json({ error: errorMessage, details: error.message });
  }
}
