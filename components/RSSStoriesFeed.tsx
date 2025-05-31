
import React, { useState, useEffect, useCallback } from 'react';
import { NewsItem, StorySource } from '../types';
import { Card } from './ui/Card';
import StoryIcon from './ui/StoryIcon';
import StoryViewer from './StoryViewer';
import NewsSummaryCard from './ui/NewsSummaryCard'; // Import the new component

const INITIAL_SOURCES: Omit<StorySource, 'items' | 'lastFetched'>[] = [
  {
    id: "g1-economia",
    name: "G1 Economia",
    rssUrl: 'https://g1.globo.com/dynamo/economia/rss2.xml',
    iconUrl: "https://s.glbimg.com/כן/g1/images/2018/11/05/favicon.ico",
    color: "#C4170C",
  },
  {
    id: "valor-economico",
    name: "Valor Econômico",
    rssUrl: 'https://valor.globo.com/rss/ValorEconomico/economia',
    iconUrl: "https://s.valorstatic.com.br/meta/valor-economico/images/favicon.ico",
    color: "#00549f",
  },
  {
    id: "infomoney",
    name: "InfoMoney",
    rssUrl: 'https://www.infomoney.com.br/feed/',
    iconUrl: "https://www.infomoney.com.br/wp-content/uploads/2023/06/cropped-favicon-infomoney-novo-32x32.png",
    color: "#f39c12",
  }
];

const PROXY_BASE_URL = '/api/rss-proxy?url=';
const SUMMARIZE_API_URL = '/api/summarize-news';
const MAX_SUMMARIES_TO_SHOW = 3;

interface SummaryState {
  summary: string | null;
  isLoading: boolean;
  error: string | null;
}

const RSSStoriesFeed: React.FC = () => {
  const [storySources, setStorySources] = useState<StorySource[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isViewerOpen, setIsViewerOpen] = useState<boolean>(false);
  const [selectedSourceForViewer, setSelectedSourceForViewer] = useState<StorySource | null>(null);
  const [currentItemIndexInViewer, setCurrentItemIndexInViewer] = useState<number>(0);

  const [highlightedNewsItems, setHighlightedNewsItems] = useState<NewsItem[]>([]);
  const [summaries, setSummaries] = useState<Record<string, SummaryState>>({});

  const parseRSSFeed = (xmlText: string, sourceName: string): NewsItem[] => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "application/xml");
    const itemsList: NewsItem[] = [];
    
    const errorNode = xmlDoc.querySelector("parsererror");
    if (errorNode) {
        console.error(`Error parsing XML for ${sourceName}:`, errorNode.textContent);
        if (xmlText.toLowerCase().includes("error") || xmlText.toLowerCase().includes("failed") || xmlText.startsWith("{")) {
            // Handled by fetch logic
        } else {
            setError(prev => prev ? `${prev}\nFalha ao processar feed de ${sourceName} (XML inválido).` : `Falha ao processar feed de ${sourceName} (XML inválido).`);
        }
        return [];
    }

    xmlDoc.querySelectorAll("item").forEach(itemNode => {
      const title = itemNode.querySelector("title")?.textContent || "Sem título";
      const link = itemNode.querySelector("link")?.textContent || "";
      const pubDate = itemNode.querySelector("pubDate")?.textContent;
      let description = itemNode.querySelector("description")?.textContent || "";
      description = description.replace(/<[^>]+>/g, '').substring(0, 200) + (description.length > 200 ? "..." : "");
      
      let imageUrl: string | undefined;
      const mediaContent = itemNode.querySelector("media\\:content, content");
      if (mediaContent && mediaContent.getAttribute("url")) {
          imageUrl = mediaContent.getAttribute("url") || undefined;
          if (!(mediaContent.getAttribute("medium") === "image" || mediaContent.getAttribute("type")?.startsWith("image/"))) {
            if (!imageUrl?.match(/\.(jpeg|jpg|gif|png)$/i)) {
              imageUrl = undefined; 
            }
          }
      }
      if(!imageUrl) {
        const enclosure = itemNode.querySelector("enclosure");
        if (enclosure && enclosure.getAttribute("url") && enclosure.getAttribute("type")?.startsWith("image/")) {
            imageUrl = enclosure.getAttribute("url") || undefined;
        }
      }

      itemsList.push({
        id: link || title + (pubDate || Math.random().toString()),
        title,
        link,
        pubDate,
        description,
        imageUrl,
        sourceName: sourceName,
      });
    });
    return itemsList;
  };

  const fetchAllFeeds = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setHighlightedNewsItems([]);
    setSummaries({});
    let allFetchedSources: StorySource[] = [];
    let aggregatedErrorMessages = "";

    for (const initialSource of INITIAL_SOURCES) {
      try {
        const proxyUrl = `${PROXY_BASE_URL}${encodeURIComponent(initialSource.rssUrl)}`;
        const response = await fetch(proxyUrl);

        if (!response.ok) {
          const errorText = await response.text().catch(() => `Status: ${response.status}`);
          throw new Error(`Falha ao buscar feed de ${initialSource.name}: ${response.status}. Detalhes: ${errorText.substring(0,100)}`);
        }
        const xmlText = await response.text();
        const parsedItems = parseRSSFeed(xmlText, initialSource.name);
        
        if (parsedItems.length > 0) {
          allFetchedSources.push({
            ...initialSource,
            items: parsedItems,
            lastFetched: new Date(),
          });
        }
      } catch (e: any) {
        aggregatedErrorMessages += `${e.message || `Erro desconhecido ao buscar ${initialSource.name}`}\n`;
      }
    }
    
    setStorySources(allFetchedSources);
    if (aggregatedErrorMessages) {
        setError(aggregatedErrorMessages.trim());
    }
    if(allFetchedSources.length === 0 && !aggregatedErrorMessages){
        setError("Nenhuma notícia encontrada.");
    }
    setIsLoading(false);

    // After fetching all feeds, select items for summarization
    if (allFetchedSources.length > 0) {
        const allNewsItems = allFetchedSources.flatMap(source => source.items);
        allNewsItems.sort((a, b) => {
            try {
                return (new Date(b.pubDate || 0).getTime()) - (new Date(a.pubDate || 0).getTime());
            } catch { return 0; }
        });
        setHighlightedNewsItems(allNewsItems.slice(0, MAX_SUMMARIES_TO_SHOW));
    }
  }, []); 

  useEffect(() => {
    fetchAllFeeds();
  }, [fetchAllFeeds]);

  // Fetch summaries for highlighted news items
  useEffect(() => {
    if (highlightedNewsItems.length > 0) {
      highlightedNewsItems.forEach(item => {
        if (!summaries[item.id] || (!summaries[item.id].summary && !summaries[item.id].isLoading && !summaries[item.id].error)) {
          setSummaries(prev => ({
            ...prev,
            [item.id]: { summary: null, isLoading: true, error: null }
          }));

          fetch(SUMMARIZE_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ articleUrl: item.link })
          })
          .then(res => {
            if (!res.ok) {
              return res.json().then(errData => {
                throw new Error(errData.error || `HTTP error ${res.status}`);
              });
            }
            return res.json();
          })
          .then(data => {
            setSummaries(prev => ({
              ...prev,
              [item.id]: { summary: data.summary, isLoading: false, error: null }
            }));
          })
          .catch(e => {
            console.error(`Error summarizing ${item.link}:`, e);
            setSummaries(prev => ({
              ...prev,
              [item.id]: { summary: null, isLoading: false, error: e.message || "Falha ao resumir." }
            }));
          });
        }
      });
    }
  }, [highlightedNewsItems, summaries]);


  const handleStoryIconClick = (source: StorySource) => {
    if (source.items.length > 0) {
      setSelectedSourceForViewer(source);
      setCurrentItemIndexInViewer(0);
      setIsViewerOpen(true);
    }
  };

  const handleCloseViewer = () => setIsViewerOpen(false);
  const handleNextItem = () => {
    if (selectedSourceForViewer && currentItemIndexInViewer < selectedSourceForViewer.items.length - 1) {
      setCurrentItemIndexInViewer(prev => prev + 1);
    } else {
      handleCloseViewer(); 
    }
  };
  const handlePrevItem = () => {
    if (currentItemIndexInViewer > 0) setCurrentItemIndexInViewer(prev => prev - 1);
  };
  
  const activeStorySources = storySources.filter(s => s.items && s.items.length > 0);

  const renderLoadingState = () => (
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

  const renderErrorState = (errorMessage: string) => (
    <Card>
      <Card.Header><Card.Title>Feed de Notícias</Card.Title></Card.Header>
      <Card.Content className="text-center py-10 text-red-600 dark:text-red-400">
        <p className="whitespace-pre-line">{errorMessage}</p>
        <p className="text-xs mt-2">Verifique se os servidores (proxy e sumarizador) estão configurados e funcionando.</p>
      </Card.Content>
    </Card>
  );

  if (isLoading && activeStorySources.length === 0) return renderLoadingState();
  if (error && activeStorySources.length === 0 && highlightedNewsItems.length === 0) return renderErrorState(error);
  if (activeStorySources.length === 0 && highlightedNewsItems.length === 0 && !isLoading) {
     return renderErrorState(error || "Nenhuma notícia disponível.");
  }

  return (
    <div className="w-full space-y-8">
      <Card>
        <Card.Header>
          <Card.Title className="text-xl font-semibold">Stories de Notícias</Card.Title>
        </Card.Header>
        <Card.Content>
          {isLoading && activeStorySources.length > 0 && (
            <p className="text-xs text-center text-slate-500 dark:text-slate-400 mb-2">Atualizando feeds em segundo plano...</p>
          )}
          {activeStorySources.length > 0 ? (
            <div className="flex space-x-4 overflow-x-auto py-3 px-1">
              {activeStorySources.map(source => (
                <StoryIcon
                  key={source.id}
                  source={source}
                  onClick={() => handleStoryIconClick(source)}
                />
              ))}
            </div>
          ) : (
             !isLoading && <p className="text-sm text-center text-slate-500 dark:text-slate-400 py-3">Nenhum story disponível no momento.</p>
          )}
          {error && activeStorySources.length > 0 && (
            <p className="text-xs text-center text-red-500 dark:text-red-400 mt-2 whitespace-pre-line">
                Atenção: {error} (Alguns feeds podem não ter carregado)
            </p>
          )}
        </Card.Content>
      </Card>

      {/* News Summary Cards Section */}
      {highlightedNewsItems.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-4">Notícias em Destaque com IA</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {highlightedNewsItems.map(item => {
              const summaryState = summaries[item.id] || { summary: null, isLoading: true, error: null };
              return (
                <NewsSummaryCard
                  key={item.id}
                  item={item}
                  summary={summaryState.summary}
                  isLoadingSummary={summaryState.isLoading}
                  summaryError={summaryState.error}
                />
              );
            })}
          </div>
        </div>
      )}
      {activeStorySources.length === 0 && highlightedNewsItems.length === 0 && !isLoading && error && (
         <p className="text-sm text-center text-red-500 dark:text-red-400 py-3">
            Erro ao carregar notícias em destaque: {error}
         </p>
      )}


      {isViewerOpen && selectedSourceForViewer && selectedSourceForViewer.items.length > 0 && (
        <StoryViewer
          source={selectedSourceForViewer}
          currentItem={selectedSourceForViewer.items[currentItemIndexInViewer]}
          currentItemIndex={currentItemIndexInViewer}
          totalItems={selectedSourceForViewer.items.length}
          onClose={handleCloseViewer}
          onNext={handleNextItem}
          onPrev={handlePrevItem}
        />
      )}
    </div>
  );
};

export default RSSStoriesFeed;
