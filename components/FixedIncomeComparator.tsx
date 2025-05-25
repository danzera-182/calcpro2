
import React, { useState, useCallback } from 'react';
import { FixedIncomeInvestmentType, TermUnit, FixedIncomeResult } from '../types';
import { DEFAULT_CDI_RATE } from '../constants';
import { getIrRate, convertCdiPercentageToGrossRate, calculateNetAnnualYield, yearsToDays } from '../utils/fixedIncomeCalculations';
import Input from './ui/Input'; // For termValue
import Button from './ui/Button';
import Select from './ui/Select';
import { Card } from './ui/Card';
import FormattedNumericInput from './ui/FormattedNumericInput';
import { formatNumberForDisplay } from '../utils/formatters';


const FixedIncomeComparator: React.FC = () => {
  const [investmentType, setInvestmentType] = useState<FixedIncomeInvestmentType>('pre');
  const [termValue, setTermValue] = useState<number>(2); // This can remain simple number input
  const [termUnit, setTermUnit] = useState<TermUnit>('years');
  
  // States for formatted inputs
  const [grossAnnualRatePre, setGrossAnnualRatePre] = useState<number | null>(12);
  const [cdiPercentagePost, setCdiPercentagePost] = useState<number | null>(100);
  const [currentCdiRatePost, setCurrentCdiRatePost] = useState<number | null>(DEFAULT_CDI_RATE);

  const [result, setResult] = useState<FixedIncomeResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false); // Added isLoading state

  const handleFormattedChange = (name: string, value: number | null) => {
    if (name === 'grossAnnualRatePre') setGrossAnnualRatePre(value);
    if (name === 'cdiPercentagePost') setCdiPercentagePost(value);
    if (name === 'currentCdiRatePost') setCurrentCdiRatePost(value);
    setResult(null); // Clear results on change
  };
  
  const handleTermValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTermValue(parseFloat(e.target.value) || 0);
    setResult(null);
  };


  const handleCalculate = useCallback(() => {
    setIsLoading(true);
    setResult(null);

    setTimeout(() => {
      const termDays = termUnit === 'years' ? yearsToDays(termValue) : termValue;
      if (termDays <= 0) {
          alert("O prazo do investimento deve ser positivo.");
          setIsLoading(false);
          return;
      }

      let grossRateForCalculation: number;
      let originalInputs: FixedIncomeResult['originalInputs'];
      let equivalentCdiPercentageNet: number | undefined = undefined;

      const ratePre = grossAnnualRatePre === null ? 0 : grossAnnualRatePre;
      const cdiPercent = cdiPercentagePost === null ? 0 : cdiPercentagePost;
      const cdiRate = currentCdiRatePost === null ? 0 : currentCdiRatePost;

      if (investmentType === 'pre') {
        if (ratePre < -100) { 
          alert("A taxa bruta anual pré-fixada não pode ser menor que -100%.");
          setIsLoading(false);
          return;
        }
        grossRateForCalculation = ratePre;
        originalInputs = { grossAnnualRatePre: ratePre };
      } else { // post-fixed
        if (cdiPercent < 0 || cdiRate <= 0) { 
          alert("Valores para % do CDI devem ser não negativos e CDI Atual deve ser maior que zero.");
          setIsLoading(false);
          return;
        }
        grossRateForCalculation = convertCdiPercentageToGrossRate(cdiPercent, cdiRate);
        originalInputs = { cdiPercentagePost: cdiPercent, currentCdiRatePost: cdiRate };
      }

      const irRateDecimal = getIrRate(termDays);
      const netYield = calculateNetAnnualYield(grossRateForCalculation, termDays);

      if (investmentType === 'post' && cdiRate > 0 && netYield !== undefined && !isNaN(netYield)) {
          equivalentCdiPercentageNet = (netYield / cdiRate) * 100;
      }

      setResult({
        netYield,
        irRateApplied: irRateDecimal * 100,
        grossRateUsed: grossRateForCalculation,
        termDays,
        investmentType,
        originalInputs,
        equivalentCdiPercentageNet
      });
      setIsLoading(false);
    }, 1000); // 1 second delay

  }, [investmentType, termValue, termUnit, grossAnnualRatePre, cdiPercentagePost, currentCdiRatePost]);

  const getExplanatoryText = () => {
    if (!result) return "";
    const { netYield, irRateApplied, grossRateUsed, termDays, investmentType, originalInputs, equivalentCdiPercentageNet } = result;

    const termText = termUnit === 'years' ? `${termValue} ano(s)` : `${termDays} dia(s)`;

    if (investmentType === 'pre') {
      return `Um investimento pré-fixado de ${formatNumberForDisplay(originalInputs.grossAnnualRatePre, {minimumFractionDigits: 2, maximumFractionDigits: 2})}% a.a. (bruto) com prazo de ${termText} (IR de ${irRateApplied.toFixed(1)}%) tem uma rentabilidade líquida de ${netYield.toFixed(2)}% a.a.`;
    } else {
      let postFixedText = `Um investimento pós-fixado de ${formatNumberForDisplay(originalInputs.cdiPercentagePost, {minimumFractionDigits: 2, maximumFractionDigits: 2})}% do CDI (bruto), com CDI atual de ${formatNumberForDisplay(originalInputs.currentCdiRatePost, {minimumFractionDigits: 2, maximumFractionDigits: 2})}% a.a. (resultando em ${grossRateUsed.toFixed(2)}% a.a. bruto) e prazo de ${termText} (IR de ${irRateApplied.toFixed(1)}%), gera uma rentabilidade líquida de ${netYield.toFixed(2)}% a.a.`;
      if (equivalentCdiPercentageNet !== undefined) {
        postFixedText += `, o que equivale a ${equivalentCdiPercentageNet.toFixed(2)}% do CDI líquido de IR.`;
      }
      return postFixedText;
    }
  };
  
  const commonInputProps = {
    disabled: isLoading
  };
  const commonSelectProps = {
    disabled: isLoading
  };


  return (
    <Card>
      <Card.Header>
        <Card.Title>Comparador de Renda Fixa (Isento vs. Tributado)</Card.Title>
      </Card.Header>
      <Card.Content className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-blue-400 mb-1">Tipo de Rentabilidade</label>
          <div className="flex space-x-2">
            <Button variant={investmentType === 'pre' ? 'primary' : 'secondary'} onClick={() => { setResult(null); setInvestmentType('pre');}} disabled={isLoading}>Pré-fixado</Button>
            <Button variant={investmentType === 'post' ? 'primary' : 'secondary'} onClick={() => { setResult(null); setInvestmentType('post');}} disabled={isLoading}>Pós-fixado (% CDI)</Button>
          </div>
        </div>

        {investmentType === 'pre' && (
          <FormattedNumericInput
            label="Taxa Bruta Anual Pré-fixada (%)"
            id="grossAnnualRatePre"
            name="grossAnnualRatePre"
            value={grossAnnualRatePre}
            onChange={handleFormattedChange}
            min={-100}
            icon={<span className="text-gray-400 dark:text-gray-500">%</span>}
            displayOptions={{ minimumFractionDigits: 2, maximumFractionDigits: 4 }}
            {...commonInputProps}
          />
        )}

        {investmentType === 'post' && (
          <div className="space-y-4">
            <FormattedNumericInput
              label="% do CDI (Ex: 100 para 100% do CDI)"
              id="cdiPercentagePost"
              name="cdiPercentagePost"
              value={cdiPercentagePost}
              onChange={handleFormattedChange}
              min={0}
              icon={<span className="text-gray-400 dark:text-gray-500">%</span>}
              displayOptions={{ minimumFractionDigits: 0, maximumFractionDigits: 2 }}
              {...commonInputProps}
            />
            <FormattedNumericInput
              label="Valor Atual do CDI (% a.a.)"
              id="currentCdiRatePost"
              name="currentCdiRatePost"
              value={currentCdiRatePost}
              onChange={handleFormattedChange}
              min={0.01}
              icon={<span className="text-gray-400 dark:text-gray-500">%</span>}
              displayOptions={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
              {...commonInputProps}
            />
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4 items-end">
            <Input
                label="Prazo do Investimento"
                type="number" // Term value is integer-like, no complex formatting
                value={termValue.toString()}
                onChange={handleTermValueChange}
                min="1" 
                {...commonInputProps}
             />
            <Select
                label="Unidade do Prazo"
                options={[
                    { value: 'years', label: 'Anos' },
                    { value: 'days', label: 'Dias' },
                ]}
                value={termUnit}
                onChange={(e) => {setTermUnit(e.target.value as TermUnit); setResult(null);}}
                {...commonSelectProps}
            />
        </div>

        <Button onClick={handleCalculate} variant="primary" size="lg" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Calculando...
            </>
          ) : (
            'Calcular Equivalência Líquida'
          )}
        </Button>

        {isLoading && (
          <div className="mt-6 p-5 sm:p-6 bg-gray-100 dark:bg-slate-900/70 rounded-xl shadow-inner flex justify-center items-center">
            <div className="flex flex-col items-center">
              <svg className="animate-spin h-8 w-8 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-500 dark:text-gray-400 mt-2">Analisando taxas...</p>
            </div>
          </div>
        )}

        {!isLoading && result && (
          <div className="mt-6 p-5 sm:p-6 bg-gray-100 dark:bg-slate-900/70 rounded-xl shadow-inner space-y-4 sm:space-y-5">
            <h3 className="text-xl sm:text-2xl font-semibold text-center text-gray-900 dark:text-blue-300 mb-3 sm:mb-4">
              Resultado da Comparação
            </h3>
            
            <div className="text-center mb-3 sm:mb-4">
              <span className="block text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">
                {formatNumberForDisplay(result.netYield, {minimumFractionDigits: 2, maximumFractionDigits: 2})}% a.a.
              </span>
              <span className="block text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                Taxa Anual Líquida Equivalente (para comparar com isentos)
              </span>
            </div>

            {result.investmentType === 'post' && result.equivalentCdiPercentageNet !== undefined && (
              <div className="text-center mb-4 sm:mb-5">
                <span className="block text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatNumberForDisplay(result.equivalentCdiPercentageNet, {minimumFractionDigits: 2, maximumFractionDigits: 2})}% do CDI
                </span>
                <span className="block text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                  Percentual do CDI Líquido Equivalente
                </span>
              </div>
            )}
            
            <hr className="my-3 sm:my-4 border-gray-300 dark:border-slate-700/80" />

            <div className="space-y-1.5 sm:space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-blue-400">Alíquota de IR Aplicada:</span>
                <span className="font-medium text-gray-900 dark:text-white">{result.irRateApplied.toFixed(1)}%</span>
              </div>
              
              {result.investmentType === 'pre' && result.originalInputs.grossAnnualRatePre !== undefined && (
                <div className="flex justify-between items-center">
                    <span className="text-gray-700 dark:text-blue-400">Taxa Bruta Informada:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatNumberForDisplay(result.originalInputs.grossAnnualRatePre, {minimumFractionDigits: 2, maximumFractionDigits: 2})}% a.a.</span>
                </div>
              )}

              {result.investmentType === 'post' && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 dark:text-blue-400">Taxa Bruta (Calculada do CDI):</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatNumberForDisplay(result.grossRateUsed, {minimumFractionDigits: 2, maximumFractionDigits: 2})}% a.a.</span>
                  </div>
                   <div className="flex justify-between items-center">
                    <span className="text-gray-700 dark:text-blue-400">Seu % do CDI (Bruto):</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatNumberForDisplay(result.originalInputs.cdiPercentagePost, {minimumFractionDigits: 2, maximumFractionDigits: 2})}%</span>
                  </div>
                   <div className="flex justify-between items-center">
                    <span className="text-gray-700 dark:text-blue-400">CDI Atual Informado:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatNumberForDisplay(result.originalInputs.currentCdiRatePost, {minimumFractionDigits: 2, maximumFractionDigits: 2})}% a.a.</span>
                  </div>
                </>
              )}
              <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-blue-400">Prazo Considerado:</span>
                <span className="font-medium text-gray-900 dark:text-white">{termUnit === 'years' ? `${termValue} ano(s)` : `${result.termDays} dia(s)`}</span>
              </div>
            </div>
           
            <hr className="mt-3 mb-2 sm:mt-4 sm:mb-3 border-gray-300 dark:border-slate-700/80" />
            <p className="text-xs italic text-gray-600 dark:text-gray-400 text-center">{getExplanatoryText()}</p>
            
            <p className="mt-4 text-xs text-gray-500 dark:text-gray-500 text-center border-t border-gray-300 dark:border-slate-700/80 pt-3">
              <strong>Atenção:</strong> O cálculo da taxa líquida é uma estimativa simplificada (Taxa Líquida = Taxa Bruta Anual × (1 - Alíquota IR)) 
              e pode não refletir com exatidão o efeito de capitalização para prazos não anuais como em calculadoras financeiras detalhadas.
            </p>
          </div>
        )}
      </Card.Content>
    </Card>
  );
};

export default FixedIncomeComparator;
