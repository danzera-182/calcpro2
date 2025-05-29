import React from 'react';
import { DateRangePreset, AvailableIndicatorForTerminal } from '../types';
import Button from './ui/Button';
import Select from './ui/Select';
import Input from './ui/Input';
import ToggleSwitch from './ui/ToggleSwitch';
import InfoTooltip from './ui/InfoTooltip';

interface TerminalChartControlsProps {
  availableIndicators: AvailableIndicatorForTerminal[];
  selectedIndicators: AvailableIndicatorForTerminal[];
  onSelectedIndicatorsChange: (selected: AvailableIndicatorForTerminal[]) => void;
  maxSelectedIndicators?: number;

  dateRangePreset: DateRangePreset;
  onDateRangePresetChange: (preset: DateRangePreset) => void;
  customStartDate: string;
  onCustomStartDateChange: (date: string) => void;
  customEndDate: string;
  onCustomEndDateChange: (date: string) => void;

  normalizeData: boolean;
  onNormalizeDataChange: (normalize: boolean) => void;
  
  onGenerateChart: () => void;
  isLoading: boolean;
}

const TerminalChartControls: React.FC<TerminalChartControlsProps> = ({
  availableIndicators,
  selectedIndicators,
  onSelectedIndicatorsChange,
  maxSelectedIndicators = 4,
  dateRangePreset,
  onDateRangePresetChange,
  customStartDate,
  onCustomStartDateChange,
  customEndDate,
  onCustomEndDateChange,
  normalizeData,
  onNormalizeDataChange,
  onGenerateChart,
  isLoading,
}) => {

  const handleIndicatorToggle = (indicator: AvailableIndicatorForTerminal) => {
    const currentIndex = selectedIndicators.findIndex(i => i.id === indicator.id);
    let newSelected: AvailableIndicatorForTerminal[];

    if (currentIndex === -1) { // Add indicator
      if (selectedIndicators.length < maxSelectedIndicators) {
        newSelected = [...selectedIndicators, indicator];
      } else {
        // Optionally, provide feedback that max indicators reached
        alert(`Você pode selecionar no máximo ${maxSelectedIndicators} indicadores.`);
        return; // Do not update if max is reached
      }
    } else { // Remove indicator
      newSelected = selectedIndicators.filter(i => i.id !== indicator.id);
    }
    onSelectedIndicatorsChange(newSelected);
  };

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPreset = e.target.value as DateRangePreset;
    onDateRangePresetChange(newPreset);
    if (newPreset) { // if a preset is selected, clear focus from custom dates
        // This logic will be handled by useEffect in parent to set custom dates
    }
  };
  
  const handleCustomDateChange = (value: string, setter: (date: string) => void) => {
    setter(value);
    if (dateRangePreset !== '') { // If user types in custom date, clear preset
        onDateRangePresetChange('');
    }
  };


  return (
    <div className="space-y-6">
      {/* Indicator Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Selecione os Indicadores (Máx. {maxSelectedIndicators})
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 border rounded-md dark:border-gray-600">
          {availableIndicators.map((indicator) => (
            <label key={indicator.id} className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer transition-colors
              ${selectedIndicators.find(i => i.id === indicator.id) ? 'bg-blue-100 dark:bg-blue-700/50 ring-2 ring-blue-500' : 'bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600'}`}>
              <input
                type="checkbox"
                className="form-checkbox h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                checked={!!selectedIndicators.find(i => i.id === indicator.id)}
                onChange={() => handleIndicatorToggle(indicator)}
                disabled={isLoading || (selectedIndicators.length >= maxSelectedIndicators && !selectedIndicators.find(i => i.id === indicator.id))}
              />
              <span className="text-xs text-gray-700 dark:text-gray-200">{indicator.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Date Range Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
        <Select
          label="Período Predefinido"
          options={[
            { value: '', label: 'Customizado' },
            { value: '1M', label: 'Último Mês' },
            { value: '6M', label: 'Últimos 6 Meses' },
            { value: '1Y', label: 'Último Ano' },
            { value: '5Y', label: 'Últimos 5 Anos' },
            { value: 'MAX', label: 'Máximo (20 Anos)' },
          ]}
          value={dateRangePreset}
          onChange={handlePresetChange}
          disabled={isLoading}
        />
        <Input
          type="date"
          label="Data de Início"
          value={customStartDate}
          onChange={(e) => handleCustomDateChange(e.target.value, onCustomStartDateChange)}
          disabled={isLoading}
          max={customEndDate || undefined}
        />
        <Input
          type="date"
          label="Data de Fim"
          value={customEndDate}
          onChange={(e) => handleCustomDateChange(e.target.value, onCustomEndDateChange)}
          disabled={isLoading}
          min={customStartDate || undefined}
          max={new Date().toISOString().split('T')[0]} // Today max
        />
      </div>
      
      {/* Normalization Toggle */}
       <div className="flex items-center justify-start space-x-3 pt-2">
          <ToggleSwitch
            id="normalizeDataToggle"
            checked={normalizeData}
            onChange={onNormalizeDataChange}
            disabled={isLoading}
          />
          <label htmlFor="normalizeDataToggle" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Normalizar Dados (Rebasear início em 100)
          </label>
          <InfoTooltip text="Normaliza os valores dos indicadores para que todos comecem em 100 na data inicial. Facilita a comparação de tendências percentuais de indicadores com escalas diferentes." />
        </div>

      {/* Generate Chart Button */}
      <Button
        onClick={onGenerateChart}
        variant="primary"
        size="lg"
        className="w-full"
        disabled={isLoading || selectedIndicators.length === 0}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Gerando...
          </>
        ) : (
          'Gerar Gráfico Comparativo'
        )}
      </Button>
    </div>
  );
};

export default TerminalChartControls;
