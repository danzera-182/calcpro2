
// File: api/rss-proxy.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Lista de domínios de RSS permitidos para segurança
const ALLOWED_RSS_DOMAINS = [
  'g1.globo.com',
  'valor.globo.com',
  'www.infomoney.com.br',
  'feeds.folha.uol.com.br',
  'exame.com',
  'www.estadao.com.br',
  // Adicione outros domínios de RSS confiáveis aqui
];

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const allowedOrigin = process.env.NODE_ENV === 'production' 
                         ? 'https://calcpro2.vercel.app' // Seu domínio Vercel de produção
                         : '*'; 

  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, User-Agent');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET', 'OPTIONS']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const targetUrl = req.query.url as string;

  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing target RSS URL parameter (url).' });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(targetUrl);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid target RSS URL format.' });
  }

  if (!ALLOWED_RSS_DOMAINS.includes(parsedUrl.hostname)) {
    console.warn(`Attempt to access disallowed domain: ${parsedUrl.hostname}`);
    return res.status(403).json({ error: 'Access to this RSS feed domain is not allowed.' });
  }

  try {
    const fetchResponse = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'TheWealthLab-RSS-Proxy/1.0 (+https://calcpro2.vercel.app)',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
      redirect: 'follow', // Seguir redirecionamentos
    });

    if (!fetchResponse.ok) {
      const errorText = await fetchResponse.text();
      console.error(`Error fetching RSS feed from ${targetUrl}: ${fetchResponse.status} ${fetchResponse.statusText}`, errorText.substring(0, 500));
      return res.status(fetchResponse.status).json({ 
        error: `Failed to fetch RSS feed from ${parsedUrl.hostname}. Status: ${fetchResponse.status}`,
        details: `Upstream server returned: ${fetchResponse.statusText}. Response snippet: ${errorText.substring(0, 200)}`
      });
    }

    const responseContentType = fetchResponse.headers.get('content-type');
    if (!responseContentType || (!responseContentType.includes('xml') && !responseContentType.includes('rss'))) {
        console.warn(`Received non-XML content-type (${responseContentType}) from ${targetUrl}`);
        // Não vamos bloquear, mas é um aviso. A validação do XML abaixo pode pegar problemas.
    }
    
    const rssXmlText = await fetchResponse.text();

    if (!rssXmlText.trim().startsWith('<')) {
        console.error(`Received non-XML content from ${targetUrl}:`, rssXmlText.substring(0, 500));
        return res.status(502).json({
            error: "Bad Gateway",
            details: `The upstream server (${parsedUrl.hostname}) returned non-XML content.`
        });
    }
    
    // Determinar o charset da resposta original, se disponível, e usá-lo
    let charset = 'utf-8'; // Default
    if (responseContentType) {
        const match = responseContentType.match(/charset=([^;]+)/i);
        if (match && match[1]) {
            charset = match[1].toLowerCase();
        }
    }
    // Garante que o Content-Type retornado seja XML com o charset correto
    res.setHeader('Content-Type', `application/xml; charset=${charset}`);
    res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=300'); // Cache de 15 min
    
    return res.status(200).send(rssXmlText);

  } catch (error: any) {
    console.error(`Error in RSS proxy function for ${targetUrl}:`, error);
    return res.status(500).json({ 
      error: 'Internal Server Error while fetching RSS feed.',
      details: error.message 
    });
  }
}
