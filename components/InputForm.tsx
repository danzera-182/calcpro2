
import React, { useState, useEffect, useCallback } from 'react';
import { InputFormData, SpecificContribution, DynamicHistoricalAverage } from '../types';
import Button from './ui/Button';
import FormattedNumericInput from './ui/FormattedNumericInput';
import Input from './ui/Input';
import Select from './ui/Select'; // For month selection
import ToggleSwitch from './ui/ToggleSwitch';
import { formatNumberForDisplay } from '../utils/formatters';
import { SGS_CODE_CDI_MONTHLY, SGS_CODE_IPCA_MONTHLY } from '../constants';
import { fetchAndCalculateHistoricalAverage } from '../utils/economicIndicatorsAPI';
import { Card } from './ui/Card';
import InfoTooltip from './ui/InfoTooltip';

interface InputFormProps {
  inputValues: InputFormData;
  onFormChange: (values: Partial<InputFormData>) => void;
  onSimulate: () => void;
  isLoading: boolean;
}

const TrashIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12.56 0c1.153 0 2.243.096 3.264.267M15 2.25h-6v1h6V2.25Z" />
  </svg>
);

const ChevronDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
  </svg>
);

// QuestionMarkCircleIcon is no longer used here, as InfoTooltip has a new default
// const QuestionMarkCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
//   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true" {...props}>
//     <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
//   </svg>
// );


export const InputForm: React.FC<InputFormProps> = ({ 
  inputValues,
  onFormChange,
  onSimulate,
  isLoading
}) => {

  const initialDynamicAverageState: DynamicHistoricalAverage = {
    value: null,
    isLoading: true,
    error: null,
    sourceDateRange: undefined,
    sourceSgsCode: undefined,
  };

  const [cdiAverageData, setCdiAverageData] = useState<DynamicHistoricalAverage>(initialDynamicAverageState);
  const [ipcaAverageData, setIpcaAverageData] = useState<DynamicHistoricalAverage>(initialDynamicAverageState);
  const HISTORICAL_YEARS = 20;

  useEffect(() => {
    const fetchAverages = async () => {
      setCdiAverageData(prev => ({ ...prev, isLoading: true, error: null, sourceSgsCode: SGS_CODE_CDI_MONTHLY }));
      const cdiResult = await fetchAndCalculateHistoricalAverage(SGS_CODE_CDI_MONTHLY, HISTORICAL_YEARS);
      setCdiAverageData({ ...cdiResult, isLoading: false, sourceSgsCode: SGS_CODE_CDI_MONTHLY });

      setIpcaAverageData(prev => ({ ...prev, isLoading: true, error: null, sourceSgsCode: SGS_CODE_IPCA_MONTHLY }));
      const ipcaResult = await fetchAndCalculateHistoricalAverage(SGS_CODE_IPCA_MONTHLY, HISTORICAL_YEARS);
      setIpcaAverageData({ ...ipcaResult, isLoading: false, sourceSgsCode: SGS_CODE_IPCA_MONTHLY });
    };

    fetchAverages();
  }, []);


  const handleFormattedChange = (name: string, val: number | null) => {
    onFormChange({ [name]: val === null ? 0 : val });
  };
  
  const handleDirectChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let parsedValue: string | number | boolean = value;

    if (type === 'number') {
      parsedValue = value === '' ? 0 : (name === 'expectedInflationRate' ? parseFloat(value) : parseInt(value, 10));
      if (parsedValue < 0 && name !== 'expectedInflationRate') parsedValue = 0;
    } else if (type === 'checkbox') { 
        parsedValue = (e.target as HTMLInputElement).checked;
    }
    onFormChange({ [name]: parsedValue });
  };

  const handleToggleChange = (name: string, checked: boolean) => {
    onFormChange({ [name]: checked });
  };

  const handleSpecificContributionChange = (id: string, field: keyof Omit<SpecificContribution, 'id' | 'description'>, value: string | number) => {
    const updatedContributions = (inputValues.specificContributions || []).map(contrib => {
      if (contrib.id === id) {
        return { ...contrib, [field]: field === 'amount' ? parseFloat(value as string) || 0 : parseInt(value as string, 10) || 0 };
      }
      return contrib;
    });
    onFormChange({ specificContributions: updatedContributions });
  };
  
  const handleSpecificContributionDescriptionChange = (id: string, value: string) => {
    const updatedContributions = (inputValues.specificContributions || []).map(contrib => {
      if (contrib.id === id) {
        return { ...contrib, description: value };
      }
      return contrib;
    });
    onFormChange({ specificContributions: updatedContributions });
  };


  const addSpecificContribution = () => {
    const newContribution: SpecificContribution = {
      id: Date.now().toString(), 
      year: 1,
      month: 1,
      amount: 0,
      description: ''
    };
    onFormChange({ specificContributions: [...(inputValues.specificContributions || []), newContribution] });
  };

  const removeSpecificContribution = (id: string) => {
    onFormChange({ specificContributions: (inputValues.specificContributions || []).filter(c => c.id !== id) });
  };

  const annualRateDecimal = inputValues.rateValue / 100;
  let monthlyEquivalentRatePercent = 0;
  if (annualRateDecimal > -1) {
      monthlyEquivalentRatePercent = (Math.pow(1 + annualRateDecimal, 1 / 12) - 1) * 100;
  } else {
      monthlyEquivalentRatePercent = -100;
  }
    
  let effectiveInvestmentPeriodYears = inputValues.investmentPeriodYears;
  if (inputValues.enableAdvancedSimulation && inputValues.advancedSimModeRetirement && inputValues.currentAge && inputValues.targetAge) {
    effectiveInvestmentPeriodYears = Math.max(1, (inputValues.targetAge || 0) - (inputValues.currentAge || 0) );
  }

  const renderAverageValue = (data: DynamicHistoricalAverage, label: string) => {
    if (data.isLoading) return <span className="text-xs text-slate-500 dark:text-slate-400">Carregando {label}...</span>;
    if (data.error) return <span className="text-xs text-red-500 dark:text-red-400">Erro ao buscar {label}.</span>;
    if (data.value !== null) {
      return (
        <span title={`Média calculada para o período: ${data.sourceDateRange || 'N/D'}`}>
          {label}: {formatNumberForDisplay(data.value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% a.a.
        </span>
      );
    }
    return <span className="text-xs text-slate-500 dark:text-slate-400">{label}: N/D</span>;
  };

  const rateReferenceContent = (
      <div className="space-y-2 text-xs w-full"> 
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Sugestões de Taxa (Base Histórica):</p>
        <div className="flex justify-between items-center">
          <span className="text-slate-600 dark:text-slate-300">{renderAverageValue(cdiAverageData, 'CDI (últimos 20a)')}</span>
          <Button
            size="sm" variant="ghost"
            onClick={(e) => { e.stopPropagation(); cdiAverageData.value !== null && onFormChange({ rateValue: cdiAverageData.value }); }}
            disabled={isLoading || cdiAverageData.isLoading || cdiAverageData.value === null}
            className="py-0.5 px-1.5 text-xs whitespace-nowrap ml-2"
            title={cdiAverageData.error ? cdiAverageData.error : (cdiAverageData.value !== null ? `Usar média histórica CDI (${formatNumberForDisplay(cdiAverageData.value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% de ${cdiAverageData.sourceDateRange || '20a'})` : "Carregando média CDI")}
          >
            Usar Média CDI
          </Button>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-600 dark:text-slate-300">{renderAverageValue(ipcaAverageData, 'IPCA (últimos 20a)')}</span>
           {inputValues.enableAdvancedSimulation && inputValues.adjustContributionsForInflation ? (
                <Button 
                    size="sm" variant="ghost" 
                    onClick={(e) => { e.stopPropagation(); ipcaAverageData.value !== null && onFormChange({ expectedInflationRate: ipcaAverageData.value }); }} 
                    disabled={isLoading || ipcaAverageData.isLoading || ipcaAverageData.value === null} 
                    className="py-0.5 px-1.5 text-xs whitespace-nowrap ml-2"
                    title={ipcaAverageData.error ? ipcaAverageData.error : (ipcaAverageData.value !== null ? `Usar média histórica IPCA (${formatNumberForDisplay(ipcaAverageData.value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% de ${ipcaAverageData.sourceDateRange || '20a'}) para inflação` : "Carregando média IPCA")}
                >
                  Usar Média IPCA
                </Button>
            ) : (
                 <InfoTooltip text="Ative 'Simular Aposentadoria' e 'Ajustar pela Inflação' para usar este valor como referência de inflação para aportes/renda." position="left">
                    <span className="ml-2 p-1 text-xs text-slate-400 dark:text-slate-500">(i)</span>
                </InfoTooltip>
            )}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 italic pt-1">
          Médias calculadas a partir de dados históricos mensais do Banco Central do Brasil (BCB).
          Rentabilidade passada não é garantia de rentabilidade futura. Use como referência.
        </p>
      </div>
    );


  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-7">
      <FormattedNumericInput
        label="Valor Inicial (R$)"
        id="initialInvestment"
        name="initialInvestment"
        value={inputValues.initialInvestment}
        onChange={handleFormattedChange}
        min={0}
        icon={<span className="text-slate-400 dark:text-slate-500">R$</span>}
        displayOptions={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
        disabled={isLoading}
      />
      
      <Input 
        label="Período (Anos)"
        type="number"
        id="investmentPeriodYears"
        name="investmentPeriodYears"
        value={effectiveInvestmentPeriodYears.toString()}
        onChange={handleDirectChange}
        min="1"
        step="1"
        icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-slate-400 dark:text-slate-500">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-3.75h.008v.008H12v-.008Z" />
        </svg>}
        disabled={isLoading || (inputValues.enableAdvancedSimulation && inputValues.advancedSimModeRetirement)}
        title={ (inputValues.enableAdvancedSimulation && inputValues.advancedSimModeRetirement) ? "Definido pela Idade Atual e Idade Alvo na Simulação de Aposentadoria" : "Período total da simulação em anos."}
      />
      
      <div className="pt-5 border-t border-slate-200 dark:border-slate-700/60 space-y-5">
        <FormattedNumericInput
          label="Aporte Mensal (R$)"
          id="contributionValue"
          name="contributionValue"
          value={inputValues.contributionValue}
          onChange={handleFormattedChange}
          min={0}
          icon={<span className="text-slate-400 dark:text-slate-500">R$</span>}
          displayOptions={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
          disabled={isLoading}
        />
        
        <FormattedNumericInput
          label={
            <span className="flex items-center">
              Taxa Anual de Juros (%)
              <InfoTooltip 
                text={rateReferenceContent} 
                position="bottom" 
                tooltipWidthClass="max-w-sm sm:max-w-md"
                className="relative inline-flex items-center align-middle ml-1.5" // Ensure proper alignment
              />
              {/* Removed explicit icon, InfoTooltip will use its new default */}
            </span>
          }
          id="rateValue"
          name="rateValue"
          value={inputValues.rateValue}
          onChange={handleFormattedChange}
          max={1000} 
          min={-100} 
          icon={<span className="text-slate-400 dark:text-slate-500">%</span>}
          displayOptions={{ minimumFractionDigits: 2, maximumFractionDigits: 4 }}
          disabled={isLoading}
        />
        <p className="text-xs text-slate-500 dark:text-slate-400 -mt-3">
          Taxa Anual: {formatNumberForDisplay(inputValues.rateValue, {minimumFractionDigits:2, maximumFractionDigits:2})}% a.a. 
          (Equivalente a aprox. {monthlyEquivalentRatePercent.toFixed(4)}% a.m. para os cálculos com aportes mensais.)
        </p>

        <div className="pt-5 border-t border-slate-200 dark:border-slate-700/60 space-y-3">
            <div 
              className={`
                flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 ease-in-out
                ${inputValues.enableAdvancedSimulation 
                  ? 'bg-blue-100 dark:bg-blue-800/60 shadow-md hover:bg-blue-200/70 dark:hover:bg-blue-700/70' 
                  : 'bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200/80 dark:hover:bg-slate-600/60 shadow-sm'}
              `}
              onClick={() => {
                const newAdvancedState = !inputValues.enableAdvancedSimulation;
                onFormChange({ 
                  enableAdvancedSimulation: newAdvancedState, 
                  advancedSimModeRetirement: newAdvancedState, 
                  advancedSimModeSpecificContributions: newAdvancedState ? inputValues.advancedSimModeSpecificContributions : false 
                });
              }}
              role="button"
              aria-pressed={inputValues.enableAdvancedSimulation}
              aria-expanded={inputValues.enableAdvancedSimulation}
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); }}}
            >
              <span 
                id="simulateRetirementLabel" 
                className="text-md font-semibold text-blue-700 dark:text-blue-300 select-none"
              >
                Simular Aposentadoria
              </span>
              <ChevronDownIcon 
                className={`w-5 h-5 text-blue-600 dark:text-blue-400 transform transition-transform duration-300 
                ${inputValues.enableAdvancedSimulation ? 'rotate-180' : 'rotate-0'}`} 
              />
            </div>

            {inputValues.enableAdvancedSimulation && ( 
            <Card className="p-4 space-y-5 bg-slate-50 dark:bg-slate-700/40 shadow-inner border border-slate-200 dark:border-slate-600/50">
                <div className="space-y-4 pt-2 pb-2">
                    <Input label={<>Idade Atual <InfoTooltip text="Sua idade atual." /></>} type="number" id="currentAge" name="currentAge" value={inputValues.currentAge?.toString() || ''} onChange={handleDirectChange} min="0" disabled={isLoading} />
                    <Input label={<>Idade Alvo para Aposentadoria <InfoTooltip text="Com que idade você planeja se aposentar." /></>} type="number" id="targetAge" name="targetAge" value={inputValues.targetAge?.toString() || ''} onChange={handleDirectChange} min={(inputValues.currentAge || 0) + 1} disabled={isLoading} />
                    
                    <div className="flex items-center justify-between">
                    <label htmlFor="adjustContributionsForInflation" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Ajustar Aportes e Renda pela Inflação? <InfoTooltip text="Se selecionado, os aportes mensais e a renda desejada na aposentadoria serão corrigidos anualmente pela inflação esperada." />
                    </label>
                    <ToggleSwitch
                        id="adjustContributionsForInflation"
                        checked={inputValues.adjustContributionsForInflation || false}
                        onChange={(checked) => handleToggleChange('adjustContributionsForInflation', checked)}
                        disabled={isLoading}
                    />
                    </div>
                    {inputValues.adjustContributionsForInflation && (
                    <>
                    <FormattedNumericInput
                        label={<>Taxa de Inflação Esperada Anual (%) <InfoTooltip text="Inflação média anual que você espera até a aposentadoria. Usada para corrigir aportes e a renda desejada." /></>}
                        id="expectedInflationRate"
                        name="expectedInflationRate"
                        value={inputValues.expectedInflationRate ?? null}
                        onChange={handleFormattedChange}
                        min={-100} max={100}
                        icon={<span className="text-slate-400 dark:text-slate-500">%</span>}
                        displayOptions={{ minimumFractionDigits: 1, maximumFractionDigits: 2 }}
                        disabled={isLoading}
                    />
                    </>
                    )}
                    <FormattedNumericInput
                    label={<>Renda Mensal Desejada (valores de hoje) <InfoTooltip text="Quanto você gostaria de ter de renda passiva mensal na aposentadoria, em valores atuais. Se o ajuste pela inflação estiver ativo, esse valor será corrigido." /></>}
                    id="desiredMonthlyIncomeToday"
                    name="desiredMonthlyIncomeToday"
                    value={inputValues.desiredMonthlyIncomeToday ?? null}
                    onChange={handleFormattedChange}
                    min={0}
                    icon={<span className="text-slate-400 dark:text-slate-500">R$</span>}
                    displayOptions={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
                    disabled={isLoading}
                    />
                </div>
                
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-200 dark:border-slate-700/60">
                <label htmlFor="advancedSimModeSpecificContributions" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Definir Aportes Específicos <InfoTooltip text="Adicionar aportes únicos em datas específicas da simulação."/>
                </label>
                <ToggleSwitch
                    id="advancedSimModeSpecificContributions"
                    checked={inputValues.advancedSimModeSpecificContributions || false}
                    onChange={(checked) => handleToggleChange('advancedSimModeSpecificContributions', checked)}
                    disabled={isLoading}
                />
                </div>
                
                {inputValues.advancedSimModeSpecificContributions && (
                <div className="pl-4 border-l-2 border-green-500 dark:border-green-400 space-y-3 pt-2 pb-2">
                    {(inputValues.specificContributions || []).map((contrib, index) => (
                    <Card key={contrib.id} className="p-3 bg-white/80 dark:bg-slate-600/60 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
                        <FormattedNumericInput
                            label={`Aporte #${index + 1} (R$)`}
                            id={`sc_amount_${contrib.id}`}
                            name={`sc_amount_${contrib.id}`}
                            value={contrib.amount}
                            onChange={(_, val) => handleSpecificContributionChange(contrib.id, 'amount', val === null ? 0 : val)}
                            min={0}
                            disabled={isLoading}
                            displayOptions={{minimumFractionDigits:2, maximumFractionDigits:2}}
                        />
                        <Input
                            label="Ano"
                            type="number"
                            id={`sc_year_${contrib.id}`}
                            name={`sc_year_${contrib.id}`}
                            value={contrib.year.toString()}
                            onChange={(e) => handleSpecificContributionChange(contrib.id, 'year', e.target.value)}
                            min="1" max={effectiveInvestmentPeriodYears}
                            disabled={isLoading}
                        />
                        <Select
                            label="Mês"
                            id={`sc_month_${contrib.id}`}
                            name={`sc_month_${contrib.id}`}
                            value={contrib.month}
                            options={Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: (i + 1).toString() }))}
                            onChange={(e) => handleSpecificContributionChange(contrib.id, 'month', e.target.value)}
                            disabled={isLoading}
                        />
                        </div>
                        <Input
                            label="Descrição (Opcional)"
                            type="text"
                            id={`sc_desc_${contrib.id}`}
                            name={`sc_desc_${contrib.id}`}
                            value={contrib.description || ''}
                            onChange={(e) => handleSpecificContributionDescriptionChange(contrib.id, e.target.value)}
                            maxLength={50}
                            disabled={isLoading}
                            className="mt-2"
                        />
                        <Button onClick={() => removeSpecificContribution(contrib.id)} variant="danger" size="sm" className="mt-2" disabled={isLoading} leftIcon={<TrashIcon className="w-4 h-4"/>}>
                        Remover Aporte #{index+1}
                        </Button>
                    </Card>
                    ))}
                    <Button onClick={addSpecificContribution} variant="secondary" size="sm" disabled={isLoading}>Adicionar Aporte Específico</Button>
                </div>
                )}
            </Card>
            )}
        </div>
        
      </div>

      <Button
        onClick={onSimulate}
        variant="primary"
        size="lg"
        className="w-full"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Simulando...
          </>
        ) : (
          'Simular Projeção'
        )}
      </Button>
    </form>
  );
};
