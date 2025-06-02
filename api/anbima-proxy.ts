
// File: api/anbima-proxy.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Base URL for Anbima ETTJ feed API
const ANBIMA_API_BASE_URL = 'https://api.anbima.com.br/feed/ettj/v1/curves';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const allowedOrigin = process.env.NODE_ENV === 'production' 
                         ? 'https://calcpro2.vercel.app' // Replace with your production frontend URL
                         : '*'; 

  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET', 'OPTIONS']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { curveType, date } = req.query; // e.g., curveType=PRE, date=YYYY-MM-DD

  if (!curveType || typeof curveType !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid curveType parameter.' });
  }
  if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Missing or invalid date parameter (must be YYYY-MM-DD).' });
  }

  const clientId = process.env.ANBIMA_CLIENT_ID;
  const accessToken = process.env.ANBIMA_ACCESS_TOKEN;

  if (!clientId || !accessToken) {
    console.error('Anbima API credentials (ANBIMA_CLIENT_ID or ANBIMA_ACCESS_TOKEN) are not set in environment variables.');
    return res.status(500).json({ error: 'Configuration error: Anbima API credentials not set on server.' });
  }

  const anbimaApiUrl = `${ANBIMA_API_BASE_URL}/${curveType.toUpperCase()}/${date}`;

  try {
    const fetchResponse = await fetch(anbimaApiUrl, {
      headers: {
        'client_id': clientId,
        'access_token': accessToken,
        'Accept': 'application/json',
        'User-Agent': 'TheWealthLab-AnbimaProxy/1.0', 
      },
    });

    if (!fetchResponse.ok) {
      const errorBody = await fetchResponse.text();
      console.error(`Error fetching Anbima data from ${anbimaApiUrl}: ${fetchResponse.status} ${fetchResponse.statusText}`, errorBody.substring(0, 500));
      let errorDetails = `Failed to fetch data from Anbima. Status: ${fetchResponse.status}.`;
      try {
        const jsonError = JSON.parse(errorBody);
        errorDetails += ` Anbima Message: ${jsonError.message || jsonError.Message || jsonError.error || 'Unknown error structure'}`;
        if (jsonError.erros && Array.isArray(jsonError.erros)) {
            errorDetails += ` Details: ${jsonError.erros.map((e:any) => e.mensagem).join(', ')}`;
        }
      } catch(e) {
        // if errorBody is not JSON
        errorDetails += ` Response: ${errorBody.substring(0,200)}`;
      }
      
      return res.status(fetchResponse.status).json({ 
        error: errorDetails,
      });
    }

    const data = await fetchResponse.json();

    res.setHeader('Content-Type', 'application/json');
    // Cache for 1 hour on CDN, 15 minutes on client for ETTJ data
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=900'); 
    
    return res.status(200).json(data);

  } catch (error: any) {
    console.error(`Error in Anbima proxy function for ${anbimaApiUrl}:`, error);
    return res.status(500).json({ 
      error: 'Internal Server Error while fetching from Anbima.',
      details: error.message 
    });
  }
}
