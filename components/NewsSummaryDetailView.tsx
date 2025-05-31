
import React, { useState, useEffect } from 'react';
import { ArticleForSummary } from '../types';
import { Card } from './ui/Card';
import Button from './ui/Button';

interface NewsSummaryDetailViewProps {
  article: ArticleForSummary;
  onBack: () => void;
}

const SUMMARIZE_API_URL = '/api/summarize-news';

const NewsSummaryDetailView: React.FC<NewsSummaryDetailViewProps> = ({ article, onBack }) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState<boolean>(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    if (article && article.link) {
      setIsLoadingSummary(true);
      setSummary(null);
      setSummaryError(null);

      fetch(SUMMARIZE_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleUrl: article.link })
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
        setSummary(data.summary);
      })
      .catch(e => {
        console.error(`Error summarizing ${article.link}:`, e);
        setSummaryError(e.message || "Falha ao resumir o artigo.");
      })
      .finally(() => {
        setIsLoadingSummary(false);
      });
    }
  }, [article]);

  const formatPubDateForDisplay = (dateString?: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('pt-BR', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }).format(date);
    } catch (e) {
      return dateString; 
    }
  };

  if (!article) {
    return (
      <div className="p-4 text-center">
        <p>Nenhum artigo selecionado para resumo.</p>
        <Button onClick={onBack} variant="secondary" className="mt-4">Voltar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button onClick={onBack} variant="secondary" size="md" aria-label="Voltar para o feed de notícias">
        &larr; Voltar para o Feed de Notícias
      </Button>
      <Card>
        <Card.Header>
          <Card.Title className="text-xl sm:text-2xl">{article.title}</Card.Title>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span>Fonte: {article.sourceName}</span>
            {article.pubDate && (
              <>
                <span className="mx-1.5">&bull;</span>
                <span>{formatPubDateForDisplay(article.pubDate)}</span>
              </>
            )}
          </div>
        </Card.Header>
        <Card.Content className="space-y-4">
          {article.imageUrl && (
            <img 
              src={article.imageUrl} 
              alt={`Imagem para ${article.title}`} 
              className="w-full max-h-72 object-cover rounded-lg mb-4"
              onError={(e) => e.currentTarget.style.display = 'none'}
            />
          )}

          <div>
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">Resumo com IA:</h3>
            {isLoadingSummary && (
              <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 py-6">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processando resumo...
              </div>
            )}
            {summaryError && !isLoadingSummary && (
              <p className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-3 rounded-md">{summaryError}</p>
            )}
            {summary && !isLoadingSummary && !summaryError && (
              <div className="prose prose-sm dark:prose-invert max-w-none bg-slate-50 dark:bg-slate-800/50 p-4 rounded-md shadow-inner">
                {summary.split('\n').map((paragraph, index) => (
                  <p key={index} className="mb-2 last:mb-0">{paragraph}</p>
                ))}
              </div>
            )}
          </div>

          <Button 
            variant="primary" 
            size="md" 
            className="w-full mt-6"
            onClick={() => window.open(article.link, '_blank')}
          >
            Ler Artigo Completo &rarr;
          </Button>
        </Card.Content>
      </Card>
    </div>
  );
};

export default NewsSummaryDetailView;
