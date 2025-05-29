
import React, { ReactNode } from 'react';
import { Card } from './Card'; 
import { formatNumberForDisplay } from '../../utils/formatters';
import Button from './Button'; 
import { IndicatorModalData } from '../../types'; 

interface IndicatorCardProps {
  indicatorData: IndicatorModalData; 
  icon?: ReactNode;
  isLoading?: boolean;
  error?: string | null; // Can be "Erro ao buscar", "Valor Inválido", etc.
  onDetailsClick?: (indicator: IndicatorModalData) => void;
}

const IndicatorCard: React.FC<IndicatorCardProps> = ({
  indicatorData,
  icon,
  isLoading = false,
  error = null,
  onDetailsClick,
}) => {
  const { 
    title, 
    currentValue, 
    valueSuffix = '', // Default unit like % a.a.
    referenceText, 
    sourceText, 
    valuePrecision = 2,
    // isBillions, // Replaced by displayDivisor and displaySuffixOverride
    // isUSD, // isUSD is still in IndicatorModalData for chart tooltip, but card display is controlled by prefix/suffix
    displayDivisor,
    displayPrefix,
    displaySuffixOverride,
  } = indicatorData;

  let displayValueStr: string;
  let finalDisplayPrefix = displayPrefix || '';
  let finalDisplaySuffix = displaySuffixOverride !== undefined ? displaySuffixOverride : valueSuffix;

  if (isLoading) {
    displayValueStr = 'Carregando...';
    finalDisplayPrefix = '';
    finalDisplaySuffix = '';
  } else if (error) { 
    displayValueStr = error; 
    finalDisplayPrefix = '';
    finalDisplaySuffix = '';
  } else if (currentValue === null || currentValue === undefined || (typeof currentValue === 'string' && currentValue.trim() === '')) {
    displayValueStr = 'N/D';
    finalDisplayPrefix = '';
    finalDisplaySuffix = '';
  } else {
    let numToFormat = typeof currentValue === 'number' ? currentValue : parseFloat(String(currentValue).replace(',', '.'));
    if (!isNaN(numToFormat)) {
        if (displayDivisor && displayDivisor !== 0) {
            numToFormat /= displayDivisor;
        }
        displayValueStr = formatNumberForDisplay(numToFormat, { 
            minimumFractionDigits: valuePrecision, 
            maximumFractionDigits: valuePrecision 
        });
    } else {
        displayValueStr = String(currentValue); // Fallback for non-numeric string
        finalDisplayPrefix = ''; 
        finalDisplaySuffix = '';
    }
  }

  const handleCardClick = () => {
    if (onDetailsClick) {
      onDetailsClick(indicatorData);
    }
  };

  return (
    <Card 
        className={`h-full flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-200 ${onDetailsClick ? 'cursor-pointer' : ''}`}
        onClick={onDetailsClick ? handleCardClick : undefined} 
        role={onDetailsClick ? "button" : undefined}
        tabIndex={onDetailsClick ? 0 : undefined}
        onKeyDown={onDetailsClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') handleCardClick(); } : undefined}
        aria-label={onDetailsClick ? `Ver detalhes e gráfico sobre ${title}` : `Dados sobre ${title}`}
    >
      <Card.Header className="pb-2">
        <div className="flex items-center justify-between">
          <Card.Title className="text-base sm:text-md text-gray-700 dark:text-blue-300">{title}</Card.Title>
          {icon && <span className="text-blue-500 dark:text-blue-400">{icon}</span>}
        </div>
      </Card.Header>
      <Card.Content className="flex-grow flex flex-col justify-center items-center text-center">
        <p className={`text-2xl sm:text-3xl font-bold my-2 ${
            isLoading ? 'text-gray-500 dark:text-gray-400 animate-pulse' 
            : error ? 'text-red-500 dark:text-red-400' 
            : 'text-gray-900 dark:text-white'
        }`}>
          {finalDisplayPrefix}{displayValueStr}{finalDisplaySuffix}
        </p>
        {referenceText && !isLoading && !error && (
          <p className="text-xs text-gray-500 dark:text-gray-400">{referenceText}</p>
        )}
      </Card.Content>
      <Card.Content className="pt-1 pb-3 border-t border-gray-200/60 dark:border-slate-700/60 mt-auto">
        <div className="flex justify-between items-center text-xs">
          {isLoading ? (
            <span className="text-gray-400 dark:text-gray-500">Atualizando...</span>
          ) : error === "Erro ao buscar" ? (
            <span className="text-red-400 dark:text-red-500">Falha ao obter dados.</span>
          ) : error === "Valor Inválido" ? (
            <span className="text-orange-500 dark:text-orange-400">Valor anômalo recebido.</span>
          ) : sourceText ? (
            <span className="text-gray-400 dark:text-gray-500">Fonte: {sourceText}</span>
          ) : (
            <span>&nbsp;</span> 
          )}

          {onDetailsClick && !isLoading && ( 
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => { 
                  e.stopPropagation(); 
                  handleCardClick();
              }}
              className="py-1 px-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-slate-700 text-xs sm:text-sm"
              aria-label={`Ver detalhes e gráfico sobre ${title}`}
              title={`Ver detalhes e gráfico sobre ${title}`}
            >
              Ver detalhes e gráfico
            </Button>
          )}
        </div>
      </Card.Content>
    </Card>
  );
};

export default IndicatorCard;