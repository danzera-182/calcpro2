import React from 'react';
import { UsdtPriceInfo } from '../types';
import { formatCurrency, formatNumberForDisplay } from '../utils/formatters';

// Componente para o logo do USDT usando SVG embutido
const UsdtLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 32 32" {...props}>
    <g fill="none" fillRule="evenodd">
      <circle cx="16" cy="16" r="16" fill="#26A17B"/>
      <path fill="#FFF" d="M17.922 17.383v-.002c-.11.008-.677.042-1.942.042c-1.01 0-1.721-.03-1.971-.042v.003c-3.888-.171-6.79-.848-6.79-1.658c0-.809 2.902-1.486 6.79-1.66v2.644c.254.018.982.061 1.988.061c1.207 0 1.812-.05 1.925-.06v-2.643c3.88.173 6.775.85 6.775 1.658c0 .81-2.895 1.485-6.775 1.657m0-3.59v-2.366h5.414V7.819H8.595v3.608h5.414v2.365c-4.4.202-7.709 1.074-7.709 2.118c0 1.044 3.309 1.915 7.709 2.118v7.582h3.913v-7.584c4.393-.202 7.694-1.073 7.694-2.116c0-1.043-3.301-1.914-7.694-2.117"/>
    </g>
  </svg>
);

const UpArrowIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
    <path fillRule="evenodd" d="M10 3.75a.75.75 0 01.75.75v10.19l2.47-2.47a.75.75 0 111.06 1.06l-3.75 3.75a.75.75 0 01-1.06 0l-3.75-3.75a.75.75 0 111.06-1.06l2.47 2.47V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" transform="rotate(180 10 10)" />
  </svg>
);

const DownArrowIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
    <path fillRule="evenodd" d="M10 3.75a.75.75 0 01.75.75v10.19l2.47-2.47a.75.75 0 111.06 1.06l-3.75 3.75a.75.75 0 01-1.06 0l-3.75-3.75a.75.75 0 111.06-1.06l2.47 2.47V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
  </svg>
);

interface UsdtRateDisplayProps {
  priceInfo: UsdtPriceInfo | null;
  isLoading: boolean;
  error: string | null;
  onClick?: () => void;
}

const UsdtRateDisplay: React.FC<UsdtRateDisplayProps> = ({ priceInfo, isLoading, error, onClick }) => {
  const formatUnixTimestamp = (unixTimestamp: number): string => {
    try {
      const date = new Date(unixTimestamp * 1000);
      if (isNaN(date.getTime())) {
        return "Data inválida";
      }
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch (e) {
      console.error("Error formatting Unix timestamp:", e);
      return "Horário indisponível";
    }
  };

  let displayContent;
  
  if (isLoading) {
    displayContent = (
      <div className="flex items-center justify-center text-sm text-slate-600 dark:text-slate-400 h-20">
        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-green-500 dark:text-green-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Carregando cotação USDT...
      </div>
    );
  } else if (error) {
    displayContent = <p className="text-sm text-red-600 dark:text-red-400 text-center h-20 flex items-center justify-center">{error}</p>;
  } else if (priceInfo) {
    const usdChange = priceInfo.usd_24h_change;
    let changeColorClass = 'text-slate-500 dark:text-slate-400';
    if (usdChange !== undefined) {
      if (usdChange > 0) changeColorClass = 'text-green-600 dark:text-green-500';
      else if (usdChange < 0) changeColorClass = 'text-red-600 dark:text-red-500';
    }

    displayContent = (
      <div className="flex justify-between items-center" style={{ minHeight: '4.5rem' }}>
        <div className="flex items-center space-x-1 sm:space-x-2">
          <UsdtLogo className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0" />
          <p className="text-md sm:text-lg font-bold text-slate-800 dark:text-slate-100">USDT</p>
        </div>
        <div className="flex flex-col items-end text-right">
          <p className="text-md sm:text-lg font-bold text-slate-800 dark:text-slate-100">
            {formatCurrency(priceInfo.brl)}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            {formatCurrency(priceInfo.usd, 'USD')}
          </p>
           <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {formatUnixTimestamp(priceInfo.lastUpdatedAt)}
          </p>
           {usdChange !== undefined && (
            <p className={`text-xs mt-0.5 flex items-center ${changeColorClass}`}>
              {usdChange > 0 && <UpArrowIcon />}
              {usdChange < 0 && <DownArrowIcon />}
              <span className="ml-0.5">{formatNumberForDisplay(usdChange, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% (24h)</span>
            </p>
          )}
        </div>
      </div>
    );
  } else {
    return null; 
  }

  return (
    <div 
      className={`bg-slate-100 dark:bg-slate-800 p-2 sm:p-3 rounded-xl shadow-md w-full ${onClick ? 'cursor-pointer hover:shadow-lg active:shadow-inner transition-shadow duration-150' : ''}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
      aria-label={onClick ? "Ver detalhes da cotação do USDT" : "Cotação atual do USDT"}
    >
      {displayContent}
    </div>
  );
};

export default UsdtRateDisplay;