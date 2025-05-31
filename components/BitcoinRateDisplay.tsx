import React from 'react';
// Removed LineChart, Line, ResponsiveContainer, Area from 'recharts' as they are no longer used.
import { BtcPriceInfo } from '../types';
import { formatCurrency, formatNumberForDisplay } from '../utils/formatters';
// Removed useTheme as it was only used for mini-chart colors. If needed for other theming, it can be re-added.

// Componente para o logo do Bitcoin usando SVG embutido
const BitcoinLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 256 256" // viewBox from user's new SVG
    {...props} // Allows className (for width/height) to be passed and applied
  >
    <defs>
      <linearGradient id="logosBitcoin0" x1="49.973%" x2="49.973%" y1="-.024%" y2="99.99%">
        <stop offset="0%" stopColor="#F9AA4B"/>
        <stop offset="100%" stopColor="#F7931A"/>
      </linearGradient>
    </defs>
    <path fill="url(#logosBitcoin0)" d="M252.171 158.954c-17.102 68.608-86.613 110.314-155.123 93.211c-68.61-17.102-110.316-86.61-93.213-155.119C20.937 28.438 90.347-13.268 158.957 3.835c68.51 17.002 110.317 86.51 93.214 155.119Z"/>
    <path fill="#FFF" d="M188.945 112.05c2.5-17-10.4-26.2-28.2-32.3l5.8-23.1l-14-3.5l-5.6 22.5c-3.7-.9-7.5-1.8-11.3-2.6l5.6-22.6l-14-3.5l-5.7 23c-3.1-.7-6.1-1.4-9-2.1v-.1l-19.4-4.8l-3.7 15s10.4 2.4 10.2 2.5c5.7 1.4 6.7 5.2 6.5 8.2l-6.6 26.3c.4.1.9.2 1.5 .5c-.5-.1-1-.2-1.5-.4l-9.2 36.8c-.7 1.7-2.5 4.3-6.4 3.3c.1.2-10.2-2.5-10.2-2.5l-7 16.1l18.3 4.6c3.4.9 6.7 1.7 10 2.6l-5.8 23.3l14 3.5l5.8-23.1c3.8 1 7.6 2 11.2 2.9l-5.7 23l14 3.5l5.8-23.3c24 4.5 42 2.7 49.5-19c6.1-17.4-.3-27.5-12.9-34.1c9.3-2.1 16.2-8.2 18-20.6Zm-32.1 45c-4.3 17.4-33.7 8-43.2 5.6l7.7-30.9c9.5 2.4 40.1 7.1 35.5 25.3Zm4.4-45.3c-4 15.9-28.4 7.8-36.3 5.8l7-28c7.9 2 33.4 5.7 29.3 22.2Z"/>
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


interface BitcoinRateDisplayProps {
  priceInfo: BtcPriceInfo | null;
  isLoading: boolean;
  error: string | null;
  onClick?: () => void;
}

const BitcoinRateDisplay: React.FC<BitcoinRateDisplayProps> = ({ priceInfo, isLoading, error, onClick }) => {
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
      <div className="flex items-center justify-center text-sm text-slate-600 dark:text-slate-400 h-20"> {/* Reduced height */}
        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-orange-500 dark:text-orange-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Carregando cotação...
      </div>
    );
  } else if (error) {
    displayContent = <p className="text-sm text-red-600 dark:text-red-400 text-center h-20 flex items-center justify-center">{error}</p>; {/* Reduced height */}
  } else if (priceInfo) {
    const usdChange = priceInfo.usd_24h_change;
    let changeColorClass = 'text-slate-500 dark:text-slate-400';
    if (usdChange !== undefined) {
      if (usdChange > 0) changeColorClass = 'text-green-600 dark:text-green-500';
      else if (usdChange < 0) changeColorClass = 'text-red-600 dark:text-red-500';
    }

    displayContent = (
      // Main content container: flex row, space between, items center
      <div className="flex justify-between items-center" style={{ minHeight: '4.5rem' }}> {/* Reduced minHeight */}
        {/* Left Group: Logo + BTC */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          <BitcoinLogo className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0" /> {/* Slightly reduced logo */}
          <p className="text-md sm:text-lg font-bold text-slate-800 dark:text-slate-100">BTC</p>
        </div>

        {/* Right Group: Price Info (USD, BRL) + Timestamp + 24h Change */}
        <div className="flex flex-col items-end text-right">
          <p className="text-md sm:text-lg font-bold text-slate-800 dark:text-slate-100">
            {formatCurrency(priceInfo.usd, 'USD')}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            {formatCurrency(priceInfo.brl)}
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
      className={`bg-slate-100 dark:bg-slate-800 p-2 sm:p-3 rounded-xl shadow-md w-full max-w-sm mx-auto ${onClick ? 'cursor-pointer hover:shadow-lg active:shadow-inner transition-shadow duration-150' : ''}`} /* Reduced padding & added max-w-sm */
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
      aria-label={onClick ? "Ver detalhes da cotação e gráfico do Bitcoin" : "Cotação atual do Bitcoin"}
    >
      {displayContent}
    </div>
  );
};

export default BitcoinRateDisplay;