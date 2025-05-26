
import React from 'react';
import { UsdBrlRateInfo } from '../types';
import { formatCurrency, formatNumberForDisplay } from '../utils/formatters';

interface ExchangeRateDisplayProps {
  rateInfo: UsdBrlRateInfo | null;
  isLoading: boolean;
  error: string | null;
}

const ExchangeRateDisplay: React.FC<ExchangeRateDisplayProps> = ({ rateInfo, isLoading, error }) => {
  const formatDateTime = (isoDateTimeString: string): string => {
    try {
      const date = new Date(isoDateTimeString);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return "Data inválida";
      }
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch (e) {
      console.error("Error formatting date:", e);
      return isoDateTimeString; // Fallback to original string if formatting fails
    }
  };

  let content;

  if (isLoading) {
    content = (
      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Carregando cotação do dólar...
      </div>
    );
  } else if (error) {
    content = <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  } else if (rateInfo) {
    content = (
      <p className="text-sm text-gray-700 dark:text-gray-300">
        💵 Dólar (USD/BRL):{' '}
        <strong className="text-blue-600 dark:text-blue-400">
          {formatNumberForDisplay(rateInfo.rate, { minimumFractionDigits: 4, maximumFractionDigits: 4 }, 'N/A')}
        </strong>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {' '}em {formatDateTime(rateInfo.dateTime)} (Fonte: BCB PTAX Venda)
        </span>
      </p>
    );
  } else {
    return null; // Don't render anything if no data, not loading, and no error yet
  }

  return (
    <div className="mb-6 p-3 bg-gray-100 dark:bg-slate-800/70 rounded-lg shadow-subtle text-center">
      {content}
    </div>
  );
};

export default ExchangeRateDisplay;