import React from 'react';
import { BtcPriceInfo } from '../types';
import { formatCurrency } from '../utils/formatters';

interface BitcoinRateDisplayProps {
  priceInfo: BtcPriceInfo | null;
  isLoading: boolean;
  error: string | null;
}

const BitcoinRateDisplay: React.FC<BitcoinRateDisplayProps> = ({ priceInfo, isLoading, error }) => {
  const formatUnixTimestamp = (unixTimestamp: number): string => {
    try {
      const date = new Date(unixTimestamp * 1000);
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
      console.error("Error formatting Unix timestamp:", e);
      return "Horário indisponível";
    }
  };

  let contentBody;

  if (isLoading) {
    contentBody = (
      <div className="flex items-center justify-center text-sm text-gray-600 dark:text-gray-400 py-4">
        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-orange-500 dark:text-orange-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Carregando cotação do Bitcoin...
      </div>
    );
  } else if (error) {
    contentBody = <p className="text-sm text-red-600 dark:text-red-400 py-4 text-center">{error}</p>;
  } else if (priceInfo) {
    contentBody = (
      <div className="text-sm text-left space-y-2">
        <div>
          <span className="text-gray-700 dark:text-gray-300">
            <span aria-hidden="true" className="mr-1">₿</span> Bitcoin (BTC/BRL):{' '}
            <strong className="text-orange-500 dark:text-orange-400">
              {formatCurrency(priceInfo.brl)}
            </strong>
          </span>
        </div>
        <div>
          <span className="text-gray-700 dark:text-gray-300">
            <span aria-hidden="true" className="mr-1">₿</span> Bitcoin (BTC/USD):{' '}
            <strong className="text-orange-500 dark:text-orange-400">
              {formatCurrency(priceInfo.usd, 'USD')}
            </strong>
          </span>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center border-t border-gray-200 dark:border-slate-700 pt-2 mt-3">
          Última atualização: {formatUnixTimestamp(priceInfo.lastUpdatedAt)} (Fonte: CoinGecko)
        </div>
      </div>
    );
  } else {
    return null; 
  }

  return (
    <div className="p-4 bg-gray-100 dark:bg-slate-800/70 rounded-lg shadow-subtle">
      <h3 className="text-md font-semibold text-center text-gray-800 dark:text-blue-400 mb-3">
        Cotação Bitcoin (BTC)
      </h3>
      {contentBody}
    </div>
  );
};

export default BitcoinRateDisplay;