
import React, { useState, useEffect, useCallback } from 'react';
import { FundInfo } from '../types';
import { mockFunds } from '../utils/mockFundData'; // Assuming mock data for now
import { Card } from './ui/Card';
import Input from './ui/Input';
import Button from './ui/Button';
import { formatCurrency, formatNumberForDisplay } from '../utils/formatters';

const SearchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
  </svg>
);

const FundAnalyzer: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [allFunds, setAllFunds] = useState<FundInfo[]>([]);
  const [searchResults, setSearchResults] = useState<FundInfo[]>([]);
  const [selectedFund, setSelectedFund] = useState<FundInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate fetching data
    setIsLoading(true);
    setError(null);
    setTimeout(() => {
      try {
        setAllFunds(mockFunds);
        setIsLoading(false);
      } catch (e) {
        setError('Falha ao carregar dados dos fundos.');
        setIsLoading(false);
        console.error(e);
      }
    }, 1000); // Simulate network delay
  }, []);

  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const lowerCaseQuery = searchQuery.toLowerCase();
    const cleanedQuery = searchQuery.replace(/[.\-/]/g, ''); // For CNPJ matching

    const results = allFunds.filter(fund =>
      fund.name.toLowerCase().includes(lowerCaseQuery) ||
      fund.cnpj.replace(/[.\-/]/g, '').includes(cleanedQuery) ||
      fund.id.includes(cleanedQuery) // Match raw CNPJ too
    );
    setSearchResults(results);
    setSelectedFund(null); // Clear previous selection when new search is made
  }, [searchQuery, allFunds]);

  const handleSelectFund = (fund: FundInfo) => {
    setSelectedFund(fund);
  };

  const handleClearSelection = () => {
    setSelectedFund(null);
    // Optionally, clear search results too if desired, or keep them
    // setSearchResults([]); 
    // setSearchQuery('');
  };
  
  const formatCnpj = (cnpj: string): string => {
    // Assuming raw CNPJ is like 00111222000133
    if (cnpj && cnpj.length === 14) {
      return `${cnpj.slice(0,2)}.${cnpj.slice(2,5)}.${cnpj.slice(5,8)}/${cnpj.slice(8,12)}-${cnpj.slice(12,14)}`;
    }
    return cnpj; // Return original if not in expected format
  };


  const renderDetailItem = (label: string, value?: string | number | null, isCurrency: boolean = false, isPercentage: boolean = false, precision: number = 2) => {
    if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
      return null; // Don't render if value is not meaningful
    }
    let displayValue: string;
    if (isCurrency && typeof value === 'number') {
      displayValue = formatCurrency(value);
    } else if (isPercentage && typeof value === 'number') {
      displayValue = `${formatNumberForDisplay(value, {minimumFractionDigits: precision, maximumFractionDigits: precision})}%`;
    } else if (typeof value === 'number') {
      displayValue = formatNumberForDisplay(value, {minimumFractionDigits: 0, maximumFractionDigits: 0}); // For counts like quotaholders
    } else {
      displayValue = value.toString();
    }

    return (
      <div className="py-2 sm:grid sm:grid-cols-3 sm:gap-4">
        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</dt>
        <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">{displayValue}</dd>
      </div>
    );
  };


  if (isLoading) {
    return (
      <Card>
        <Card.Content className="py-10 flex justify-center items-center">
          <div className="flex flex-col items-center">
            <svg className="animate-spin h-10 w-10 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-center text-gray-500 dark:text-gray-400 mt-4">Carregando dados dos fundos...</p>
          </div>
        </Card.Content>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Card.Header><Card.Title>Erro</Card.Title></Card.Header>
        <Card.Content>
          <p className="text-center text-red-500 dark:text-red-400 py-10">{error}</p>
        </Card.Content>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <Card.Header>
          <Card.Title>Buscar Fundo de Investimento (CVM)</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="flex space-x-2">
            <Input
              type="text"
              placeholder="Nome ou CNPJ do fundo"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-grow"
              icon={<SearchIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />}
            />
            <Button onClick={handleSearch} variant="primary">Buscar</Button>
          </div>
           <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Fonte de dados: CVM (simulado com dados de exemplo).
          </p>
        </Card.Content>
      </Card>

      {selectedFund ? (
        <Card>
          <Card.Header className="flex justify-between items-center">
            <Card.Title>{selectedFund.name}</Card.Title>
            <Button onClick={handleClearSelection} variant="secondary" size="sm">Voltar aos Resultados</Button>
          </Card.Header>
          <Card.Content>
            <dl className="divide-y divide-gray-200 dark:divide-slate-700">
              {renderDetailItem('CNPJ', formatCnpj(selectedFund.cnpj))}
              {renderDetailItem('Classe do Fundo', selectedFund.fundClass)}
              {renderDetailItem('Administrador', selectedFund.administratorName)}
              {renderDetailItem('Gestor', selectedFund.managerName)}
              {renderDetailItem('Público Alvo', selectedFund.targetAudience)}
              {renderDetailItem('Aplicação Mínima Inicial', selectedFund.initialInvestment, true)}
              {renderDetailItem('Patrimônio Líquido', selectedFund.netAssetValue, true)}
              {renderDetailItem('Valor da Cota', selectedFund.quotaValue, false, false, 4)} 
              {renderDetailItem('Data da Cota', selectedFund.reportDate ? new Date(selectedFund.reportDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A')}
              {renderDetailItem('Taxa de Administração', selectedFund.adminFee, false, true, 2)}
              {renderDetailItem('Taxa de Performance', selectedFund.performanceFee)}
              {renderDetailItem('Número de Cotistas', selectedFund.numQuotaholders)}
            </dl>
          </Card.Content>
        </Card>
      ) : searchResults.length > 0 ? (
        <Card>
          <Card.Header>
            <Card.Title>Resultados da Busca ({searchResults.length})</Card.Title>
          </Card.Header>
          <Card.Content>
            <ul className="divide-y divide-gray-200 dark:divide-slate-700">
              {searchResults.map(fund => (
                <li key={fund.id} className="py-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 px-2 -mx-2 rounded-md">
                  <button 
                    onClick={() => handleSelectFund(fund)} 
                    className="w-full text-left focus:outline-none"
                    aria-label={`Ver detalhes de ${fund.name}`}
                  >
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-md font-medium text-primary-dark dark:text-primary-light">{fund.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{formatCnpj(fund.cnpj)}</p>
                        </div>
                        <span className="text-sm text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                            Ver Detalhes &rarr;
                        </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </Card.Content>
        </Card>
      ) : searchQuery && !isLoading ? (
         <Card>
          <Card.Content>
            <p className="text-center text-gray-500 dark:text-gray-400 py-10">
              Nenhum fundo encontrado para "{searchQuery}". Tente outros termos de busca.
            </p>
          </Card.Content>
        </Card>
      ) : (
        <Card>
          <Card.Content>
            <p className="text-center text-gray-500 dark:text-gray-400 py-10">
              Digite o nome ou CNPJ de um fundo para iniciar a busca.
            </p>
          </Card.Content>
        </Card>
      )}
    </div>
  );
};

export default FundAnalyzer;
