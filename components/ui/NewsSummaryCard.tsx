import React from 'react';
import { NewsItem } from '../../types'; // Assuming NewsItem might be enhanced or this card used elsewhere
import { Card } from './Card';
import Button from './Button'; // If you want a "Read More" button styling

interface NewsSummaryCardProps {
  item: NewsItem;
  summary: string | null;
  isLoadingSummary: boolean;
  summaryError?: string | null;
}

const NewsSummaryCard: React.FC<NewsSummaryCardProps> = ({ 
    item, 
    summary, 
    isLoadingSummary, 
    summaryError 
}) => {

  const formatPubDateForCard = (dateString?: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('pt-BR', {
        day: 'numeric', month: 'short', year: 'numeric'
      }).format(date);
    } catch (e) {
      return dateString.substring(0,16); // Fallback
    }
  };

  return (
    <Card className="flex flex-col h-full shadow-lg hover:shadow-xl transition-shadow duration-200 ease-in-out">
      {item.imageUrl && (
        <a href={item.link} target="_blank" rel="noopener noreferrer" aria-label={`Ler artigo completo: ${item.title}`}>
          <img 
            src={item.imageUrl} 
            alt={`Imagem para ${item.title}`} 
            className="w-full h-32 sm:h-40 object-cover rounded-t-2xl" 
            onError={(e) => e.currentTarget.style.display = 'none'}
          />
        </a>
      )}
      <Card.Header className={!item.imageUrl ? 'rounded-t-2xl' : ''}>
        <a href={item.link} target="_blank" rel="noopener noreferrer" aria-label={`Ler artigo completo: ${item.title}`}>
          <Card.Title className="text-md sm:text-lg leading-tight hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            {item.title}
          </Card.Title>
        </a>
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          <span>{item.sourceName}</span>
          {item.pubDate && (
            <>
              <span className="mx-1.5">&bull;</span>
              <span>{formatPubDateForCard(item.pubDate)}</span>
            </>
          )}
        </div>
      </Card.Header>
      <Card.Content className="flex-grow">
        {isLoadingSummary && (
          <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Resumindo com IA...
          </div>
        )}
        {summaryError && !isLoadingSummary && (
          <p className="text-sm text-red-500 dark:text-red-400">{summaryError}</p>
        )}
        {summary && !isLoadingSummary && !summaryError && (
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {summary}
          </p>
        )}
      </Card.Content>
      <Card.Content className="border-t border-slate-200 dark:border-slate-700/60">
        <Button 
          variant="secondary" 
          size="sm" 
          className="w-full"
          onClick={() => window.open(item.link, '_blank')}
        >
          Ler Artigo Completo &rarr;
        </Button>
      </Card.Content>
    </Card>
  );
};

export default NewsSummaryCard;
