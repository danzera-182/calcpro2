// File: api/anbima-proxy.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

const ANBIMA_OAUTH_URL = 'https://api.anbima.com.br/oauth/access-token';
const ANBIMA_API_BASE_URL = 'https://api.anbima.com.br/feed/ettj/v1/curves';

interface AnbimaTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const allowedOrigin = process.env.NODE_ENV === 'production' 
                         ? 'https://calcpro2.vercel.app' 
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

  const { curveType, date } = req.query;

  if (!curveType || typeof curveType !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid curveType parameter.' });
  }
  if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Missing or invalid date parameter (must be YYYY-MM-DD).' });
  }

  const clientId = process.env.ANBIMA_CLIENT_ID;
  const clientSecret = process.env.ANBIMA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('Anbima API credentials (ANBIMA_CLIENT_ID or ANBIMA_CLIENT_SECRET) are not set in environment variables.');
    return res.status(500).json({ error: 'Configuration error: Anbima API credentials not set on server.' });
  }

  let accessToken: string;

  try {
    // 1. Obtain Access Token
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const tokenResponse = await fetch(ANBIMA_OAUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`,
      },
      body: JSON.stringify({ grant_type: 'client_credentials' }),
    });

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      console.error(`Error obtaining Anbima access token: ${tokenResponse.status} ${tokenResponse.statusText}`, errorBody.substring(0, 500));
      let errorDetails = `Failed to obtain Anbima access token. Status: ${tokenResponse.status}.`;
       try {
        const jsonError = JSON.parse(errorBody);
        errorDetails += ` Anbima Message: ${jsonError.error_description || jsonError.error || jsonError.Message || 'Unknown error structure'}`;
      } catch(e) {
        errorDetails += ` Response: ${errorBody.substring(0,200)}`;
      }
      return res.status(tokenResponse.status).json({ error: errorDetails });
    }

    const tokenData = await tokenResponse.json() as AnbimaTokenResponse;
    accessToken = tokenData.access_token;

    if (!accessToken) {
        throw new Error("Access token not found in Anbima's response.");
    }

  } catch (error: any) {
    console.error('Error during Anbima OAuth token exchange:', error);
    return res.status(500).json({ 
      error: 'Internal Server Error during Anbima authentication.',
      details: error.message 
    });
  }

  // 2. Fetch Curve Data using the obtained Access Token
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
      console.error(`Error fetching Anbima curve data from ${anbimaApiUrl}: ${fetchResponse.status} ${fetchResponse.statusText}`, errorBody.substring(0, 500));
      let errorDetails = `Failed to fetch curve data from Anbima. Status: ${fetchResponse.status}.`;
      try {
        const jsonError = JSON.parse(errorBody);
        errorDetails += ` Anbima Message: ${jsonError.message || jsonError.Message || jsonError.error || 'Unknown error structure'}`;
        if (jsonError.erros && Array.isArray(jsonError.erros) && jsonError.erros.length > 0) {
            errorDetails += ` Details: ${jsonError.erros.map((e:any) => `${e.campo}: ${e.mensagem}`).join(', ')}`;
        } else if (jsonError.errors && Array.isArray(jsonError.errors) && jsonError.errors.length > 0) {
             errorDetails += ` Details: ${jsonError.errors.map((e:any) => `${e.field}: ${e.defaultMessage}`).join(', ')}`;
        } else if (jsonError.Mensagem) { // Another possible error format
            errorDetails += ` Details: ${jsonError.Mensagem}`;
        }
      } catch(e) {
        errorDetails += ` Response: ${errorBody.substring(0,200)}`;
      }
      
      return res.status(fetchResponse.status).json({ 
        error: errorDetails,
      });
    }

    const data = await fetchResponse.json();

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=900'); 
    
    return res.status(200).json(data);

  } catch (error: any) {
    console.error(`Error in Anbima proxy (data fetch) for ${anbimaApiUrl}:`, error);
    return res.status(500).json({ 
      error: 'Internal Server Error while fetching curve data from Anbima.',
      details: error.message 
    });
  }
}