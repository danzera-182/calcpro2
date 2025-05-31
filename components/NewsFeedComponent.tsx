
import React, { useState, useEffect, useCallback } from 'react';
import { FinnhubNewsItem } from '../types';
import { fetchFinnhubNews } from '../utils/economicIndicatorsAPI';
import { Card } from './ui/Card';
import Button from './ui/Button';
import { formatNumberForDisplay } from '../utils/formatters';

const NewsFeedComponent: React.FC = () => {
  const [newsItems, setNewsItems] = useState<FinnhubNewsItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const NEWS_COUNT = 20; // Number of news items to display

  const loadNews = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // IMPORTANT: Ensure process.env.FINNHUB_API_KEY is set in your environment.
      // The fetchFinnhubNews function will use it.
      // If it's not set, the function will throw an error handled below.
      const items = await fetchFinnhubNews('general', NEWS_COUNT);
      setNewsItems(items);
    } catch (e: any) {
      console.error("Error loading Finnhub news:", e);
      setError(e.message || 'Falha ao carregar notícias.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  const formatUnixTimestampToDateTime = (unixTimestamp: number): string => {
    try {
      const date = new Date(unixTimestamp * 1000);
      if (isNaN(date.getTime())) return "Data inválida";
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }).format(date);
    } catch (e) {
      console.error("Error formatting Unix timestamp for news:", e);
      return "Horário indisponível";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <Card.Header>
          <Card.Title className="text-center">Feed de Notícias Financeiras</Card.Title>
        </Card.Header>
        <Card.Content className="py-20 flex justify-center items-center">
          <div className="flex flex-col items-center">
            <svg className="animate-spin h-12 w-12 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-center text-slate-500 dark:text-slate-400 mt-6 text-lg">Carregando notícias...</p>
          </div>
        </Card.Content>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Card.Header className="flex justify-between items-center">
          <Card.Title>Feed de Notícias Financeiras</Card.Title>
           <Button onClick={loadNews} variant="secondary" size="sm" disabled={isLoading}>
            Tentar Novamente
          </Button>
        </Card.Header>
        <Card.Content>
          <p className="text-center text-red-500 dark:text-red-400 py-10">
            {error}
             {error.includes("Chave da API Finnhub não configurada") && 
                <span className="block text-xs mt-2">Verifique se a variável de ambiente FINNHUB_API_KEY está definida corretamente.</span>
             }
          </p>
        </Card.Content>
      </Card>
    );
  }
  
  if (newsItems.length === 0) {
    return (
      <Card>
        <Card.Header className="flex justify-between items-center">
          <Card.Title>Feed de Notícias Financeiras</Card.Title>
          <Button onClick={loadNews} variant="secondary" size="sm" disabled={isLoading}>
            Atualizar
          </Button>
        </Card.Header>
        <Card.Content>
          <p className="text-center text-slate-500 dark:text-slate-400 py-10">Nenhuma notícia encontrada no momento.</p>
        </Card.Content>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center mb-1">
            <h2 className="text-xl font-semibold text-slate-700 dark:text-blue-300">Últimas Notícias Financeiras</h2>
            <Button onClick={loadNews} variant="secondary" size="sm" disabled={isLoading}>
                {isLoading ? 'Atualizando...' : 'Atualizar Notícias'}
            </Button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-4">
            Notícias fornecidas por Finnhub. Clique na manchete para ler o artigo completo.
        </p>

      {newsItems.map((item) => (
        <Card key={item.id} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-200">
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="block hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors duration-150" aria-label={`Ler notícia: ${item.headline}`}>
            <div className="flex flex-col sm:flex-row">
              {item.image && (
                <div className="sm:w-1/3 flex-shrink-0">
                  <img 
                    src={item.image} 
                    alt={`Imagem para: ${item.headline}`} 
                    className="w-full h-48 sm:h-full object-cover"
                    onError={(e) => (e.currentTarget.style.display = 'none')} // Hide if image fails to load
                  />
                </div>
              )}
              <div className={`p-4 sm:p-5 flex flex-col justify-between ${item.image ? 'sm:w-2/3' : 'w-full'}`}>
                <div>
                  <h3 className="text-lg font-semibold text-primary-dark dark:text-primary-light mb-2 leading-tight">
                    {item.headline}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-3 leading-relaxed line-clamp-3">
                    {item.summary}
                  </p>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-auto">
                  <span>Fonte: {item.source}</span>
                  <span className="mx-1.5">|</span>
                  <span>{formatUnixTimestampToDateTime(item.datetime)}</span>
                </div>
              </div>
            </div>
          </a>
        </Card>
      ))}
    </div>
  );
};

export default NewsFeedComponent;
