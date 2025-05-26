
// utils/economicIndicatorsAPI.ts
import { UsdBrlRateInfo } from '../types'; // Import UsdBrlRateInfo type

export interface FetchedEconomicIndicators {
  selicRate?: number;
  selicReferenceDate?: string; // Expected format: dd/MM/yyyy
  cdiRate?: number;
  cdiReferenceDate?: string; // Expected format: dd/MM/yyyy (for the daily rate)
  ipcaRate?: number;
  ipcaSourceType?: 'projection' | 'accumulated12m';
  ipcaReferenceDate?: string; 
  trRate?: number; // TR is back to being auto-fetched
  trReferenceDate?: string; // Expected format: dd/MM/yyyy
  lastUpdated?: string;
  errors?: string[];
}

/**
 * Fetches key economic indicators from the Central Bank of Brazil (BCB) APIs.
 * TR is now fetched from SGS 226.
 */
export async function fetchEconomicIndicators(): Promise<FetchedEconomicIndicators> {
  const indicators: FetchedEconomicIndicators = {};
  const errors: string[] = [];
  const TOTAL_POSSIBLE_AUTO_FETCHED_INDICATORS = 4; // Selic, CDI, IPCA, TR

  // 1. Selic (SGS 432 - Meta Selic definida pelo Copom - annual %)
  try {
    const selicResponse = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json');
    if (!selicResponse.ok) throw new Error(`BCB API Selic request failed with status ${selicResponse.status}`);
    const selicData = await selicResponse.json();
    if (selicData && selicData.length > 0 && selicData[0].valor !== undefined) {
      const selicValue = parseFloat(selicData[0].valor);
      if (isNaN(selicValue)) {
        throw new Error('Invalid Selic value (NaN)');
      }
      indicators.selicRate = selicValue;
      if (selicData[0].data) {
        indicators.selicReferenceDate = selicData[0].data;
      }
    } else {
      throw new Error('Invalid Selic data format');
    }
  } catch (e: any) {
    errors.push('Selic');
    console.error("Error fetching Selic:", e.message);
  }

  // 2. CDI (SGS 12 - CDI - daily, needs annualization)
  try {
    const cdiResponse = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados/ultimos/1?formato=json');
    if (!cdiResponse.ok) throw new Error(`BCB API CDI request failed with status ${cdiResponse.status}`);
    const cdiData = await cdiResponse.json();
    if (cdiData && cdiData.length > 0 && cdiData[0].valor !== undefined) {
      const dailyCdi = parseFloat(cdiData[0].valor);
      if (isNaN(dailyCdi)) { // Check if parsing resulted in NaN
        throw new Error('Invalid CDI value (NaN) from API');
      }
      // Annualize CDI: (1 + daily_rate/100)^252 - 1
      const annualizedCdi = (Math.pow(1 + dailyCdi / 100, 252) - 1) * 100;
      if (isNaN(annualizedCdi)) { // Check if annualization resulted in NaN
        throw new Error('CDI annualization resulted in NaN');
      }
      indicators.cdiRate = annualizedCdi;
      if (cdiData[0].data) {
        indicators.cdiReferenceDate = cdiData[0].data;
      }
    } else {
      throw new Error('Invalid CDI data format');
    }
  } catch (e: any) {
    errors.push('CDI');
    console.error("Error fetching CDI:", e.message);
  }

  // 3. IPCA
  let ipcaFetchedSuccessfully = false;
  const currentYear = new Date().getFullYear();
  const ipcaProjectionApiUrl = (year: number) => `https://olinda.bcb.gov.br/olinda/servico/Focus/versao/v1/odata/ExpectativaMercadoAnual?$format=json&$top=1&$filter=Indicador%20eq%20'IPCA'%20and%20DataReferencia%20eq%20'${year}'&$select=Mediana,Data`; 
  const ipcaAccumulatedApiUrl = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.13522/dados/ultimos/1?formato=json'; 

  try {
    // Attempt 1: Current Year Projection
    try {
      const ipcaResponseCurrentYear = await fetch(ipcaProjectionApiUrl(currentYear));
      if (!ipcaResponseCurrentYear.ok) {
        throw new Error(`Request for IPCA Projection ${currentYear} failed with status ${ipcaResponseCurrentYear.status}`);
      }
      const ipcaDataCurrentYear = await ipcaResponseCurrentYear.json();
      if (ipcaDataCurrentYear.value && ipcaDataCurrentYear.value.length > 0 && ipcaDataCurrentYear.value[0].Mediana !== undefined) {
        const ipcaValue = parseFloat(ipcaDataCurrentYear.value[0].Mediana);
        if(isNaN(ipcaValue)) throw new Error(`IPCA Projection ${currentYear} value is NaN`);
        indicators.ipcaRate = ipcaValue;
        indicators.ipcaSourceType = 'projection';
        if(ipcaDataCurrentYear.value[0].Data) {
          indicators.ipcaReferenceDate = ipcaDataCurrentYear.value[0].Data; // This is usually the year, e.g., "2024"
        }
        ipcaFetchedSuccessfully = true;
      } else {
        throw new Error(`Data for IPCA Projection ${currentYear} in unexpected format or empty.`);
      }
    } catch (eCurrentYear: any) {
      console.warn(`Fetching IPCA Projection for ${currentYear} failed: ${eCurrentYear.message}. Attempting next year projection.`);

      // Attempt 2: Next Year Projection (Fallback 1)
      const nextYear = currentYear + 1;
      try {
        const ipcaResponseNextYear = await fetch(ipcaProjectionApiUrl(nextYear));
        if (!ipcaResponseNextYear.ok) {
          let errorMessage = `Fallback IPCA Projection request for ${nextYear} failed (status ${ipcaResponseNextYear.status}).`;
          if (ipcaResponseNextYear.status === 404) {
            errorMessage += ` This may be expected if data for this future year is not yet published by the source.`;
          }
          throw new Error(errorMessage);
        }
        const ipcaDataNextYear = await ipcaResponseNextYear.json();
        if (ipcaDataNextYear.value && ipcaDataNextYear.value.length > 0 && ipcaDataNextYear.value[0].Mediana !== undefined) {
          const ipcaValue = parseFloat(ipcaDataNextYear.value[0].Mediana);
          if(isNaN(ipcaValue)) throw new Error(`IPCA Projection ${nextYear} value is NaN`);
          indicators.ipcaRate = ipcaValue;
          indicators.ipcaSourceType = 'projection';
           if(ipcaDataNextYear.value[0].Data) {
            indicators.ipcaReferenceDate = ipcaDataNextYear.value[0].Data; // This is usually the year
          }
          ipcaFetchedSuccessfully = true;
        } else {
          throw new Error(`Fallback IPCA Projection data for ${nextYear} in unexpected format or empty.`);
        }
      } catch(eNextYear: any) {
        console.warn(`Fetching IPCA Projection for ${nextYear} failed: ${eNextYear.message}. Attempting accumulated IPCA (12m).`);
        // Attempt 3: Accumulated IPCA 12 months (Fallback 2)
        const ipcaResponseAccumulated = await fetch(ipcaAccumulatedApiUrl);
        if (!ipcaResponseAccumulated.ok) {
            throw new Error(`Fallback request for Accumulated IPCA (12m) failed with status ${ipcaResponseAccumulated.status}`);
        }
        const ipcaDataAccumulated = await ipcaResponseAccumulated.json();
        if (ipcaDataAccumulated && ipcaDataAccumulated.length > 0 && ipcaDataAccumulated[0].valor !== undefined) {
            const ipcaValue = parseFloat(ipcaDataAccumulated[0].valor);
            if(isNaN(ipcaValue)) throw new Error(`Accumulated IPCA (12m) value is NaN`);
            indicators.ipcaRate = ipcaValue;
            indicators.ipcaSourceType = 'accumulated12m';
            if (ipcaDataAccumulated[0].data) { // Format "dd/MM/yyyy"
              const dateParts = ipcaDataAccumulated[0].data.split('/');
              if (dateParts.length === 3) {
                indicators.ipcaReferenceDate = `${dateParts[1]}/${dateParts[2]}`; // Store as MM/YYYY
              }
            }
            ipcaFetchedSuccessfully = true;
        } else {
            throw new Error('Data for Accumulated IPCA (12m) in unexpected format or empty.');
        }
      }
    }
  } catch (eFinal: any) {
    if (!ipcaFetchedSuccessfully) {
      errors.push('IPCA');
      console.error(`All attempts to fetch IPCA failed. Last error: ${eFinal.message}`);
    }
  }

  // 4. TR (SGS 226 - Taxa Referencial - % p.m., daily)
  try {
    const trResponse = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.226/dados/ultimos/1?formato=json');
    if (!trResponse.ok) throw new Error(`BCB API TR (SGS 226) request failed with status ${trResponse.status}`);
    const trData = await trResponse.json();
    if (trData && trData.length > 0 && trData[0].valor !== undefined) {
      const trValue = parseFloat(trData[0].valor);
       if (isNaN(trValue)) {
        throw new Error('Invalid TR value (NaN) from API SGS 226');
      }
      indicators.trRate = trValue; // This value is already in % p.m.
      if (trData[0].data) {
        indicators.trReferenceDate = trData[0].data; // Format dd/MM/yyyy
      }
    } else {
      throw new Error('Invalid TR (SGS 226) data format');
    }
  } catch (e: any) {
    errors.push('TR');
    console.error("Error fetching TR (SGS 226):", e.message);
  }


  // Set lastUpdated if any indicator was successfully fetched
  if (Object.keys(indicators).some(key => !['errors', 'lastUpdated', 'ipcaSourceType', 'ipcaReferenceDate', 'selicReferenceDate', 'cdiReferenceDate', 'trReferenceDate'].includes(key) && indicators[key as keyof FetchedEconomicIndicators] !== undefined)) {
    indicators.lastUpdated = new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  
  if (errors.length > 0) {
    indicators.errors = errors;
    if (errors.length === TOTAL_POSSIBLE_AUTO_FETCHED_INDICATORS) {
      // This state will be handled in the component to show a general error message
    }
  }

  return indicators;
}


/**
 * Fetches the latest USD/BRL exchange rate from BCB PTAX API.
 * It tries to get data for the current day, then goes back up to 7 days if needed.
 */
export async function fetchLatestUsdBrlRate(): Promise<UsdBrlRateInfo | null> {
  const formatDateForApi = (date: Date): string => {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${month}-${day}-${year}`;
  };

  for (let i = 0; i < 7; i++) { // Try for the last 7 days
    const dateToTry = new Date();
    dateToTry.setDate(dateToTry.getDate() - i);
    const formattedDate = formatDateForApi(dateToTry);
    
    const apiUrl = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarDia(dataCotacao=@dataCotacao)?@dataCotacao='${formattedDate}'&$top=1&$orderby=dataHoraCotacao%20desc&$format=json&$select=cotacaoVenda,dataHoraCotacao`;

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        // If 404, it might just be a non-business day, so continue loop
        if (response.status === 404 && i < 6) continue; 
        throw new Error(`BCB PTAX API request failed with status ${response.status} for date ${formattedDate}`);
      }
      const data = await response.json();
      if (data.value && data.value.length > 0) {
        const rateInfo = data.value[0];
        if (rateInfo.cotacaoVenda !== undefined && rateInfo.dataHoraCotacao !== undefined) {
          const rate = parseFloat(rateInfo.cotacaoVenda);
          if (isNaN(rate)) {
            throw new Error(`Invalid USD/BRL rate value (NaN) for date ${formattedDate}`);
          }
          return {
            rate: rate,
            dateTime: rateInfo.dataHoraCotacao, // This is a string like "YYYY-MM-DD HH:mm:ss.SSS"
          };
        }
      }
      if (i < 6 && (!data.value || data.value.length === 0)) continue; // No data for this day, try previous
    } catch (e: any) {
      console.error(`Error fetching USD/BRL rate for ${formattedDate}:`, e.message);
      if (i === 6) { // If it's the last attempt and it failed
        return null;
      }
    }
  }
  return null; // Could not fetch rate after several attempts
}