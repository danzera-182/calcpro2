// File: api/coingecko-proxy.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

const COINGECKO_API_BASE_URL = 'https://api.coingecko.com/api/v3';
// Use 'https://pro-api.coingecko.com/api/v3' if you have a Pro API key
// const COINGECKO_API_BASE_URL = 'https://pro-api.coingecko.com/api/v3';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const allowedOrigin = process.env.NODE_ENV === 'production' 
                         ? 'https://calcpro2.vercel.app' 
                         : '*'; 

  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-cg-pro-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET', 'OPTIONS']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { path, ...queryParams } = req.query;

  if (!path || typeof path !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid API path parameter.' });
  }

  // Construct the CoinGecko API URL
  let fullCoinGeckoUrl = `${COINGECKO_API_BASE_URL}/${path}`;
  
  const queryString = Object.entries(queryParams)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(Array.isArray(value) ? value[0] : value || '')}`)
    .join('&');

  if (queryString) {
    fullCoinGeckoUrl += `?${queryString}`;
  }
  
  const headers: HeadersInit = {
    'Accept': 'application/json',
    'User-Agent': 'TheWealthLab-CoinGecko-Proxy/1.0 (+https://calcpro2.vercel.app)',
  };

  // Add API key if available in Vercel environment variables
  // Important: Set COINGECKO_API_KEY in your Vercel project's Environment Variables.
  // If you are using the Pro API, make sure COINGECKO_API_BASE_URL points to the pro endpoint.
  const apiKey = process.env.COINGECKO_API_KEY;
  if (apiKey) {
    // For CoinGecko Pro API, the header is 'x-cg-pro-api-key'
    // For the public API, you can append `x_cg_demo_api_key=${apiKey}` or `x_cg_pro_api_key=${apiKey}` as a query param
    // depending on your key type. The header method is generally preferred for Pro.
    // This example assumes a Pro key if COINGECKO_API_KEY is set.
    // If using public API with a demo key, you might need to adjust how the key is sent.
    // headers['x-cg-pro-api-key'] = apiKey; // Uncomment if using Pro Key and header auth.
    // Or, append as query parameter if that's how your key works:
     if (fullCoinGeckoUrl.includes('?')) {
        fullCoinGeckoUrl += `&x_cg_demo_api_key=${apiKey}`; // or x_cg_pro_api_key
     } else {
        fullCoinGeckoUrl += `?x_cg_demo_api_key=${apiKey}`; // or x_cg_pro_api_key
     }
  }


  try {
    const fetchResponse = await fetch(fullCoinGeckoUrl, { headers });

    if (!fetchResponse.ok) {
      const errorText = await fetchResponse.text();
      let errorDetails = `CoinGecko API request failed: ${fetchResponse.status} ${fetchResponse.statusText}.`;
      try {
        const jsonError = JSON.parse(errorText);
        errorDetails += ` CoinGecko Error: ${jsonError.error || jsonError.status?.error_message || 'Unknown error structure'}`;
      } catch (e) {
        errorDetails += ` Response snippet: ${errorText.substring(0, 200)}`;
      }
      console.error(errorDetails, "URL:", fullCoinGeckoUrl);
      return res.status(fetchResponse.status).json({ 
        error: `Failed to fetch data from CoinGecko. Status: ${fetchResponse.status}`,
        details: errorDetails
      });
    }

    const data = await fetchResponse.json();

    res.setHeader('Content-Type', 'application/json');
    // Cache for 5 minutes on CDN, 1 minute on client
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');
    
    return res.status(200).json(data);

  } catch (error: any) {
    console.error('Error in CoinGecko proxy function:', error, "URL:", fullCoinGeckoUrl);
    return res.status(500).json({ 
      error: 'Internal Server Error while fetching from CoinGecko.',
      details: error.message 
    });
  }
}
