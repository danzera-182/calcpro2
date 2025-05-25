
import React, { useState, useCallback } from 'react';
import { FixedIncomeInvestmentType, TermUnit, FixedIncomeResult } from '../types';
import { DEFAULT_CDI_RATE } from '../constants';
import { getIrRate, convertCdiPercentageToGrossRate, calculateNetAnnualYield, yearsToDays } from '../utils/fixedIncomeCalculations';
import Input from './ui/Input';
import Button from './ui/Button';
import Select from './ui/Select';
import { Card } from './ui/Card';

const FixedIncomeComparator: React.FC = () => {
  const [investmentType, setInvestmentType] = useState<FixedIncomeInvestmentType>('pre');
  const [termValue, setTermValue] = useState<number>(2);
  const [termUnit, setTermUnit] = useState<TermUnit>('years');
  
  const [grossAnnualRatePre, setGrossAnnualRatePre] = useState<number>(12);
  
  const [cdiPercentagePost, setCdiPercentagePost] = useState<number>(100);
  const [currentCdiRatePost, setCurrentCdiRatePost] = useState<number>(DEFAULT_CDI_RATE);

  const [result, setResult] = useState<FixedIncomeResult | null>(null);

  const handleCalculate = useCallback(() => {
    const termDays = termUnit === 'years' ? yearsToDays(termValue) : termValue;
    if (termDays <= 0) {
        alert("O prazo do investimento deve ser positivo.");
        setResult(null);
        return;
    }

    let grossRateForCalculation: number;
    let originalInputs: FixedIncomeResult['originalInputs'];
    let equivalentCdiPercentageNet: number | undefined = undefined;

    if (investmentType === 'pre') {
      // Allow 0% rate for pre-fixed
      if (grossAnnualRatePre < -100) { // Allow negative rates, but -100% is total loss
        alert("A taxa bruta anual pré-fixada não pode ser menor que -100%.");
        setResult(null);
        return;
      }
      grossRateForCalculation = grossAnnualRatePre;
      originalInputs = { grossAnnualRatePre };
    } else { // post-fixed
      if (cdiPercentagePost < 0 || currentCdiRatePost <= 0) { 
        alert("Valores para % do CDI devem ser positivos e CDI Atual deve ser maior que zero.");
        setResult(null);
        return;
      }
      grossRateForCalculation = convertCdiPercentageToGrossRate(cdiPercentagePost, currentCdiRatePost);
      originalInputs = { cdiPercentagePost, currentCdiRatePost };
    }

    const irRateDecimal = getIrRate(termDays);
    const netYield = calculateNetAnnualYield(grossRateForCalculation, termDays);

    if (investmentType === 'post' && currentCdiRatePost > 0 && netYield !== undefined && !isNaN(netYield)) {
        equivalentCdiPercentageNet = (netYield / currentCdiRatePost) * 100;
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
  }, [investmentType, termValue, termUnit, grossAnnualRatePre, cdiPercentagePost, currentCdiRatePost]);

  const getExplanatoryText = () => {
    if (!result) return "";
    const { netYield, irRateApplied, grossRateUsed, termDays, investmentType, originalInputs, equivalentCdiPercentageNet } = result;

    const termText = termUnit === 'years' ? `${termValue} ano(s)` : `${termDays} dia(s)`;

    if (investmentType === 'pre') {
      return `Um investimento pré-fixado de ${originalInputs.grossAnnualRatePre?.toFixed(2)}% a.a. (bruto) com prazo de ${termText} (IR de ${irRateApplied.toFixed(1)}%) tem uma rentabilidade líquida de ${netYield.toFixed(2)}% a.a.`;
    } else {
      let postFixedText = `Um investimento pós-fixado de ${originalInputs.cdiPercentagePost?.toFixed(2)}% do CDI (bruto), com CDI atual de ${originalInputs.currentCdiRatePost?.toFixed(2)}% a.a. (resultando em ${grossRateUsed.toFixed(2)}% a.a. bruto) e prazo de ${termText} (IR de ${irRateApplied.toFixed(1)}%), gera uma rentabilidade líquida de ${netYield.toFixed(2)}% a.a.`;
      if (equivalentCdiPercentageNet !== undefined) {
        postFixedText += `, o que equivale a ${equivalentCdiPercentageNet.toFixed(2)}% do CDI líquido de IR.`;
      }
      return postFixedText;
    }
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
            <Button variant={investmentType === 'pre' ? 'primary' : 'secondary'} onClick={() => { setResult(null); setInvestmentType('pre');}}>Pré-fixado</Button>
            <Button variant={investmentType === 'post' ? 'primary' : 'secondary'} onClick={() => { setResult(null); setInvestmentType('post');}}>Pós-fixado (% CDI)</Button>
          </div>
        </div>

        {investmentType === 'pre' && (
          <Input
            label="Taxa Bruta Anual Pré-fixada (%)"
            type="number"
            value={grossAnnualRatePre.toString()}
            onChange={(e) => setGrossAnnualRatePre(parseFloat(e.target.value) || 0)}
            step="0.1"
            icon={<span className="text-gray-400 dark:text-gray-500">%</span>}
          />
        )}

        {investmentType === 'post' && (
          <div className="space-y-4">
            <Input
              label="% do CDI (Ex: 100 para 100% do CDI)"
              type="number"
              value={cdiPercentagePost.toString()}
              onChange={(e) => setCdiPercentagePost(parseFloat(e.target.value) || 0)}
              min="0"
              step="1"
              icon={<span className="text-gray-400 dark:text-gray-500">%</span>}
            />
            <Input
              label="Valor Atual do CDI (% a.a.)"
              type="number"
              value={currentCdiRatePost.toString()}
              onChange={(e) => setCurrentCdiRatePost(parseFloat(e.target.value) || 0)}
              min="0.01" 
              step="0.01"
              icon={<span className="text-gray-400 dark:text-gray-500">%</span>}
            />
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4 items-end">
            <Input
                label="Prazo do Investimento"
                type="number"
                value={termValue.toString()}
                onChange={(e) => setTermValue(parseFloat(e.target.value) || 0)}
                min="1" 
             />
            <Select
                label="Unidade do Prazo"
                options={[
                    { value: 'years', label: 'Anos' },
                    { value: 'days', label: 'Dias' },
                ]}
                value={termUnit}
                onChange={(e) => setTermUnit(e.target.value as TermUnit)}
            />
        </div>

        <Button onClick={handleCalculate} variant="primary" size="lg" className="w-full">
          Calcular Equivalência Líquida
        </Button>

        {result && (
          <div className="mt-6 p-5 sm:p-6 bg-gray-100 dark:bg-slate-900/70 rounded-xl shadow-inner space-y-4 sm:space-y-5">
            <h3 className="text-xl sm:text-2xl font-semibold text-center text-gray-900 dark:text-blue-300 mb-3 sm:mb-4">
              Resultado da Comparação
            </h3>
            
            <div className="text-center mb-3 sm:mb-4">
              <span className="block text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">
                {result.netYield.toFixed(2)}% a.a.
              </span>
              <span className="block text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                Taxa Anual Líquida Equivalente (para comparar com isentos)
              </span>
            </div>

            {result.investmentType === 'post' && result.equivalentCdiPercentageNet !== undefined && (
              <div className="text-center mb-4 sm:mb-5">
                <span className="block text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {result.equivalentCdiPercentageNet.toFixed(2)}% do CDI
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
                    <span className="font-medium text-gray-900 dark:text-white">{result.originalInputs.grossAnnualRatePre.toFixed(2)}% a.a.</span>
                </div>
              )}

              {result.investmentType === 'post' && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 dark:text-blue-400">Taxa Bruta (Calculada do CDI):</span>
                    <span className="font-medium text-gray-900 dark:text-white">{result.grossRateUsed.toFixed(2)}% a.a.</span>
                  </div>
                   <div className="flex justify-between items-center">
                    <span className="text-gray-700 dark:text-blue-400">Seu % do CDI (Bruto):</span>
                    <span className="font-medium text-gray-900 dark:text-white">{result.originalInputs.cdiPercentagePost?.toFixed(2)}%</span>
                  </div>
                   <div className="flex justify-between items-center">
                    <span className="text-gray-700 dark:text-blue-400">CDI Atual Informado:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{result.originalInputs.currentCdiRatePost?.toFixed(2)}% a.a.</span>
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