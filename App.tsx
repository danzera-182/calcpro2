
import React, { useState, useCallback } from 'react';
import { InputFormData, ScenarioData, AppView } from './types';
import { DEFAULT_INPUT_VALUES } from './constants';
import { calculateProjection } from './utils/calculations';
// import { calculateBacktestProjections } from './utils/backtestCalculations'; // Removed
import InputForm from './components/InputForm';
import ResultsDisplay from './components/ResultsDisplay';
import ThemeToggle from './components/ThemeToggle';
import { Card } from './components/ui/Card';
import Button from './components/ui/Button';
import FixedIncomeComparator from './components/FixedIncomeComparator';
import ComprehensiveComparator from './components/ComprehensiveComparator'; // Import new component

const App: React.FC = () => {
  const [inputValues, setInputValues] = useState<InputFormData>(DEFAULT_INPUT_VALUES);
  const [scenarioData, setScenarioData] = useState<ScenarioData | null>(null);
  // const [backtestResults, setBacktestResults] = useState<BacktestResults | null>(null); // Removed
  const [activeView, setActiveView] = useState<AppView>('selector');
  const [isLoading, setIsLoading] = useState<boolean>(false); // Added isLoading state

  const handleInputChange = useCallback((newInputValues: Partial<InputFormData>) => {
    setInputValues(prev => {
      const updatedValues = { ...prev, ...newInputValues };
      
      // If rateValue is updated, effectiveAnnualRate should also be updated
      // as the input rate is always considered annual.
      // if (newInputValues.rateValue !== undefined) { // Removed effectiveAnnualRate logic
      //   updatedValues.effectiveAnnualRate = updatedValues.rateValue;
      // }
      return updatedValues;
    });
  }, []);
  
  const handleSimulate = useCallback(() => {
    setIsLoading(true);
    setScenarioData(null); // Clear previous results immediately
    // setBacktestResults(null); // Removed

    setTimeout(() => {
      // Contributions are always monthly, interest rate is always annual
      const isContributionAnnual = false;
      const isInterestRateAnnual = true;
      
      const currentScenarioLabel = `Projeção (Taxa Anual: ${inputValues.rateValue.toFixed(2)}% a.a., Aportes Mensais)`;

      const projectionResult = calculateProjection({
          initialInvestment: inputValues.initialInvestment,
          contributionAmount: inputValues.contributionValue, // This is monthly
          isContributionAnnual: isContributionAnnual,
          interestRateValue: inputValues.rateValue, // This is annual
          isInterestRateAnnual: isInterestRateAnnual,
          investmentPeriodYears: inputValues.investmentPeriodYears,
      });
      
      setScenarioData({
          label: currentScenarioLabel,
          data: projectionResult.yearly,
          monthlyData: projectionResult.monthly,
      });

      // For backtest, contributions are annualized
      // const annualizedContributionForBacktest = inputValues.contributionValue * 12; // Removed

      // const backtestData = calculateBacktestProjections({ // Removed
      //     initialInvestment: inputValues.initialInvestment,
      //     annualizedContribution: annualizedContributionForBacktest,
      //     effectiveAnnualRate: inputValues.effectiveAnnualRate, 
      //     investmentPeriodYears: inputValues.investmentPeriodYears
      // });
      // setBacktestResults(backtestData); // Removed
      setIsLoading(false);
    }, 1000); // 1 second delay

  }, [inputValues]);

  const getSubtitle = () => {
    switch (activeView) {
      case 'compoundInterest':
        return "Simule o futuro dos seus investimentos com projeções detalhadas."; // Updated subtitle
      case 'fixedIncomeComparator':
        return "Analise a equivalência de rentabilidade entre investimentos de renda fixa tributados e isentos.";
      case 'comprehensiveComparator':
        return "Compare diferentes aplicações financeiras com parâmetros detalhados.";
      case 'selector':
      default:
        return "Suas ferramentas financeiras em um só lugar. Escolha uma opção abaixo para começar.";
    }
  };

  const renderContent = () => {
    switch (activeView) {
      case 'selector':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mt-8">
            <Card 
              className="cursor-pointer hover:shadow-2xl transition-shadow duration-200 ease-in-out transform hover:-translate-y-1"
              onClick={() => setActiveView('compoundInterest')}
            >
              <Card.Header>
                <Card.Title>Juros Compostos & Projeção</Card.Title>
              </Card.Header>
              <Card.Content>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Simule o crescimento dos seus investimentos com aportes mensais e taxa anual, visualize projeções detalhadas. {/* Updated description */}
                </p>
                <Button variant="primary" className="mt-4 w-full">Acessar Calculadora</Button>
              </Card.Content>
            </Card>
            <Card 
              className="cursor-pointer hover:shadow-2xl transition-shadow duration-200 ease-in-out transform hover:-translate-y-1"
              onClick={() => setActiveView('fixedIncomeComparator')}
            >
              <Card.Header>
                <Card.Title>Comparador de Renda Fixa</Card.Title>
              </Card.Header>
              <Card.Content>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Descubra a rentabilidade líquida de investimentos pré-fixados ou pós-fixados (% do CDI) após o Imposto de Renda e compare com aplicações isentas.
                </p>
                 <Button variant="primary" className="mt-4 w-full">Acessar Comparador</Button>
              </Card.Content>
            </Card>
            <Card 
              className="cursor-pointer hover:shadow-2xl transition-shadow duration-200 ease-in-out transform hover:-translate-y-1 md:col-span-2 lg:col-span-1" // Span across on medium, normal on large
              onClick={() => setActiveView('comprehensiveComparator')}
            >
              <Card.Header>
                <Card.Title>Comparador Completo de Aplicações</Card.Title>
              </Card.Header>
              <Card.Content>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Analise e compare diversas opções de investimento com parâmetros detalhados para identificar qual rende mais.
                </p>
                 <Button variant="primary" className="mt-4 w-full">Acessar Comparador Completo</Button>
              </Card.Content>
            </Card>
          </div>
        );
      case 'compoundInterest':
        return (
          <>
            <Button onClick={() => setActiveView('selector')} variant="ghost" size="sm" className="mb-6 text-sm dark:text-blue-400">
              &larr; Voltar para seleção de ferramentas
            </Button>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
              <div className="lg:col-span-1 space-y-6 sm:space-y-8">
                <Card>
                  <Card.Header>
                    <Card.Title>Juros Compostos & Projeção</Card.Title>
                  </Card.Header>
                  <Card.Content>
                    <InputForm
                      inputValues={inputValues}
                      onFormChange={handleInputChange}
                      onSimulate={handleSimulate}
                      isLoading={isLoading} // Pass isLoading
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
                        <p className="text-center text-gray-500 dark:text-gray-400 mt-4">Calculando projeção...</p>
                       </div>
                    </Card.Content>
                  </Card>
                )}
                {!isLoading && scenarioData && scenarioData.data.length > 0 && (
                  <ResultsDisplay 
                    scenarioData={scenarioData} 
                    // backtestResults={backtestResults} // Removed
                    inputValues={inputValues} 
                  />
                )}
                 {!isLoading && (!scenarioData || scenarioData.data.length === 0) && (
                  <Card>
                    <Card.Header><Card.Title>Resultados da Projeção</Card.Title></Card.Header>
                    <Card.Content>
                      <p className="text-center text-gray-500 dark:text-gray-400 py-10">
                        Ajuste os parâmetros e clique em "Simular" para visualizar a projeção. {/* Updated text */}
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
            <Button onClick={() => setActiveView('selector')} variant="ghost" size="sm" className="mb-6 text-sm dark:text-blue-400">
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
            <Button onClick={() => setActiveView('selector')} variant="ghost" size="sm" className="mb-6 text-sm dark:text-blue-400">
              &larr; Voltar para seleção de ferramentas
            </Button>
            <ComprehensiveComparator /> 
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-8">
      <header className="container mx-auto mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-300">
            Calculadora Financeira Pro
          </h1>
          <ThemeToggle />
        </div>
        <p className="mt-2 text-sm sm:text-base text-gray-600 dark:text-blue-400">
          {getSubtitle()}
        </p>
      </header>

      <main className="container mx-auto">
        {renderContent()}
      </main>

      <footer className="container mx-auto mt-12 text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400 py-4 border-t border-gray-200 dark:border-slate-700">
        <p>&copy; {new Date().getFullYear()} Calculadora Financeira Pro.</p>
        <p className="mt-1">Criado por Daniel Camargo, CFP® e Instagram: @_cmdan</p>
        <p className="mt-1">Lembre-se: esta é uma ferramenta de simulação. Rentabilidade passada não garante rentabilidade futura. O comparativo histórico utiliza dados reais (estáticos e limitados a um período específico) para fins ilustrativos. Consulte um profissional.</p>
      </footer>
    </div>
  );
};

export default App;
