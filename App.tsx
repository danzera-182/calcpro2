
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { InputFormData, ScenarioData, AppView, BtcPriceInfo, UsdtPriceInfo, ArticleForSummary } from './types'; 
import { DEFAULT_INPUT_VALUES } from './constants';
import { calculateProjection } from './utils/calculations';
import { InputForm } from './components/InputForm.tsx';
import ResultsDisplay from './components/ResultsDisplay'; 
import ThemeToggle from './components/ThemeToggle';
import { Card } from './components/ui/Card';
import Button from './components/ui/Button';
import FixedIncomeComparator from './components/FixedIncomeComparator';
import ComprehensiveComparator from './components/ComprehensiveComparator'; 
import UpfrontVsInstallmentsCalculator from './components/UpfrontVsInstallmentsCalculator.tsx'; // New Calculator
import BitcoinRateDisplay from './components/BitcoinRateDisplay'; 
import UsdtRateDisplay from './components/UsdtRateDisplay';
import MacroEconomicPanel from './components/MacroEconomicPanel'; 
import TerminalView from './components/TerminalView';
import BitcoinDetailedChart from './components/BitcoinDetailedChart';
import UsdtDetailedChart from './components/UsdtDetailedChart';
import RSSStoriesFeed from './components/RSSStoriesFeed';
import NewsSummaryDetailView from './components/NewsSummaryDetailView';
import EconomicCalendarWidget from './components/EconomicCalendarWidget';
// import AnbimaDataViewer from './components/AnbimaDataViewer'; // Removed AnbimaDataViewer
import PropertyComparator from './components/PropertyComparator'; 
import { fetchLatestBitcoinPrice, fetchLatestUsdtPrice } from './utils/economicIndicatorsAPI';
import { formatCurrency, formatNumberForDisplay, formatNumber } from './utils/formatters';

const viewToPathMap: Record<AppView, string> = {
  selector: '/',
  compoundInterest: '/compound-interest',
  fixedIncomeComparator: '/fixed-income-comparator',
  comprehensiveComparator: '/comprehensive-comparator',
  rentVsBuyCalculator: '/rent-vs-buy', 
  upfrontVsInstallments: '/upfront-vs-installments', // New Path
  macroEconomicPanel: '/macro-economic-panel',
  macroEconomicTerminal: '/macro-economic-terminal',
  bitcoinChartDetail: '/bitcoin',
  usdtChartDetail: '/usdt',
  rssStoriesFeed: '/stories-feed',
  newsSummaryDetail: '/news-summary',
  economicCalendarWidget: '/economic-calendar-widget',
  // anbimaDataViewer: '/anbima-data', // Removed Anbima path
  experimentalFeatures: '/experimental-features', 
};

const pathToViewMap: { [key: string]: AppView } = Object.fromEntries(
  Object.entries(viewToPathMap).map(([view, path]) => [path, view as AppView])
);

const getAppViewFromHash = (hashInput: string | null | undefined): AppView => {
  const hash = typeof hashInput === 'string' ? hashInput : ''; 
  let path = hash.startsWith('#') ? hash.substring(1) : hash;
  if (path === '' || path === '/') {
    path = '/';
  } else if (!path.startsWith('/')) {
    path = `/${path}`;
  }
  return pathToViewMap[path] || 'selector';
};

const WarningIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
);

const FlaskIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.083c-.05.39-.142.772-.278 1.135l-.857 2.285a2.25 2.25 0 0 1-.262.643L9.14 14.25H6.36a11.938 11.938 0 0 0-3.094 1.257.75.75 0 0 0-.375.63V18.75c0 .414.336.75.75.75h15a.75.75 0 0 0 .75-.75v-2.603a.75.75 0 0 0-.375-.63 11.938 11.938 0 0 0-3.094-1.257h-2.78L14.53 9.99a2.25 2.25 0 0 1-.262-.643l-.857-2.285A7.47 7.47 0 0 0 14.25 6.083ZM15.75 3a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0 0 1.5h3a.75.75 0 0 0 .75-.75Z" />
  </svg>
);


const App: React.FC = () => {
  const [inputValues, setInputValues] = useState<InputFormData>(DEFAULT_INPUT_VALUES);
  const [scenarioData, setScenarioData] = useState<ScenarioData | null>(null);
  
  const [activeView, setActiveView] = useState<AppView>('selector'); 
  const [articleForSummary, setArticleForSummary] = useState<ArticleForSummary | null>(null); 

  const [isLoading, setIsLoading] = useState<boolean>(false); 

  const [bitcoinPriceInfo, setBitcoinPriceInfo] = useState<BtcPriceInfo | null>(null);
  const [isLoadingBitcoinPrice, setIsLoadingBitcoinPrice] = useState<boolean>(false);
  const [bitcoinPriceError, setBitcoinPriceError] = useState<string | null>(null);

  const [usdtPriceInfo, setUsdtPriceInfo] = useState<UsdtPriceInfo | null>(null);
  const [isLoadingUsdtPrice, setIsLoadingUsdtPrice] = useState<boolean>(false);
  const [usdtPriceError, setUsdtPriceError] = useState<string | null>(null);

  useEffect(() => {
    const newPath = viewToPathMap[activeView] || '/';
    const hashPath = (newPath === '/') ? '/' : newPath.substring(1);
    const targetHash = `#${hashPath}`;

    if (typeof window !== 'undefined' && window.location && window.location.hash !== targetHash) {
      try {
        if (targetHash === '#/' && (window.location.hash === '' || window.location.hash === '#')) {
            history.pushState(null, '', '#/');
        } else {
            history.pushState(null, '', targetHash);
        }
      } catch (e) {
        console.warn("Error manipulating history (pushState):", e);
      }
    }
  }, [activeView]);

  useEffect(() => {
    const getViewFromCurrentHash = () => {
        if (typeof window !== 'undefined' && window.location) {
            return getAppViewFromHash(window.location.hash);
        }
        return 'selector'; 
    };

    const handleHashChange = () => {
      const newViewFromHash = getViewFromCurrentHash();
      setActiveView(currentView => {
        if (newViewFromHash !== currentView) {
          if (newViewFromHash !== 'newsSummaryDetail') { 
            setArticleForSummary(null);
          }
          return newViewFromHash;
        }
        return currentView;
      });
    };
    
    if (typeof window !== 'undefined' && window.location) {
        const initialView = getViewFromCurrentHash();
        setActiveView(initialView);
        if (initialView === 'selector' && window.location.hash !== '#/' && (window.location.hash === '' || window.location.hash === '#')) {
            try {
                history.replaceState(null, '', '#/'); 
            } catch (e) {
                console.warn("Error manipulating history (replaceState):", e);
            }
        }
        window.addEventListener('hashchange', handleHashChange);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('hashchange', handleHashChange);
      }
    };
  }, []);


  const handleInputChange = useCallback((newInputValues: Partial<InputFormData>) => {
    setInputValues(prev => {
      const updatedValues = { ...prev, ...newInputValues };
      if (updatedValues.enableAdvancedSimulation && updatedValues.advancedSimModeRetirement && updatedValues.currentAge && updatedValues.targetAge) {
        if (updatedValues.targetAge > updatedValues.currentAge) {
          updatedValues.investmentPeriodYears = updatedValues.targetAge - updatedValues.currentAge;
        } else {
           updatedValues.investmentPeriodYears = prev.investmentPeriodYears; 
        }
      }
      return updatedValues;
    });
  }, []);
  
  const handleSimulate = useCallback(() => {
    setIsLoading(true);
    setScenarioData(null); 

    setTimeout(() => {
      let currentScenarioLabel = `Projeção Padrão (Taxa Anual: ${inputValues.rateValue.toFixed(2)}% a.a., Aportes Mensais)`;
      if (inputValues.enableAdvancedSimulation) {
        currentScenarioLabel = "Projeção Avançada";
        if (inputValues.advancedSimModeRetirement) {
            currentScenarioLabel += ` (Aposentadoria Idade ${inputValues.targetAge || 'N/D'})`;
        }
        if (inputValues.advancedSimModeSpecificContributions && inputValues.specificContributions && inputValues.specificContributions.length > 0) {
            currentScenarioLabel += ` (Com Aportes Específicos)`;
        }
         if (inputValues.adjustContributionsForInflation && inputValues.expectedInflationRate) {
            currentScenarioLabel += ` (Ajuste Inflação ${inputValues.expectedInflationRate}%)`;
        }
      }

      const projectionResult = calculateProjection({
          ...inputValues,
      });
      
      setScenarioData({
          label: currentScenarioLabel,
          data: projectionResult.yearly,
          monthlyData: projectionResult.monthly,
      });
      setIsLoading(false);
    }, 1000); 

  }, [inputValues]);

  useEffect(() => {
    const shouldFetchBtcDetailed = activeView === 'bitcoinChartDetail' && (!bitcoinPriceInfo || !bitcoinPriceInfo.description);
    const shouldFetchUsdtDetailed = activeView === 'usdtChartDetail' && (!usdtPriceInfo || !usdtPriceInfo.description);

    const shouldFetchBtcSelector = activeView === 'selector' && !bitcoinPriceInfo && !isLoadingBitcoinPrice && !bitcoinPriceError;
    const shouldFetchUsdtSelector = activeView === 'selector' && !usdtPriceInfo && !isLoadingUsdtPrice && !usdtPriceError;
    
    const needsBtcFetch = shouldFetchBtcDetailed || shouldFetchBtcSelector;
    const needsUsdtFetch = shouldFetchUsdtDetailed || shouldFetchUsdtSelector;

    if (needsBtcFetch || needsUsdtFetch) {
      const loadFinancialData = async () => {
        if (needsBtcFetch) {
            setIsLoadingBitcoinPrice(true);
            setBitcoinPriceError(null);
        }
        if (needsUsdtFetch) {
            setIsLoadingUsdtPrice(true);
            setUsdtPriceError(null);
        }

        try {
          const promises = [];
          if (needsBtcFetch) {
            promises.push(fetchLatestBitcoinPrice());
          } else {
            promises.push(Promise.resolve(bitcoinPriceInfo)); 
          }
          if (needsUsdtFetch) {
            promises.push(fetchLatestUsdtPrice());
          } else {
            promises.push(Promise.resolve(usdtPriceInfo)); 
          }

          const [btcResult, usdtResult] = await Promise.all(promises);

          if (needsBtcFetch) {
            if (btcResult && btcResult.usd !== undefined && btcResult.brl !== undefined) { 
              setBitcoinPriceInfo(btcResult as BtcPriceInfo);
            } else {
              setBitcoinPriceError("Cotação do Bitcoin não disponível.");
            }
          }
          if (needsUsdtFetch) {
            if (usdtResult && usdtResult.usd !== undefined && usdtResult.brl !== undefined) {
              setUsdtPriceInfo(usdtResult as UsdtPriceInfo);
            } else {
              setUsdtPriceError("Cotação do USDT não disponível.");
            }
          }
        } catch (e: any) {
          console.error("Error in App.tsx fetching financial data:", e.message, e);
          if (needsBtcFetch && !bitcoinPriceInfo) setBitcoinPriceError("Falha ao buscar cotação do Bitcoin.");
          if (needsUsdtFetch && !usdtPriceInfo) setUsdtPriceError("Falha ao buscar cotação do USDT.");
        } finally {
          if (needsBtcFetch) setIsLoadingBitcoinPrice(false);
          if (needsUsdtFetch) setIsLoadingUsdtPrice(false);
        }
      };
      loadFinancialData();
    }
  }, [activeView, bitcoinPriceInfo, isLoadingBitcoinPrice, bitcoinPriceError, usdtPriceInfo, isLoadingUsdtPrice, usdtPriceError]);
  
  const formatUnixTimestampForDisplay = (unixTimestamp?: number): string => {
    if (!unixTimestamp) return 'N/D';
    try {
      const date = new Date(unixTimestamp * 1000);
      if (isNaN(date.getTime())) return "Data inválida";
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric', 
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      }).format(date);
    } catch (e) {
      return "Horário indisponível";
    }
  };

  const handleSelectArticleForSummary = (article: ArticleForSummary) => {
    setArticleForSummary(article);
    setActiveView('newsSummaryDetail');
  };

  const renderContent = () => {
    switch (activeView) {
      case 'selector':
        return (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <BitcoinRateDisplay
                priceInfo={bitcoinPriceInfo}
                isLoading={isLoadingBitcoinPrice}
                error={bitcoinPriceError}
                onClick={() => setActiveView('bitcoinChartDetail')}
              />
              <UsdtRateDisplay
                priceInfo={usdtPriceInfo}
                isLoading={isLoadingUsdtPrice}
                error={usdtPriceError}
                onClick={() => setActiveView('usdtChartDetail')}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              <Card 
                className="cursor-pointer hover:shadow-premium-hover transition-shadow duration-200 ease-in-out transform hover:-translate-y-1"
                onClick={() => setActiveView('compoundInterest')}
                aria-label="Acessar Projeção de Patrimônio"
              >
                <Card.Header>
                  <Card.Title>📈 Projeção de Patrimônio e Aposentadoria</Card.Title>
                </Card.Header>
                <Card.Content>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Simule o crescimento dos seus investimentos com aportes mensais e taxa anual, visualize projeções detalhadas e explore cenários avançados de aposentadoria.
                  </p>
                  <Button variant="primary" className="mt-4 w-full" tabIndex={-1}>Acessar Calculadora</Button>
                </Card.Content>
              </Card>
              <Card 
                className="cursor-pointer hover:shadow-premium-hover transition-shadow duration-200 ease-in-out transform hover:-translate-y-1"
                onClick={() => setActiveView('fixedIncomeComparator')}
                aria-label="Acessar Simulador Isento vs. Tributado"
              >
                <Card.Header>
                  <Card.Title>⚖️ Simulador Isento vs. Tributado</Card.Title>
                </Card.Header>
                <Card.Content>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Descubra a rentabilidade líquida de investimentos pré-fixados ou pós-fixados (% do CDI) após o Imposto de Renda e compare com aplicações isentas.
                  </p>
                  <Button variant="primary" className="mt-4 w-full" tabIndex={-1}>Acessar Simulador</Button>
                </Card.Content>
              </Card>
              <Card 
                className="cursor-pointer hover:shadow-premium-hover transition-shadow duration-200 ease-in-out transform hover:-translate-y-1"
                onClick={() => setActiveView('comprehensiveComparator')}
                aria-label="Acessar Comparador Investimentos Renda-Fixa"
              >
                <Card.Header>
                  <Card.Title>📊 Comparador Investimentos Renda-Fixa</Card.Title>
                </Card.Header>
                <Card.Content>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Analise e compare diversas opções de investimento de renda fixa com parâmetros detalhados para identificar qual rende mais.
                  </p>
                  <Button variant="primary" className="mt-4 w-full" tabIndex={-1}>Acessar Comparador</Button>
                </Card.Content>
              </Card>
              <Card 
                className="cursor-pointer hover:shadow-premium-hover transition-shadow duration-200 ease-in-out transform hover:-translate-y-1"
                onClick={() => setActiveView('rentVsBuyCalculator')}
                aria-label="Acessar Calculadora Alugar vs. Financiar Imóvel"
              >
                <Card.Header>
                  <Card.Title>🏘️ Alugar vs. Financiar Imóvel</Card.Title>
                </Card.Header>
                <Card.Content>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Compare os cenários de alugar e investir a diferença versus financiar a compra de um imóvel, projetando seu patrimônio total.
                  </p>
                  <Button variant="primary" className="mt-4 w-full" tabIndex={-1}>Acessar Calculadora</Button>
                </Card.Content>
              </Card>
              {/* New Card for Upfront vs Installments */}
              <Card 
                className="cursor-pointer hover:shadow-premium-hover transition-shadow duration-200 ease-in-out transform hover:-translate-y-1"
                onClick={() => setActiveView('upfrontVsInstallments')}
                aria-label="Acessar Calculadora Pagar à Vista ou Parcelado"
              >
                <Card.Header>
                  <Card.Title>💰 Pagar à Vista ou Parcelado?</Card.Title>
                </Card.Header>
                <Card.Content>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Decida se é melhor pagar à vista com desconto ou parcelar (com ou sem juros), considerando o custo de oportunidade do seu dinheiro.
                  </p>
                  <Button variant="primary" className="mt-4 w-full" tabIndex={-1}>Acessar Calculadora</Button>
                </Card.Content>
              </Card>
              <Card 
                className="cursor-pointer hover:shadow-premium-hover transition-shadow duration-200 ease-in-out transform hover:-translate-y-1"
                onClick={() => setActiveView('macroEconomicPanel')}
                aria-label="Acessar Painel Macroeconômico"
              >
                <Card.Header>
                  <Card.Title>🌐 Painel Macroeconômico</Card.Title>
                </Card.Header>
                <Card.Content>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Acompanhe os principais indicadores econômicos do Brasil, como Selic, CDI, IPCA, TR e Dólar.
                  </p>
                  <Button variant="primary" className="mt-4 w-full" tabIndex={-1}>Acessar Painel</Button>
                </Card.Content>
              </Card>
               <Card 
                className="cursor-pointer hover:shadow-premium-hover transition-shadow duration-200 ease-in-out transform hover:-translate-y-1"
                onClick={() => setActiveView('economicCalendarWidget')}
                aria-label="Acessar Calendário Econômico"
              >
                <Card.Header>
                  <Card.Title>🗓️ Calendário Econômico</Card.Title>
                </Card.Header>
                <Card.Content>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Eventos e indicadores importantes em tempo real (TradingView).
                  </p>
                  <Button variant="primary" className="mt-4 w-full" tabIndex={-1}>Acessar Calendário</Button>
                </Card.Content>
              </Card>
              <Card 
                className="cursor-pointer hover:shadow-premium-hover transition-shadow duration-200 ease-in-out transform hover:-translate-y-1"
                onClick={() => setActiveView('experimentalFeatures')}
                aria-label="Acessar Funcionalidades Experimentais"
              >
                <Card.Header>
                  <Card.Title>
                     <div className="flex items-center">
                        <FlaskIcon className="w-5 h-5 mr-2 text-purple-500 dark:text-purple-400" />
                        Funcionalidades Experimentais
                      </div>
                  </Card.Title>
                </Card.Header>
                <Card.Content>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Explore ferramentas em desenvolvimento e teste, como o Feed de Notícias e Dados da Anbima.
                  </p>
                  <Button variant="primary" className="mt-4 w-full" tabIndex={-1}>Explorar Testes</Button>
                </Card.Content>
              </Card>
            </div>
          </>
        );
      case 'experimentalFeatures':
        return (
          <>
            <Button onClick={() => setActiveView('selector')} variant="secondary" size="md" className="mb-6" aria-label="Voltar para seleção de ferramentas">
              &larr; Voltar para seleção de ferramentas
            </Button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              <Card 
                className="cursor-pointer hover:shadow-premium-hover transition-shadow duration-200 ease-in-out transform hover:-translate-y-1"
                onClick={() => setActiveView('rssStoriesFeed')}
                aria-label="Acessar Feed de Notícias (Stories)"
              >
                <Card.Header>
                  <Card.Title>
                    <div className="flex items-center">
                      📰 Feed de Notícias (Stories)
                      <span 
                        className="ml-2 inline-flex items-center bg-amber-100 dark:bg-amber-700/50 text-amber-700 dark:text-amber-300 text-xs font-semibold px-2 py-0.5 rounded-full"
                        title="Esta funcionalidade está em fase de testes."
                      >
                        <WarningIcon className="w-3 h-3 mr-1 text-amber-500 dark:text-amber-400" />
                        EM TESTES
                      </span>
                    </div>
                  </Card.Title>
                </Card.Header>
                <Card.Content>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Acompanhe as últimas notícias do mercado financeiro em um formato de stories interativo e resuma artigos com IA.
                  </p>
                  <Button variant="primary" className="mt-4 w-full" tabIndex={-1}>Ver Notícias</Button>
                </Card.Content>
              </Card>
              {/* Anbima Card Removed */}
            </div>
          </>
        );
      case 'compoundInterest':
        return (
          <>
            <Button onClick={() => setActiveView('selector')} variant="secondary" size="md" className="mb-6" aria-label="Voltar para seleção de ferramentas">
              &larr; Voltar para seleção de ferramentas
            </Button>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
              <div className="lg:col-span-1 space-y-6 sm:space-y-8">
                <Card>
                  <Card.Header>
                    <Card.Title>Projeção de Patrimônio e Aposentadoria</Card.Title>
                  </Card.Header>
                  <Card.Content>
                    <InputForm
                      inputValues={inputValues}
                      onFormChange={handleInputChange}
                      onSimulate={handleSimulate}
                      isLoading={isLoading} 
                    />
                  </Card.Content>
                </Card>
              </div>
              <div className="lg:col-span-2 space-y-6 sm:space-y-8">
                {isLoading && (
                  <Card>
                    <Card.Content className="py-10 flex justify-center items-center">
                       <div className="flex flex-col items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-10 w-10 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-center text-slate-500 dark:text-slate-400 mt-4">Calculando projeção...</p>
                       </div>
                    </Card.Content>
                  </Card>
                )}
                {!isLoading && scenarioData && scenarioData.data.length > 0 && (
                  <ResultsDisplay 
                    scenarioData={scenarioData} 
                    inputValues={inputValues} 
                  />
                )}
                 {!isLoading && (!scenarioData || scenarioData.data.length === 0) && (
                  <Card>
                    <Card.Header><Card.Title>Resultados da Projeção</Card.Title></Card.Header>
                    <Card.Content>
                      <p className="text-center text-slate-500 dark:text-slate-400 py-10">
                        Ajuste os parâmetros e clique em "Simular" para visualizar a projeção.
                      </p>
                    </Card.Content>
                  </Card>
                )}
              </div>
            </div>
          </>
        );
      case 'fixedIncomeComparator':
        return (
          <>
            <Button onClick={() => setActiveView('selector')} variant="secondary" size="md" className="mb-6" aria-label="Voltar para seleção de ferramentas">
              &larr; Voltar para seleção de ferramentas
            </Button>
            <div className="max-w-2xl mx-auto">
              <FixedIncomeComparator />
            </div>
          </>
        );
      case 'comprehensiveComparator':
        return (
          <>
            <Button onClick={() => setActiveView('selector')} variant="secondary" size="md" className="mb-6" aria-label="Voltar para seleção de ferramentas">
              &larr; Voltar para seleção de ferramentas
            </Button>
            <ComprehensiveComparator /> 
          </>
        );
       case 'rentVsBuyCalculator': 
        return (
          <>
            <Button onClick={() => setActiveView('selector')} variant="secondary" size="md" className="mb-6" aria-label="Voltar para seleção de ferramentas">
              &larr; Voltar para seleção de ferramentas
            </Button>
            <PropertyComparator />
          </>
        );
      case 'upfrontVsInstallments': // New Case for "À Vista ou Parcelado"
        return (
          <>
            <Button onClick={() => setActiveView('selector')} variant="secondary" size="md" className="mb-6" aria-label="Voltar para seleção de ferramentas">
              &larr; Voltar para seleção de ferramentas
            </Button>
            <UpfrontVsInstallmentsCalculator />
          </>
        );
      case 'macroEconomicPanel':
        return (
          <>
            <Button onClick={() => setActiveView('selector')} variant="secondary" size="md" className="mb-6" aria-label="Voltar para seleção de ferramentas">
              &larr; Voltar para seleção de ferramentas
            </Button>
            <MacroEconomicPanel setActiveView={setActiveView} /> 
          </>
        );
       case 'macroEconomicTerminal': 
        return (
          <>
            <Button onClick={() => setActiveView('macroEconomicPanel')} variant="secondary" size="md" className="mb-6" aria-label="Voltar para Painel Macroeconômico">
              &larr; Voltar para Painel Macroeconômico
            </Button>
            <TerminalView />
          </>
        );
      case 'bitcoinChartDetail':
        if (isLoadingBitcoinPrice && !bitcoinPriceInfo?.description) { 
          return (
            <>
              <Button onClick={() => setActiveView('selector')} variant="secondary" size="md" className="mb-6" aria-label="Voltar para seleção de ferramentas">
                &larr; Voltar para seleção de ferramentas
              </Button>
              <Card>
                <Card.Header><Card.Title>Bitcoin (BTC) - Detalhes</Card.Title></Card.Header>
                <Card.Content className="py-10 flex justify-center items-center">
                  <div className="flex flex-col items-center">
                    <svg className="animate-spin h-10 w-10 text-orange-500 dark:text-orange-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-center text-slate-500 dark:text-slate-400 mt-4">Carregando dados do Bitcoin...</p>
                  </div>
                </Card.Content>
              </Card>
            </>
          );
        }
        if (bitcoinPriceError && !bitcoinPriceInfo?.description) { 
          return (
            <>
              <Button onClick={() => setActiveView('selector')} variant="secondary" size="md" className="mb-6" aria-label="Voltar para seleção de ferramentas">
                &larr; Voltar para seleção de ferramentas
              </Button>
              <Card>
                <Card.Header><Card.Title>Bitcoin (BTC) - Erro</Card.Title></Card.Header>
                <Card.Content>
                  <p className="text-center text-red-500 dark:text-red-400 py-10">
                    {bitcoinPriceError}
                  </p>
                </Card.Content>
              </Card>
            </>
          );
        }
        
        return (
          <>
            <Button onClick={() => setActiveView('selector')} variant="secondary" size="md" className="mb-6" aria-label="Voltar para seleção de ferramentas">
              &larr; Voltar para seleção de ferramentas
            </Button>
            <Card>
              <Card.Header>
                <div className="flex items-center space-x-3">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className="w-8 h-8 text-orange-500">
                        <defs><linearGradient id="logosBitcoin0" x1="49.973%" x2="49.973%" y1="-.024%" y2="99.99%"><stop offset="0%" stopColor="#F9AA4B"/><stop offset="100%" stopColor="#F7931A"/></linearGradient></defs>
                        <path fill="url(#logosBitcoin0)" d="M252.171 158.954c-17.102 68.608-86.613 110.314-155.123 93.211c-68.61-17.102-110.316-86.61-93.213-155.119C20.937 28.438 90.347-13.268 158.957 3.835c68.51 17.002 110.317 86.51 93.214 155.119Z"/>
                        <path fill="#FFF" d="M188.945 112.05c2.5-17-10.4-26.2-28.2-32.3l5.8-23.1l-14-3.5l-5.6 22.5c-3.7-.9-7.5-1.8-11.3-2.6l5.6-22.6l-14-3.5l-5.7 23c-3.1-.7-6.1-1.4-9-2.1v-.1l-19.4-4.8l-3.7 15s10.4 2.4 10.2 2.5c5.7 1.4 6.7 5.2 6.5 8.2l-6.6 26.3c.4.1.9.2 1.5 .5c-.5-.1-1-.2-1.5-.4l-9.2 36.8c-.7 1.7-2.5 4.3-6.4 3.3c.1.2-10.2-2.5-10.2-2.5l-7 16.1l18.3 4.6c3.4.9 6.7 1.7 10 2.6l-5.8 23.3l14 3.5l5.8-23.1c3.8 1 7.6 2 11.2 2.9l-5.7 23l14 3.5l5.8-23.3c24 4.5 42 2.7 49.5-19c6.1-17.4-.3-27.5-12.9-34.1c9.3-2.1 16.2-8.2 18-20.6Zm-32.1 45c-4.3 17.4-33.7 8-43.2 5.6l7.7-30.9c9.5 2.4 40.1 7.1 35.5 25.3Zm4.4-45.3c-4 15.9-28.4 7.8-36.3 5.8l7-28c7.9 2 33.4 5.7 29.3 22.2Z"/>
                    </svg>
                    <Card.Title>Bitcoin (BTC) - Detalhes</Card.Title>
                </div>
              </Card.Header>
              <Card.Content className="space-y-6">
                <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg shadow-inner">
                  <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">Gráfico Interativo de Preço (USD)</h3>
                  <BitcoinDetailedChart coinId="bitcoin" vsCurrency="usd" />
                </div>
                
                {isLoadingBitcoinPrice && bitcoinPriceInfo && !bitcoinPriceInfo.description && (
                    <div className="text-center text-xs text-slate-500 dark:text-slate-400">Atualizando dados detalhados...</div>
                )}
                {bitcoinPriceError && bitcoinPriceInfo && !bitcoinPriceInfo.description &&(
                    <div className="text-center text-xs text-red-500 dark:text-red-400">Erro ao atualizar dados. Exibindo cotação básica.</div>
                )}
                {(!bitcoinPriceInfo && !isLoadingBitcoinPrice && !bitcoinPriceError) && (
                     <p className="text-center text-slate-500 dark:text-slate-400 py-5">Nenhum dado de cotação do Bitcoin disponível.</p>
                )}
                {bitcoinPriceInfo && (
                    <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg shadow-inner">
                        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">Cotação Atual</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                            <p><strong className="text-slate-600 dark:text-slate-300">Preço (USD):</strong> {bitcoinPriceInfo.usd != null ? formatCurrency(bitcoinPriceInfo.usd, 'USD') : 'N/A'}</p>
                            <p><strong className="text-slate-600 dark:text-slate-300">Preço (BRL):</strong> {bitcoinPriceInfo.brl != null ? formatCurrency(bitcoinPriceInfo.brl) : 'N/A'}</p>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Última atualização: {formatUnixTimestampForDisplay(bitcoinPriceInfo.lastUpdatedAt)} (CoinGecko)
                        </p>
                    </div>
                )}

                {bitcoinPriceInfo && (bitcoinPriceInfo.marketCapUsd || bitcoinPriceInfo.marketCapBrl || bitcoinPriceInfo.totalSupply || bitcoinPriceInfo.circulatingSupply) && (
                  <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg shadow-inner">
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">Dados de Mercado</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      {bitcoinPriceInfo.marketCapUsd != null && <p><strong className="text-slate-600 dark:text-slate-300">Capitalização (USD):</strong> {formatCurrency(bitcoinPriceInfo.marketCapUsd, 'USD')}</p>}
                      {bitcoinPriceInfo.marketCapBrl != null && <p><strong className="text-slate-600 dark:text-slate-300">Capitalização (BRL):</strong> {formatCurrency(bitcoinPriceInfo.marketCapBrl)}</p>}
                      {bitcoinPriceInfo.totalSupply != null && <p><strong className="text-slate-600 dark:text-slate-300">Fornecimento Total:</strong> {formatNumber(bitcoinPriceInfo.totalSupply, 0)} BTC</p>}
                      {bitcoinPriceInfo.circulatingSupply != null && <p><strong className="text-slate-600 dark:text-slate-300">Fornecimento Circulante:</strong> {formatNumber(bitcoinPriceInfo.circulatingSupply, 0)} BTC</p>}
                    </div>
                  </div>
                )}

                {bitcoinPriceInfo && bitcoinPriceInfo.description && (
                  <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg shadow-inner">
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">Sobre o Bitcoin</h3>
                    <div 
                      className="text-sm text-slate-600 dark:text-slate-300 prose prose-sm dark:prose-invert max-w-none leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: bitcoinPriceInfo.description }} 
                    />
                  </div>
                )}
              </Card.Content>
            </Card>
          </>
        );
      case 'usdtChartDetail':
        if (isLoadingUsdtPrice && !usdtPriceInfo?.description) {
          return (
            <>
              <Button onClick={() => setActiveView('selector')} variant="secondary" size="md" className="mb-6" aria-label="Voltar para seleção de ferramentas">
                &larr; Voltar para seleção de ferramentas
              </Button>
              <Card>
                <Card.Header>
                    <div className="flex items-center space-x-3">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-8 h-8 text-green-500">
                            <g fillRule="evenodd"><circle cx="16" cy="16" r="16" fill="#26A17B"/><path fill="#FFF" d="M17.922 17.383v-.002c-.11.008-.677.042-1.942.042c-1.01 0-1.721-.03-1.971-.042v.003c-3.888-.171-6.79-.848-6.79-1.658c0-.809 2.902-1.486 6.79-1.66v2.644c.254.018.982.061 1.988.061c1.207 0 1.812-.05 1.925-.06v-2.643c3.88.173 6.775.85 6.775 1.658c0 .81-2.895 1.485-6.775 1.657m0-3.59v-2.366h5.414V7.819H8.595v3.608h5.414v2.365c-4.4.202-7.709 1.074-7.709 2.118c0 1.044 3.309 1.915 7.709 2.118v7.582h3.913v-7.584c4.393-.202 7.694-1.073 7.694-2.116c0-1.043-3.301-1.914-7.694-2.117"/></g>
                        </svg>
                        <Card.Title>USDT (Tether) - Detalhes</Card.Title>
                    </div>
                </Card.Header>
                <Card.Content className="py-10 flex justify-center items-center">
                  <div className="flex flex-col items-center">
                    <svg className="animate-spin h-10 w-10 text-green-500 dark:text-green-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-center text-slate-500 dark:text-slate-400 mt-4">Carregando dados do USDT...</p>
                  </div>
                </Card.Content>
              </Card>
            </>
          );
        }
        if (usdtPriceError && !usdtPriceInfo?.description) {
          return (
            <>
              <Button onClick={() => setActiveView('selector')} variant="secondary" size="md" className="mb-6" aria-label="Voltar para seleção de ferramentas">
                &larr; Voltar para seleção de ferramentas
              </Button>
              <Card>
                 <Card.Header>
                    <div className="flex items-center space-x-3">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-8 h-8 text-green-500">
                           <g fillRule="evenodd"><circle cx="16" cy="16" r="16" fill="#26A17B"/><path fill="#FFF" d="M17.922 17.383v-.002c-.11.008-.677.042-1.942.042c-1.01 0-1.721-.03-1.971-.042v.003c-3.888-.171-6.79-.848-6.79-1.658c0-.809 2.902-1.486 6.79-1.66v2.644c.254.018.982.061 1.988.061c1.207 0 1.812-.05 1.925-.06v-2.643c3.88.173 6.775.85 6.775 1.658c0 .81-2.895 1.485-6.775 1.657m0-3.59v-2.366h5.414V7.819H8.595v3.608h5.414v2.365c-4.4.202-7.709 1.074-7.709 2.118c0 1.044 3.309 1.915 7.709 2.118v7.582h3.913v-7.584c4.393-.202 7.694-1.073 7.694-2.116c0-1.043-3.301-1.914-7.694-2.117"/></g>
                        </svg>
                        <Card.Title>USDT (Tether) - Erro</Card.Title>
                    </div>
                </Card.Header>
                <Card.Content>
                  <p className="text-center text-red-500 dark:text-red-400 py-10">{usdtPriceError}</p>
                </Card.Content>
              </Card>
            </>
          );
        }
        return (
            <>
              <Button onClick={() => setActiveView('selector')} variant="secondary" size="md" className="mb-6" aria-label="Voltar para seleção de ferramentas">
                &larr; Voltar para seleção de ferramentas
              </Button>
              <Card>
                 <Card.Header>
                    <div className="flex items-center space-x-3">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-8 h-8 text-green-500">
                           <g fillRule="evenodd"><circle cx="16" cy="16" r="16" fill="#26A17B"/><path fill="#FFF" d="M17.922 17.383v-.002c-.11.008-.677.042-1.942.042c-1.01 0-1.721-.03-1.971-.042v.003c-3.888-.171-6.79-.848-6.79-1.658c0-.809 2.902-1.486 6.79-1.66v2.644c.254.018.982.061 1.988.061c1.207 0 1.812-.05 1.925-.06v-2.643c3.88.173 6.775.85 6.775 1.658c0 .81-2.895 1.485-6.775 1.657m0-3.59v-2.366h5.414V7.819H8.595v3.608h5.414v2.365c-4.4.202-7.709 1.074-7.709 2.118c0 1.044 3.309 1.915 7.709 2.118v7.582h3.913v-7.584c4.393-.202 7.694-1.073 7.694-2.116c0-1.043-3.301-1.914-7.694-2.117"/></g>
                        </svg>
                        <Card.Title>USDT (Tether) - Detalhes</Card.Title>
                    </div>
                </Card.Header>
                <Card.Content className="space-y-6">
                    <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg shadow-inner">
                        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">Gráfico Interativo de Preço (BRL)</h3>
                         <UsdtDetailedChart coinId="tether" vsCurrency="brl" />
                    </div>

                    {isLoadingUsdtPrice && usdtPriceInfo && !usdtPriceInfo.description && (
                        <div className="text-center text-xs text-slate-500 dark:text-slate-400">Atualizando dados detalhados...</div>
                    )}
                    {usdtPriceError && usdtPriceInfo && !usdtPriceInfo.description && (
                        <div className="text-center text-xs text-red-500 dark:text-red-400">Erro ao atualizar dados. Exibindo cotação básica.</div>
                    )}
                    {(!usdtPriceInfo && !isLoadingUsdtPrice && !usdtPriceError) && (
                        <p className="text-center text-slate-500 dark:text-slate-400 py-5">Nenhum dado de cotação do USDT disponível.</p>
                    )}
                    {usdtPriceInfo && (
                        <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg shadow-inner">
                            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">Cotação Atual</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                <p><strong className="text-slate-600 dark:text-slate-300">Preço (USD):</strong> {usdtPriceInfo.usd != null ? formatCurrency(usdtPriceInfo.usd, 'USD') : 'N/A'}</p>
                                <p><strong className="text-slate-600 dark:text-slate-300">Preço (BRL):</strong> {usdtPriceInfo.brl != null ? formatCurrency(usdtPriceInfo.brl) : 'N/A'}</p>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Última atualização: {formatUnixTimestampForDisplay(usdtPriceInfo.lastUpdatedAt)} (CoinGecko)
                            </p>
                        </div>
                    )}

                    {usdtPriceInfo && (usdtPriceInfo.marketCapUsd || usdtPriceInfo.marketCapBrl || usdtPriceInfo.totalSupply || usdtPriceInfo.circulatingSupply) && (
                        <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg shadow-inner">
                            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">Dados de Mercado</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                            {usdtPriceInfo.marketCapUsd != null && <p><strong className="text-slate-600 dark:text-slate-300">Capitalização (USD):</strong> {formatCurrency(usdtPriceInfo.marketCapUsd, 'USD')}</p>}
                            {usdtPriceInfo.marketCapBrl != null && <p><strong className="text-slate-600 dark:text-slate-300">Capitalização (BRL):</strong> {formatCurrency(usdtPriceInfo.marketCapBrl)}</p>}
                            {usdtPriceInfo.totalSupply != null && <p><strong className="text-slate-600 dark:text-slate-300">Fornecimento Total:</strong> {formatNumber(usdtPriceInfo.totalSupply, 0)} USDT</p>}
                            {usdtPriceInfo.circulatingSupply != null && <p><strong className="text-slate-600 dark:text-slate-300">Fornecimento Circulante:</strong> {formatNumber(usdtPriceInfo.circulatingSupply, 0)} USDT</p>}
                            </div>
                        </div>
                    )}

                    {usdtPriceInfo && usdtPriceInfo.description && (
                        <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg shadow-inner">
                            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">Sobre o USDT (Tether)</h3>
                            <div 
                            className="text-sm text-slate-600 dark:text-slate-300 prose prose-sm dark:prose-invert max-w-none leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: usdtPriceInfo.description }} 
                            />
                        </div>
                    )}
                </Card.Content>
              </Card>
            </>
          );
      case 'rssStoriesFeed':
        return (
          <>
            <Button onClick={() => setActiveView('experimentalFeatures')} variant="secondary" size="md" className="mb-6" aria-label="Voltar para Funcionalidades Experimentais">
              &larr; Voltar para Funcionalidades Experimentais
            </Button>
            <RSSStoriesFeed onSelectArticleForSummary={handleSelectArticleForSummary} />
          </>
        );
      case 'newsSummaryDetail':
        if (!articleForSummary) {
             setActiveView('rssStoriesFeed'); 
             return null;
        }
        return (
            <NewsSummaryDetailView 
                article={articleForSummary}
                onBack={() => { setArticleForSummary(null); setActiveView('rssStoriesFeed'); }}
            />
        );
      case 'economicCalendarWidget':
        return (
          <>
            <Button onClick={() => setActiveView('selector')} variant="secondary" size="md" className="mb-6" aria-label="Voltar para seleção de ferramentas">
              &larr; Voltar para seleção de ferramentas
            </Button>
            <EconomicCalendarWidget />
          </>
        );
      // case 'anbimaDataViewer': // Removed AnbimaDataViewer case
      //   return (
      //     <>
      //       <Button onClick={() => setActiveView('experimentalFeatures')} variant="secondary" size="md" className="mb-6" aria-label="Voltar para Funcionalidades Experimentais">
      //         &larr; Voltar para Funcionalidades Experimentais
      //       </Button>
      //       <AnbimaDataViewer />
      //     </>
      //   );
      default:
        if (activeView !== 'selector') {
            setActiveView('selector'); 
        }
        return null;
    }
  };
  
  return (
    <div className="min-h-screen">
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg shadow-premium">
        <div className="container mx-auto px-4 sm:px-6 pt-4 pb-2 relative">
          <div className="flex justify-center items-center"> {/* Centered logo */}
            <h1 className="text-2xl sm:text-3xl font-bold">
              <svg 
                viewBox="0 0 165 35" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg" 
                aria-labelledby="wealthLabLogoTitleV9" 
                className="h-10 sm:h-12 w-auto" 
                role="img"
              >
                <title id="wealthLabLogoTitleV9">The Wealth Lab Logo</title>
                <defs>
                  <linearGradient id="labTextGradient" x1="0%" y1="0%" x2="100%" y2="100%" gradientTransform="translate(0 0)">
                    <stop offset="0%" style={{stopColor: '#3B82F6', stopOpacity: 1}} />
                    <stop offset="100%" style={{stopColor: '#1D4ED8', stopOpacity: 1}} />
                    <animateTransform
                      attributeName="gradientTransform"
                      type="translate"
                      values="0 0; 0.03 0.03; 0 0; -0.03 -0.03; 0 0" 
                      dur="8s"
                      repeatCount="indefinite"
                    />
                  </linearGradient>
                </defs>
                <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontFamily="'Outfit', Arial, sans-serif">
                  <tspan fontSize="15" fontWeight="400" className="fill-slate-700 dark:fill-slate-200">the </tspan>
                  <tspan fontWeight="400" fontSize="26" className="fill-slate-700 dark:fill-slate-200">wealth</tspan>
                  <tspan fontWeight="700" fontSize="26" fill="url(#labTextGradient)">lab.</tspan>
                </text>
              </svg>
            </h1>
          </div>
          <div className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 pt-[5rem] sm:pt-[6rem] pb-8">
        {renderContent()}
      </main>

      <footer className="container mx-auto px-4 sm:px-6 mt-12 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400 py-4 border-t border-slate-200 dark:border-slate-800">
        <p>&copy; {new Date().getFullYear()} The Wealth Lab.</p>
        <p className="mt-1">Criado com 🧠 para planejadores e investidores</p>
        <p className="mt-1">Daniel Camargo, CFP® | Instagram: @_cmdan</p>
        <p className="mt-1">Lembre-se: esta é uma ferramenta de simulação. Rentabilidade passada não garante rentabilidade futura. O comparativo histórico utiliza dados reais (estáticos e limitados a um período específico) para fins ilustrativos. Consulte um profissional.</p>
      </footer>
    </div>
  );
};

export default App;
