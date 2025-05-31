// File: api/g1-economia-rss.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

const G1_ECONOMIA_RSS_URL = 'https://g1.globo.com/dynamo/economia/rss2.xml';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Defina o domínio da sua aplicação frontend aqui para produção.
  // Para desenvolvimento local, '*' pode ser usado, mas NÃO é recomendado para produção.
  const allowedOrigin = process.env.NODE_ENV === 'production' 
                         ? 'https://calcpro2.vercel.app' // Seu domínio Vercel de produção
                         : '*'; 

  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, User-Agent');

  // Lidar com requisições OPTIONS (preflight) para CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET', 'OPTIONS']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const fetchResponse = await fetch(G1_ECONOMIA_RSS_URL, {
      headers: {
        // Alguns feeds podem ser sensíveis ao User-Agent.
        'User-Agent': 'TheWealthLab-RSS-Proxy/1.0 (+https://calcpro2.vercel.app)', // Considere adicionar a URL da sua app
      },
    });

    if (!fetchResponse.ok) {
      const errorText = await fetchResponse.text();
      console.error(`Error fetching G1 RSS feed: ${fetchResponse.status} ${fetchResponse.statusText}`, errorText.substring(0, 500));
      return res.status(fetchResponse.status).json({ 
        error: `Failed to fetch RSS feed from G1. Status: ${fetchResponse.status}`,
        details: `Upstream server returned: ${fetchResponse.statusText}. Response snippet: ${errorText.substring(0, 200)}`
      });
    }

    const rssXmlText = await fetchResponse.text();

    // Verificar se o conteúdo é XML válido (forma básica)
    if (!rssXmlText.trim().startsWith('<')) {
        console.error("Received non-XML content from G1 feed:", rssXmlText.substring(0, 500));
        return res.status(502).json({
            error: "Bad Gateway",
            details: "The upstream server (G1) returned non-XML content."
        });
    }

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    // Cache por 15 minutos no CDN do Vercel e no browser do cliente
    // stale-while-revalidate permite que o cache antigo seja servido enquanto o novo é buscado
    res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=300'); 
    
    return res.status(200).send(rssXmlText);

  } catch (error: any) {
    console.error('Error in G1 RSS proxy function:', error);
    return res.status(500).json({ 
      error: 'Internal Server Error while fetching RSS feed.',
      details: error.message 
    });
  }
}