
import React, { useState, useEffect, useCallback } from 'react';
import { NewsItem, StorySource, ArticleForSummary } from '../types'; 
import { Card } from './ui/Card';
import StoryIcon from './ui/StoryIcon';
import StoryViewer from './StoryViewer';
import Button from './ui/Button'; 

const INITIAL_SOURCES: Omit<StorySource, 'items' | 'lastFetched'>[] = [
  {
    id: "g1-economia",
    name: "G1 Economia",
    rssUrl: 'https://g1.globo.com/dynamo/economia/rss2.xml',
    iconUrl: "https://s.glbimg.com/כן/g1/images/2018/11/05/favicon.ico",
    color: "#C4170C",
  },
  {
    id: "infomoney",
    name: "InfoMoney",
    rssUrl: 'https://www.infomoney.com.br/feed/',
    iconUrl: "https://www.infomoney.com.br/wp-content/uploads/2023/06/cropped-favicon-infomoney-novo-32x32.png",
    color: "#f39c12",
  },
  {
    id: "cointelegraph-br",
    name: "Cointelegraph BR",
    rssUrl: 'https://br.cointelegraph.com/rss',
    iconUrl: "https://br.cointelegraph.com/icons/icon-96x96.png", 
    color: "#FDB913", 
  },
  {
    id: "suno-noticias",
    name: "Suno Notícias",
    rssUrl: 'https://www.suno.com.br/noticias/feed/',
    iconUrl: "https://www.suno.com.br/wp-content/uploads/2021/03/cropped-favicon-suno-32x32.png",
    color: "#0056B3", // Suno Blue
  },
  {
    id: "folha-mercado",
    name: "Folha Mercado",
    rssUrl: 'https://feeds.folha.uol.com.br/mercado/rss091.xml',
    iconUrl: "https://static.folha.uol.com.br/site/images/favicon/32x32.png",
    color: "#000000", // Folha Black
  },
  {
    id: "reuters-news",
    name: "Reuters News (BR)",
    rssUrl: 'https://ir.thomsonreuters.com/rss/news-releases.xml?items=15', // This is general TR news, hopefully localized or relevant
    iconUrl: "https://ir.thomsonreuters.com/themes/TR/favicon.ico",
    color: "#FF8000", // Reuters Orange
  }
];

const PROXY_BASE_URL = '/api/rss-proxy?url=';
const MAX_ITEMS_FOR_ANALYSIS = 6;

interface RSSStoriesFeedProps {
  onSelectArticleForSummary: (article: ArticleForSummary) => void;
}

const WarningIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
);

const RefreshCwIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);

const RSSStoriesFeed: React.FC<RSSStoriesFeedProps> = ({ onSelectArticleForSummary }) => {
  const [storySources, setStorySources] = useState<StorySource[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isViewerOpen, setIsViewerOpen] = useState<boolean>(false);
  const [selectedSourceForViewer, setSelectedSourceForViewer] = useState<StorySource | null>(null);
  const [currentItemIndexInViewer, setCurrentItemIndexInViewer] = useState<number>(0);

  const [analysisNewsItems, setAnalysisNewsItems] = useState<NewsItem[]>([]);

  const parseRSSFeed = (xmlText: string, sourceName: string): NewsItem[] => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "application/xml");
    const itemsList: NewsItem[] = [];
    
    const errorNode = xmlDoc.querySelector("parsererror");
    if (errorNode) {
        console.error(`Error parsing XML for ${sourceName}:`, errorNode.textContent);
        return [];
    }

    xmlDoc.querySelectorAll("item").forEach(itemNode => {
      const title = itemNode.querySelector("title")?.textContent || "Sem título";
      const link = itemNode.querySelector("link")?.textContent || "";
      const pubDate = itemNode.querySelector("pubDate")?.textContent;
      let description = itemNode.querySelector("description")?.textContent || "";
      description = description.replace(/<[^>]+>/g, '').substring(0, 200) + (description.length > 200 ? "..." : "");
      
      let imageUrl: string | undefined;
      const mediaContent = itemNode.querySelector("media\\:content, content"); // Added 'content' for some feeds
      if (mediaContent && mediaContent.getAttribute("url")) {
          imageUrl = mediaContent.getAttribute("url") || undefined;
          // Basic check if media is image, some feeds don't specify medium="image" but type="image/jpeg"
          if (!(mediaContent.getAttribute("medium") === "image" || mediaContent.getAttribute("type")?.startsWith("image/"))) {
            // Fallback: check extension if type/medium not explicit for image
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
       // Try to get image from CDATA within description if specific tags fail (common in Folha)
      if (!imageUrl && description) {
        const imgMatch = description.match(/<img[^>]+src="([^">]+)"/);
        if (imgMatch && imgMatch[1]) {
            imageUrl = imgMatch[1];
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

  const fetchAllFeeds = useCallback(async (isManualRefresh = false) => {
    if (!isManualRefresh) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);
    if (!isManualRefresh) setAnalysisNewsItems([]); // Clear old items only on initial load
    
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
        } else if (!xmlText.trim().startsWith('<')) { 
            aggregatedErrorMessages += `Feed de ${initialSource.name} retornou conteúdo inválido.\n`;
        }
      } catch (e: any) {
        console.error(`Error fetching/parsing ${initialSource.name}:`, e);
        aggregatedErrorMessages += `${e.message || `Erro desconhecido ao buscar ${initialSource.name}`}\n`;
      }
    }
    
    setStorySources(allFetchedSources);
    if (aggregatedErrorMessages) {
        setError(aggregatedErrorMessages.trim());
    }
    if(allFetchedSources.length === 0 && !aggregatedErrorMessages){
        setError("Nenhuma notícia encontrada ou todos os feeds falharam.");
    }
    if (!isManualRefresh) setIsLoading(false);
    setIsRefreshing(false);

    if (allFetchedSources.length > 0) {
        const allNewsItems = allFetchedSources.flatMap(source => source.items);
        allNewsItems.sort((a, b) => {
            try {
                return (new Date(b.pubDate || 0).getTime()) - (new Date(a.pubDate || 0).getTime());
            } catch { return 0; }
        });
        setAnalysisNewsItems(allNewsItems.slice(0, MAX_ITEMS_FOR_ANALYSIS));
    }
  }, []); 

  useEffect(() => {
    fetchAllFeeds();
  }, [fetchAllFeeds]);

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

  const formatPubDateForCard = (dateString?: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('pt-BR', {
        day: 'numeric', month: 'short', year: 'numeric'
      }).format(date);
    } catch (e) {
      return dateString.substring(0,16); 
    }
  };
  
  const handleRefresh = () => {
    fetchAllFeeds(true); // Pass true for manual refresh
  };


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
      <Card.Header className="flex justify-between items-center">
        <Card.Title>Feed de Notícias</Card.Title>
        <Button onClick={handleRefresh} variant="secondary" size="sm" disabled={isRefreshing} leftIcon={isRefreshing ? <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <RefreshCwIcon className="w-4 h-4"/>}>
          {isRefreshing ? 'Atualizando...' : 'Atualizar'}
        </Button>
      </Card.Header>
      <Card.Content className="text-center py-10 text-red-600 dark:text-red-400">
        <p className="whitespace-pre-line">{errorMessage}</p>
      </Card.Content>
    </Card>
  );

  if (isLoading && activeStorySources.length === 0) return renderLoadingState();
  if (error && activeStorySources.length === 0 && analysisNewsItems.length === 0 && !isLoading) return renderErrorState(error);
  if (activeStorySources.length === 0 && analysisNewsItems.length === 0 && !isLoading && !error) {
     return renderErrorState("Nenhuma notícia disponível no momento. Tente atualizar.");
  }


  return (
    <div className="w-full space-y-8">
      <Card>
        <Card.Header className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div className="flex items-center">
            <Card.Title className="text-xl font-semibold">Stories de Notícias</Card.Title>
            <span 
              className="ml-2 inline-flex items-center bg-amber-100 dark:bg-amber-700/50 text-amber-700 dark:text-amber-300 text-xs font-semibold px-2 py-0.5 rounded-full"
              title="Esta funcionalidade está em fase de testes."
            >
              <WarningIcon className="w-3 h-3 mr-1 text-amber-500 dark:text-amber-400" />
              EM TESTES
            </span>
          </div>
          <Button onClick={handleRefresh} variant="secondary" size="sm" disabled={isRefreshing || isLoading} leftIcon={isRefreshing || (isLoading && activeStorySources.length === 0) ? <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <RefreshCwIcon className="w-4 h-4"/>}>
            {isRefreshing || (isLoading && activeStorySources.length === 0) ? 'Atualizando...' : 'Atualizar Notícias'}
          </Button>
        </Card.Header>
        <Card.Content>
          {isLoading && activeStorySources.length > 0 && !isRefreshing && (
            <p className="text-xs text-center text-slate-500 dark:text-slate-400 mb-2">Atualizando feeds em segundo plano...</p>
          )}
          {activeStorySources.length > 0 ? (
            <div className="flex space-x-3 overflow-x-auto py-3 px-1 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
              {activeStorySources.map(source => (
                <StoryIcon
                  key={source.id}
                  source={source}
                  onClick={() => handleStoryIconClick(source)}
                />
              ))}
            </div>
          ) : (
             !isLoading && !isRefreshing && <p className="text-sm text-center text-slate-500 dark:text-slate-400 py-3">Nenhum story disponível no momento. Tente atualizar.</p>
          )}
          {error && activeStorySources.length > 0 && (
            <p className="text-xs text-center text-red-500 dark:text-red-400 mt-2 whitespace-pre-line">
                Atenção: {error} (Alguns feeds podem não ter carregado)
            </p>
          )}
        </Card.Content>
      </Card>

      {analysisNewsItems.length > 0 && (
        <div>
          <div className="flex items-center mb-4">
            <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200">Principais Notícias para Análise</h2>
            <span 
              className="ml-2 inline-flex items-center bg-amber-100 dark:bg-amber-700/50 text-amber-700 dark:text-amber-300 text-xs font-semibold px-2 py-0.5 rounded-full"
              title="Esta funcionalidade está em fase de testes e usa IA para resumir sob demanda."
            >
              <WarningIcon className="w-3 h-3 mr-1 text-amber-500 dark:text-amber-400" />
              EM TESTES
            </span>
          </div>
          <div className="space-y-4">
            {analysisNewsItems.map(item => (
              <Card key={item.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {item.imageUrl && (
                  <img 
                    src={item.imageUrl} 
                    alt="" 
                    className="w-full sm:w-24 h-24 sm:h-auto object-cover rounded-md flex-shrink-0"
                    onError={(e) => e.currentTarget.style.display = 'none'}
                  />
                )}
                <div className="flex-grow">
                  <h3 className="text-md font-semibold text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400">
                    <a href={item.link} target="_blank" rel="noopener noreferrer">{item.title}</a>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {item.sourceName} {item.pubDate && `• ${formatPubDateForCard(item.pubDate)}`}
                  </p>
                </div>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => onSelectArticleForSummary(item)}
                  className="mt-2 sm:mt-0 sm:ml-auto flex-shrink-0"
                >
                  Resumir com IA
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}
      {activeStorySources.length === 0 && analysisNewsItems.length === 0 && !isLoading && !isRefreshing && error && (
         <p className="text-sm text-center text-red-500 dark:text-red-400 py-3">
            Erro ao carregar notícias: {error}
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
