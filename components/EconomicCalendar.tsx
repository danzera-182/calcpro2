
import React, { useState, useEffect, useCallback } from 'react';
import { EconomicEventItem } from '../types';
import { Card } from './ui/Card';
import Button from './ui/Button';

const PROXY_BASE_URL = '/api/rss-proxy?url=';
const EVENTS_RSS_URL = 'https://ir.thomsonreuters.com/rss/events.xml?items=15';
const SOURCE_NAME = "Thomson Reuters Events";

const RefreshCwIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);

const CalendarDaysIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-3.75h.008v.008H12v-.008Z" />
    </svg>
);


const EconomicCalendar: React.FC = () => {
  const [events, setEvents] = useState<EconomicEventItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const parseEventRSS = (xmlText: string, sourceName: string): EconomicEventItem[] => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "application/xml");
    const itemsList: EconomicEventItem[] = [];

    const errorNode = xmlDoc.querySelector("parsererror");
    if (errorNode) {
      console.error(`Error parsing XML for ${sourceName}:`, errorNode.textContent);
      return [];
    }

    xmlDoc.querySelectorAll("item").forEach(itemNode => {
      const title = itemNode.querySelector("title")?.textContent || "Sem título";
      const link = itemNode.querySelector("link")?.textContent || "";
      const rawPubDate = itemNode.querySelector("pubDate")?.textContent;
      let description = itemNode.querySelector("description")?.textContent || "";
      description = description.replace(/<[^>]+>/g, '').substring(0, 250) + (description.length > 250 ? "..." : "");
      
      let formattedEventDate = "Data não especificada";
      if (rawPubDate) {
        try {
          const date = new Date(rawPubDate);
          formattedEventDate = new Intl.DateTimeFormat('pt-BR', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
          }).format(date);
        } catch (e) {
          formattedEventDate = rawPubDate; // Fallback
        }
      }

      itemsList.push({
        id: link || title + (rawPubDate || Math.random().toString()),
        title,
        link,
        eventDate: formattedEventDate,
        rawPubDate,
        description,
        sourceName,
      });
    });
    
    // Sort events by date (newest first, assuming pubDate is event date)
    itemsList.sort((a, b) => {
        try {
            const dateA = a.rawPubDate ? new Date(a.rawPubDate).getTime() : 0;
            const dateB = b.rawPubDate ? new Date(b.rawPubDate).getTime() : 0;
            return dateB - dateA;
        } catch {
            return 0;
        }
    });
    return itemsList;
  };

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const proxyUrl = `${PROXY_BASE_URL}${encodeURIComponent(EVENTS_RSS_URL)}`;
      const response = await fetch(proxyUrl);

      if (!response.ok) {
        const errorText = await response.text().catch(() => `Status: ${response.status}`);
        throw new Error(`Falha ao buscar calendário: ${response.status}. Detalhes: ${errorText.substring(0, 100)}`);
      }
      const xmlText = await response.text();
      const parsedEvents = parseEventRSS(xmlText, SOURCE_NAME);
      
      if (parsedEvents.length === 0 && !xmlText.trim().startsWith('<')) {
        setError("Feed de eventos retornou conteúdo inválido.");
      } else if (parsedEvents.length === 0) {
        setError("Nenhum evento encontrado no feed.");
      }
      setEvents(parsedEvents);
    } catch (e: any) {
      console.error("Error fetching/parsing events:", e);
      setError(e.message || "Erro desconhecido ao buscar eventos.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);
  
  const handleRefresh = () => {
    fetchEvents();
  };

  if (isLoading) {
    return (
      <Card>
        <Card.Header className="flex justify-between items-center">
          <Card.Title>Calendário Econômico</Card.Title>
        </Card.Header>
        <Card.Content className="text-center py-10">
          <svg className="animate-spin h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Carregando eventos...
        </Card.Content>
      </Card>
    );
  }


  return (
    <div className="space-y-6">
      <Card>
        <Card.Header className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div className="flex items-center space-x-2">
            <CalendarDaysIcon className="w-6 h-6 text-primary dark:text-primary-light"/>
            <Card.Title>Calendário Econômico</Card.Title>
          </div>
          <Button onClick={handleRefresh} variant="secondary" size="sm" disabled={isLoading} leftIcon={isLoading ? <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <RefreshCwIcon className="w-4 h-4"/>}>
            {isLoading ? 'Atualizando...' : 'Atualizar Calendário'}
          </Button>
        </Card.Header>
        <Card.Content>
          {error && (
             <p className="text-center py-6 text-red-600 dark:text-red-400">{error}</p>
          )}
          {!error && events.length === 0 && !isLoading && (
            <p className="text-center py-6 text-slate-500 dark:text-slate-400">Nenhum evento encontrado no momento.</p>
          )}
          {!error && events.length > 0 && (
            <div className="space-y-4">
              {events.map(event => (
                <Card key={event.id} className="p-4 bg-slate-50 dark:bg-slate-800/60 shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="text-md font-semibold text-blue-700 dark:text-blue-400 mb-1">
                    <a href={event.link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {event.title}
                    </a>
                  </h3>
                  {event.eventDate && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 mb-1">
                      <strong>Data:</strong> {event.eventDate}
                    </p>
                  )}
                  {event.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {event.description}
                    </p>
                  )}
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Fonte: {event.sourceName}</p>
                </Card>
              ))}
            </div>
          )}
        </Card.Content>
      </Card>
       <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
        Fonte: {SOURCE_NAME}. Este calendário é para fins informativos.
      </p>
    </div>
  );
};

export default EconomicCalendar;
