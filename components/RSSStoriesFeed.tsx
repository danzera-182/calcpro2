
import React, { useState, useEffect, useCallback } from 'react';
import { NewsItem, StorySource } from '../types';
import { Card } from './ui/Card';
import StoryIcon from './ui/StoryIcon'; 
import StoryViewer from './StoryViewer'; 

// The actual G1 URL, the proxy will fetch this.
// const G1_ECONOMIA_RSS_URL = 'https://g1.globo.com/dynamo/economia/rss2.xml';
// New endpoint that will act as a proxy
const PROXY_RSS_URL = '/api/g1-economia-rss'; 

const RSSStoriesFeed: React.FC = () => {
  const [storySource, setStorySource] = useState<StorySource | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isViewerOpen, setIsViewerOpen] = useState<boolean>(false);
  const [currentItemIndex, setCurrentItemIndex] = useState<number>(0);

  const parseRSSFeed = (xmlText: string, sourceName: string, sourceId: string, sourceUrl: string): NewsItem[] => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "application/xml");
    const items: NewsItem[] = [];
    
    const errorNode = xmlDoc.querySelector("parsererror");
    if (errorNode) {
        console.error("Error parsing XML:", errorNode.textContent);
        // Check if the error is because the proxy returned an error message instead of XML
        if (xmlText.toLowerCase().includes("error") || xmlText.toLowerCase().includes("failed") || xmlText.startsWith("{")) {
             setError("O servidor intermediário (proxy) retornou um erro ao buscar o feed.");
        } else {
             setError("Falha ao processar o feed de notícias (formato XML inválido).");
        }
        return [];
    }

    xmlDoc.querySelectorAll("item").forEach(itemNode => {
      const title = itemNode.querySelector("title")?.textContent || "Sem título";
      const link = itemNode.querySelector("link")?.textContent || "";
      const pubDate = itemNode.querySelector("pubDate")?.textContent;
      let description = itemNode.querySelector("description")?.textContent || "";
      // Basic HTML tag removal for description snippet
      description = description.replace(/<[^>]+>/g, '').substring(0, 200) + (description.length > 200 ? "..." : "");
      
      let imageUrl: string | undefined;
      const mediaContent = itemNode.querySelector("media\\:content, content");
      if (mediaContent && mediaContent.getAttribute("url")) {
          imageUrl = mediaContent.getAttribute("url") || undefined;
          if (mediaContent.getAttribute("medium") === "image" || mediaContent.getAttribute("type")?.startsWith("image/")) {
            // it's good
          } else if (!imageUrl?.match(/\.(jpeg|jpg|gif|png)$/)) {
            imageUrl = undefined; 
          }
      }
      if(!imageUrl) {
        const enclosure = itemNode.querySelector("enclosure");
        if (enclosure && enclosure.getAttribute("url") && enclosure.getAttribute("type")?.startsWith("image/")) {
            imageUrl = enclosure.getAttribute("url") || undefined;
        }
      }

      items.push({
        id: link || title + (pubDate || Math.random().toString()),
        title,
        link,
        pubDate,
        description,
        imageUrl,
        sourceName: sourceName,
      });
    });
    return items;
  };

  const fetchFeed = useCallback(async () => {
    setIsLoading(true);
    setError(null); // Clear previous errors before a new fetch
    try {
      const response = await fetch(PROXY_RSS_URL); 

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Proxy response error:", errorText);
        throw new Error(`Falha ao buscar feed via proxy: ${response.status} ${response.statusText}. Detalhes: ${errorText.substring(0,100)}`);
      }
      const xmlText = await response.text();
      const parsedItems = parseRSSFeed(xmlText, "G1 Economia", "g1-economia", PROXY_RSS_URL);
      
      if (parsedItems.length > 0) {
        setStorySource({
          id: "g1-economia",
          name: "G1 Economia",
          rssUrl: PROXY_RSS_URL, // Technically this is the proxy URL now
          iconUrl: "https://s.glbimg.com/כן/g1/images/2018/11/05/favicon.ico",
          items: parsedItems,
          lastFetched: new Date(),
          color: "#C4170C", 
        });
      } else if (!error) { 
        setError("Nenhuma notícia encontrada no feed ou feed vazio após processamento.");
      }

    } catch (e: any) {
      console.error("Error fetching RSS feed via proxy:", e);
      if (!error) { // Avoid overwriting a more specific error from parseRSSFeed
          setError(e.message || "Ocorreu um erro desconhecido ao buscar as notícias.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [error]); // Added error to ensure parseRSSFeed error isn't overwritten by a generic one in catch

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]); // fetchFeed is stable due to useCallback

  const handleStoryIconClick = (sourceId: string) => {
    if (storySource && storySource.id === sourceId && storySource.items.length > 0) {
      setCurrentItemIndex(0);
      setIsViewerOpen(true);
    }
  };

  const handleCloseViewer = () => {
    setIsViewerOpen(false);
  };

  const handleNextItem = () => {
    if (storySource && currentItemIndex < storySource.items.length - 1) {
      setCurrentItemIndex(prev => prev + 1);
    } else {
      handleCloseViewer(); 
    }
  };

  const handlePrevItem = () => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex(prev => prev - 1);
    }
  };

  if (isLoading && !storySource) {
    return (
      <Card>
        <Card.Header><Card.Title>Feed de Notícias</Card.Title></Card.Header>
        <Card.Content className="text-center py-10">
          <svg className="animate-spin h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Carregando notícias...
        </Card.Content>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Card.Header><Card.Title>Feed de Notícias</Card.Title></Card.Header>
        <Card.Content className="text-center py-10 text-red-600 dark:text-red-400">
          <p>{error}</p>
          <p className="text-xs mt-2">Verifique se o servidor intermediário (proxy) está configurado e funcionando corretamente.</p>
        </Card.Content>
      </Card>
    );
  }
  
  if (!storySource || storySource.items.length === 0) {
     return (
      <Card>
        <Card.Header><Card.Title>Feed de Notícias</Card.Title></Card.Header>
        <Card.Content className="text-center py-10 text-slate-500 dark:text-slate-400">
            Nenhuma notícia disponível no momento.
        </Card.Content>
      </Card>
    );
  }

  return (
    <div className="w-full">
      <Card>
        <Card.Header>
          <Card.Title className="text-xl font-semibold">Stories de Notícias</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="flex space-x-4 overflow-x-auto py-3 px-1">
            {storySource && (
              <StoryIcon
                source={storySource}
                onClick={() => handleStoryIconClick(storySource.id)}
              />
            )}
          </div>
          <p className="text-xs text-center text-slate-500 dark:text-slate-400 mt-2">
            Fonte: {storySource.name}. As notícias são buscadas através de um servidor intermediário.
          </p>
        </Card.Content>
      </Card>

      {isViewerOpen && storySource && storySource.items.length > 0 && (
        <StoryViewer
          source={storySource}
          currentItem={storySource.items[currentItemIndex]}
          currentItemIndex={currentItemIndex}
          totalItems={storySource.items.length}
          onClose={handleCloseViewer}
          onNext={handleNextItem}
          onPrev={handlePrevItem}
        />
      )}
    </div>
  );
};

export default RSSStoriesFeed;
