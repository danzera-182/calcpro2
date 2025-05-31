
import React, { useState, useEffect, useCallback } from 'react';
// Removed FinnhubNewsItem from '../types' as it's deprecated.
// Removed fetchFinnhubNews from '../utils/economicIndicatorsAPI' as it's deprecated.
import { Card } from './ui/Card';
import Button from './ui/Button';
// formatNumberForDisplay might not be needed anymore if not used below.

// Define a placeholder type if structure is still minimally needed, or remove usages.
// For this fix, we are making the component display a "discontinued" message,
// so the original FinnhubNewsItem structure is not strictly needed.

const NewsFeedComponent: React.FC = () => {
  // State related to news items, loading, and error is no longer needed
  // as the component will not fetch or display news.

  // The loadNews function and its useEffect call are also not needed.

  // const formatUnixTimestampToDateTime = (unixTimestamp: number): string => {
  //   // This function might not be needed if no timestamps are displayed.
  //   // Kept for now if a "last attempt" timestamp were to be shown, but likely removable.
  //   try {
  //     const date = new Date(unixTimestamp * 1000);
  //     if (isNaN(date.getTime())) return "Data inválida";
  //     return new Intl.DateTimeFormat('pt-BR', {
  //       day: '2-digit', month: '2-digit', year: 'numeric',
  //       hour: '2-digit', minute: '2-digit'
  //     }).format(date);
  //   } catch (e) {
  //     console.error("Error formatting Unix timestamp for news:", e);
  //     return "Horário indisponível";
  //   }
  // };
  
  // Simplified rendering to show the feature is discontinued.
  return (
    <Card>
      <Card.Header>
        <Card.Title className="text-center">Feed de Notícias Financeiras</Card.Title>
      </Card.Header>
      <Card.Content>
        <p className="text-center text-slate-500 dark:text-slate-400 py-10">
          O feed de notícias financeiras foi descontinuado e não está mais disponível.
        </p>
      </Card.Content>
    </Card>
  );
};

export default NewsFeedComponent;
