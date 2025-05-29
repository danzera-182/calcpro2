// utils/economicIndicatorsAPI.ts
import { HistoricalDataPoint, DynamicHistoricalAverage, BtcPriceInfo, UsdBrlRateInfo } from '../types'; 

export interface FetchedEconomicIndicators {
  selicRate?: number;
  selicReferenceDate?: string; // Expected format: dd/MM/yyyy
  cdiRate?: number;
  cdiReferenceDate?: string; // Expected format: dd/MM/yyyy (for the daily rate)
  ipcaRate?: number;
  ipcaSourceType?: 'projection' | 'accumulated12m';
  ipcaReferenceDate?: string;
  trRate?: number;
  trReferenceDate?: string; // Expected format: dd/MM/yyyy
  igpmRate?: number; 
  igpmReferenceDate?: string; // Expected format: MM/YYYY for accumulated
  
  netPublicDebtToGdpSGS4513?: number; // SGS 4513 (Dívida Líquida do Setor Público - % PIB)
  netPublicDebtToGdpSGS4513ReferenceDate?: string; // MM/YYYY
  
  ibcBrRate?: number; // IBC-Br - Variação % acumulada em 12 meses
  ibcBrReferenceDate?: string; // MM/YYYY
  internationalReserves?: number; // Reservas Internacionais - US$ milhões
  internationalReservesReferenceDate?: string; // dd/MM/YYYY
  
  goldReservesSGS3552MillionsUSD?: number; // SGS 3552 (Reservas internacionais - Ouro - US$ milhões)
  goldReservesSGS3552MillionsUSDReferenceDate?: string; // MM/YYYY
  
  gdpProjection?: number; // PIB - Projeção de variação % anual
  gdpProjectionSourceType?: 'projection_focus'; // Only Focus projection now
  gdpProjectionReferenceDate?: string; // YYYY (from Focus)

  grossGeneralGovernmentDebtToGdp?: number; // SGS 13762
  grossGeneralGovernmentDebtToGdpReferenceDate?: string; // MM/YYYY

  m2BalanceSGS27842?: number; // M2 Balance (Milhares de R$) - SGS 27842
  m2BalanceSGS27842ReferenceDate?: string; // MM/YYYY
  
  lastUpdated?: string;
  errors?: string[];
}

/**
 * Fetches key economic indicators from the Central Bank of Brazil (BCB) APIs.
 */
export async function fetchEconomicIndicators(): Promise<FetchedEconomicIndicators> {
  const indicators: FetchedEconomicIndicators = {};
  const errors: string[] = [];
  const currentSystemYear = new Date().getFullYear(); // Use for API calls that need a year reference

  const formatSgsDateToMonthYear = (sgsDate: string): string | undefined => {
    if (sgsDate) {
      const parts = sgsDate.split('/');
      if (parts.length === 3) {
        return `${parts[1]}/${parts[2]}`; // Returns MM/YYYY
      }
    }
    return undefined;
  };

  // 1. Selic (SGS 432 - Meta Selic definida pelo Copom - annual %)
  try {
    const selicResponse = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json');
    if (!selicResponse.ok) throw new Error(`BCB API Selic request failed with status ${selicResponse.status}`);
    const selicData = await selicResponse.json();
    if (selicData && selicData.length > 0 && selicData[0].valor !== undefined) {
      const selicValue = parseFloat(selicData[0].valor);
      if (isNaN(selicValue)) throw new Error('Invalid Selic value (NaN)');
      indicators.selicRate = selicValue;
      indicators.selicReferenceDate = selicData[0].data;
    } else {
      throw new Error('Invalid Selic data format');
    }
  } catch (e: any) {
    errors.push('Taxa Selic (Meta)');
    console.error("Error fetching Selic:", e.message, e);
  }

  // 2. CDI (SGS 12 - CDI - daily, needs annualization)
  try {
    const cdiResponse = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados/ultimos/1?formato=json');
    if (!cdiResponse.ok) throw new Error(`BCB API CDI request failed with status ${cdiResponse.status}`);
    const cdiData = await cdiResponse.json();
    if (cdiData && cdiData.length > 0 && cdiData[0].valor !== undefined) {
      const dailyCdi = parseFloat(cdiData[0].valor);
      if (isNaN(dailyCdi)) throw new Error('Invalid CDI value (NaN) from API');
      const annualizedCdi = (Math.pow(1 + dailyCdi / 100, 252) - 1) * 100;
      if (isNaN(annualizedCdi)) throw new Error('CDI annualization resulted in NaN');
      indicators.cdiRate = annualizedCdi;
      indicators.cdiReferenceDate = cdiData[0].data;
    } else {
      throw new Error('Invalid CDI data format');
    }
  } catch (e: any) {
    errors.push('Taxa CDI');
    console.error("Error fetching CDI:", e.message, e);
  }

  // 3. IPCA
  let ipcaFetchedSuccessfully = false;
  const ipcaProjectionApiUrlForYear = (year: number) => `https://olinda.bcb.gov.br/olinda/servico/Focus/versao/v1/odata/ExpectativaMercadoAnual?$format=json&$top=1&$filter=Indicador%20eq%20'IPCA'%20and%20DataReferencia%20eq%20'${year}'&$select=Mediana,Data`;
  const ipcaAccumulatedApiUrl = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.13522/dados/ultimos/1?formato=json';

  try {
    // Attempt 1: Current Year Projection
    try {
      const ipcaResponseCurrentYear = await fetch(ipcaProjectionApiUrlForYear(currentSystemYear));
      if (!ipcaResponseCurrentYear.ok) throw new Error(`Request for IPCA Projection ${currentSystemYear} failed with status ${ipcaResponseCurrentYear.status}`);
      const ipcaDataCurrentYear = await ipcaResponseCurrentYear.json();
      if (ipcaDataCurrentYear.value && ipcaDataCurrentYear.value.length > 0 && ipcaDataCurrentYear.value[0].Mediana !== undefined) {
        const ipcaValue = parseFloat(ipcaDataCurrentYear.value[0].Mediana);
        if(isNaN(ipcaValue)) throw new Error(`IPCA Projection ${currentSystemYear} value is NaN`);
        indicators.ipcaRate = ipcaValue;
        indicators.ipcaSourceType = 'projection';
        indicators.ipcaReferenceDate = String(currentSystemYear); 
        ipcaFetchedSuccessfully = true;
      } else {
        throw new Error(`Data for IPCA Projection ${currentSystemYear} in unexpected format or empty.`);
      }
    } catch (eCurrentYear: any) {
      console.warn(`Fetching IPCA Projection for ${currentSystemYear} failed: ${eCurrentYear.message}. Attempting next year.`);
      const nextYear = currentSystemYear + 1;
      try {
        const ipcaResponseNextYear = await fetch(ipcaProjectionApiUrlForYear(nextYear));
        if (!ipcaResponseNextYear.ok) throw new Error(`Fallback IPCA Projection request for ${nextYear} failed (status ${ipcaResponseNextYear.status}).`);
        const ipcaDataNextYear = await ipcaResponseNextYear.json();
        if (ipcaDataNextYear.value && ipcaDataNextYear.value.length > 0 && ipcaDataNextYear.value[0].Mediana !== undefined) {
          const ipcaValue = parseFloat(ipcaDataNextYear.value[0].Mediana);
          if(isNaN(ipcaValue)) throw new Error(`IPCA Projection ${nextYear} value is NaN`);
          indicators.ipcaRate = ipcaValue;
          indicators.ipcaSourceType = 'projection';
          indicators.ipcaReferenceDate = String(nextYear);
          ipcaFetchedSuccessfully = true;
        } else {
          throw new Error(`Data for IPCA Projection ${nextYear} in unexpected format or empty.`);
        }
      } catch (eNextYear: any) {
        console.warn(`Fetching IPCA Projection for ${nextYear} failed: ${eNextYear.message}. Attempting accumulated IPCA.`);
        const ipcaAccumResponse = await fetch(ipcaAccumulatedApiUrl);
        if (!ipcaAccumResponse.ok) throw new Error(`Fallback IPCA Accumulated request failed (status ${ipcaAccumResponse.status})`);
        const ipcaAccumData = await ipcaAccumResponse.json();
        if (ipcaAccumData && ipcaAccumData.length > 0 && ipcaAccumData[0].valor !== undefined) {
          const ipcaValue = parseFloat(ipcaAccumData[0].valor);
          if(isNaN(ipcaValue)) throw new Error(`IPCA Accumulated value is NaN`);
          indicators.ipcaRate = ipcaValue;
          indicators.ipcaSourceType = 'accumulated12m';
          indicators.ipcaReferenceDate = formatSgsDateToMonthYear(ipcaAccumData[0].data);
          ipcaFetchedSuccessfully = true;
        } else {
          throw new Error('Invalid IPCA Accumulated data format');
        }
      }
    }
  } catch (e: any) {
    errors.push('IPCA (Inflação)');
    console.error("Error fetching IPCA:", e.message, e);
  }
  if (!ipcaFetchedSuccessfully && !errors.includes('IPCA (Inflação)')) {
      errors.push('IPCA (Inflação)'); 
      console.error("All attempts to fetch IPCA failed.");
  }

  // 4. TR (SGS 226 - Taxa referencial (TR) - mensal %)
  try {
    const trResponse = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.226/dados/ultimos/1?formato=json');
    if (!trResponse.ok) throw new Error(`BCB API TR request failed with status ${trResponse.status}`);
    const trData = await trResponse.json();
    if (trData && trData.length > 0 && trData[0].valor !== undefined) {
      const trValue = parseFloat(trData[0].valor);
      if (isNaN(trValue)) throw new Error('Invalid TR value (NaN)');
      indicators.trRate = trValue;
      indicators.trReferenceDate = trData[0].data;
    } else {
      throw new Error('Invalid TR data format');
    }
  } catch (e: any) {
    errors.push('Taxa Referencial (TR)');
    console.error("Error fetching TR:", e.message, e);
  }

  // 5. IGPM (Calculated from SGS 189 - IGP-M Variação Mensal)
  try {
    const igpmMonthlyResponse = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.189/dados/ultimos/12?formato=json');
    if (!igpmMonthlyResponse.ok) throw new Error(`BCB API IGPM (SGS 189) request failed with status ${igpmMonthlyResponse.status}`);
    const igpmMonthlyData = await igpmMonthlyResponse.json();

    if (igpmMonthlyData && Array.isArray(igpmMonthlyData) && igpmMonthlyData.length === 12) {
      let accumulatedRate = 1.0;
      for (const record of igpmMonthlyData) {
        const monthlyValue = parseFloat(record.valor);
        if (isNaN(monthlyValue)) throw new Error('Invalid monthly IGPM value (NaN) in series');
        accumulatedRate *= (1 + monthlyValue / 100);
      }
      const igpmAccumulated12m = (accumulatedRate - 1) * 100;
      if (isNaN(igpmAccumulated12m)) throw new Error('IGPM 12-month accumulation resulted in NaN');
      
      indicators.igpmRate = igpmAccumulated12m;
      indicators.igpmReferenceDate = formatSgsDateToMonthYear(igpmMonthlyData[11].data);
    } else {
      throw new Error('Invalid IGPM monthly data format or insufficient data (SGS 189, expected 12 points)');
    }
  } catch (e: any) {
    errors.push('IGP-M (Inflação)');
    console.error("Error fetching and calculating IGPM (SGS 189):", e.message, e);
  }

  // 6. Dívida Líquida do Setor Público / % PIB (SGS 4513)
  try {
    const dlspResponse = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.4513/dados/ultimos/1?formato=json');
    if (!dlspResponse.ok) throw new Error(`BCB API DLSP/%PIB (SGS 4513) request failed with status ${dlspResponse.status}`);
    const dlspData = await dlspResponse.json();
    if (dlspData && dlspData.length > 0 && dlspData[0].valor !== undefined) {
      const dlspValue = parseFloat(dlspData[0].valor);
      if (isNaN(dlspValue)) throw new Error('Invalid DLSP/%PIB (SGS 4513) value (NaN)');
      indicators.netPublicDebtToGdpSGS4513 = dlspValue;
      indicators.netPublicDebtToGdpSGS4513ReferenceDate = formatSgsDateToMonthYear(dlspData[0].data);
    } else {
      throw new Error('Invalid DLSP/%PIB (SGS 4513) data format');
    }
  } catch (e: any) {
    errors.push('Dívida Líquida Setor Público (% PIB)'); 
    console.error("Error fetching Dívida Líquida Setor Público (SGS 4513):", e.message, e);
  }
  
  // 7. Dívida Bruta do Governo Geral / PIB (SGS 13762) - Monthly
  try {
    const dbggResponse = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.13762/dados/ultimos/1?formato=json');
    if (!dbggResponse.ok) throw new Error(`BCB API DBGG/PIB (SGS 13762) request failed with status ${dbggResponse.status}`);
    const dbggData = await dbggResponse.json();
    if (dbggData && dbggData.length > 0 && dbggData[0].valor !== undefined) {
      const dbggValue = parseFloat(dbggData[0].valor);
      if (isNaN(dbggValue)) throw new Error('Invalid DBGG/PIB (SGS 13762) value (NaN)');
      indicators.grossGeneralGovernmentDebtToGdp = dbggValue;
      indicators.grossGeneralGovernmentDebtToGdpReferenceDate = formatSgsDateToMonthYear(dbggData[0].data);
    } else {
      throw new Error('Invalid DBGG/PIB (SGS 13762) data format');
    }
  } catch (e: any) {
    errors.push('Dívida Bruta Gov. Geral');
    console.error("Error fetching Dívida Bruta Gov. Geral (SGS 13762):", e.message, e);
  }

  // 8. IBC-Br (SGS 24364 - Índice de atividade econômica) - Calcular variação 12 meses
  try {
    const ibcBrResponse = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.24364/dados/ultimos/13?formato=json');
    if (!ibcBrResponse.ok) throw new Error(`BCB API IBC-Br (SGS 24364) request failed with status ${ibcBrResponse.status}`);
    const ibcBrData = await ibcBrResponse.json();
    if (ibcBrData && ibcBrData.length === 13) {
      const latestValue = parseFloat(ibcBrData[12].valor);
      const value12MonthsAgo = parseFloat(ibcBrData[0].valor);
      if (isNaN(latestValue) || isNaN(value12MonthsAgo) || value12MonthsAgo === 0) {
        throw new Error('Invalid IBC-Br data for 12-month calculation');
      }
      indicators.ibcBrRate = ((latestValue / value12MonthsAgo) - 1) * 100;
      indicators.ibcBrReferenceDate = formatSgsDateToMonthYear(ibcBrData[12].data);
    } else {
      throw new Error('Invalid IBC-Br data format or insufficient data (SGS 24364)');
    }
  } catch (e: any) {
    errors.push('IBC-Br (Atividade Econ.)');
    console.error("Error fetching IBC-Br (SGS 24364):", e.message, e);
  }

  // 9. Reservas Internacionais (SGS 13621 - US$ milhões, diário)
  try {
    const reservesResponse = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.13621/dados/ultimos/1?formato=json');
    if (!reservesResponse.ok) throw new Error(`BCB API International Reserves request failed with status ${reservesResponse.status}`);
    const reservesData = await reservesResponse.json();
    if (reservesData && reservesData.length > 0 && reservesData[0].valor !== undefined) {
      const reservesValue = parseFloat(reservesData[0].valor);
      if (isNaN(reservesValue)) throw new Error('Invalid International Reserves value (NaN)');
      indicators.internationalReserves = reservesValue;
      indicators.internationalReservesReferenceDate = reservesData[0].data;
    } else {
      throw new Error('Invalid International Reserves data format');
    }
  } catch (e: any) {
    errors.push('Reservas Internacionais');
    console.error("Error fetching International Reserves:", e.message, e);
  }

  // 10. Reservas Internacionais - Ouro (SGS 3552 - mensal - US$ milhões)
  try {
    const goldResponse = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.3552/dados/ultimos/1?formato=json');
    if (!goldResponse.ok) throw new Error(`BCB API Gold Reserves (SGS 3552) request failed with status ${goldResponse.status}`);
    const goldData = await goldResponse.json();
    if (goldData && goldData.length > 0 && goldData[0].valor !== undefined) {
      const goldValue = parseFloat(goldData[0].valor);
      if (isNaN(goldValue)) throw new Error('Invalid Gold Reserves (SGS 3552) value (NaN)');
      indicators.goldReservesSGS3552MillionsUSD = goldValue;
      indicators.goldReservesSGS3552MillionsUSDReferenceDate = formatSgsDateToMonthYear(goldData[0].data);
    } else {
      throw new Error('Invalid Gold Reserves (SGS 3552) data format');
    }
  } catch (e: any) {
    errors.push('Reservas Internacionais - Ouro');
    console.error("Error fetching Gold Reserves (SGS 3552):", e.message, e);
  }
  
  // 11. M2 (Base Monetária - SGS 27842 - Milhares de R$)
  try {
    const m2Response = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.27842/dados/ultimos/1?formato=json');
    if (!m2Response.ok) throw new Error(`BCB API M2 (SGS 27842) request failed with status ${m2Response.status}`);
    const m2Data = await m2Response.json();
    if (m2Data && m2Data.length > 0 && m2Data[0].valor !== undefined) {
      const m2Value = parseFloat(m2Data[0].valor);
      if (isNaN(m2Value)) throw new Error('Invalid M2 (SGS 27842) value (NaN)');
      indicators.m2BalanceSGS27842 = m2Value; // Store value in "Milhares de R$"
      indicators.m2BalanceSGS27842ReferenceDate = formatSgsDateToMonthYear(m2Data[0].data);
    } else {
      throw new Error('Invalid M2 (SGS 27842) data format');
    }
  } catch (e: any) {
    errors.push('M2 (Base Monetária)');
    console.error("Error fetching M2 (SGS 27842):", e.message, e);
  }


  // 12. PIB (Projeção Focus - Olinda API)
  let gdpFetchedSuccessfully = false;
  const gdpProjectionApiUrl = (year: number) => `https://olinda.bcb.gov.br/olinda/servico/Focus/versao/v1/odata/ExpectativaMercadoAnual?$format=json&$top=1&$filter=Indicador%20eq%20'PIB%20Total'%20and%20DataReferencia%20eq%20'${year}'&$select=Mediana,Data`;
  
  const yearsToAttemptGdp = [currentSystemYear, currentSystemYear + 1];

  for (const yearToFetch of yearsToAttemptGdp) {
    try {
      const gdpResponse = await fetch(gdpProjectionApiUrl(yearToFetch));
      if (!gdpResponse.ok) {
        const message = `Request for GDP Projection DataReferencia '${yearToFetch}' (Olinda API) failed with status ${gdpResponse.status}.`;
        if (gdpResponse.status === 404) {
          console.warn(`GDP Projection for DataReferencia '${yearToFetch}' (Olinda API) not found (404).`);
          if (yearToFetch !== yearsToAttemptGdp[yearsToAttemptGdp.length - 1]) {
            console.warn(`Trying next available year for GDP projection.`);
            continue; 
          } else {
            // Last attempt was a 404, don't throw, just break. gdpFetchedSuccessfully remains false.
            break; 
          }
        } else {
          // For other non-ok statuses, throw an error to be caught by the outer catch block.
          throw new Error(message);
        }
      }
      const gdpData = await gdpResponse.json();
      if (gdpData.value && gdpData.value.length > 0 && gdpData.value[0].Mediana !== undefined) {
        const gdpValue = parseFloat(gdpData.value[0].Mediana);
        if(isNaN(gdpValue)) {
          console.warn(`GDP Projection for DataReferencia '${yearToFetch}' (Olinda API) value is NaN. Skipping this year.`);
           if (yearToFetch === yearsToAttemptGdp[yearsToAttemptGdp.length - 1]) {
             break; 
           }
           continue;
        }
        indicators.gdpProjection = gdpValue;
        indicators.gdpProjectionSourceType = 'projection_focus';
        indicators.gdpProjectionReferenceDate = String(yearToFetch);
        gdpFetchedSuccessfully = true;
        console.log(`Successfully fetched GDP Projection for DataReferencia '${yearToFetch}' from Olinda API.`);
        break; 
      } else {
        console.warn(`Data for GDP Projection DataReferencia '${yearToFetch}' (Olinda API) in unexpected format or empty.`);
        if (yearToFetch === yearsToAttemptGdp[yearsToAttemptGdp.length - 1]) {
            break;
        }
      }
    } catch (eFocus: any) {
      console.error(`Error during attempt to fetch GDP Projection for DataReferencia '${yearToFetch}': ${eFocus.message}`);
      if (yearToFetch === yearsToAttemptGdp[yearsToAttemptGdp.length - 1]) {
         break; 
      }
    }
  }
  
  if (!gdpFetchedSuccessfully) {
    console.warn(`PIB projection data from Olinda Focus API is unavailable for DataReferencia ${yearsToAttemptGdp.join(' or ')}.`);
    // Ensure PIB is not added to 'errors' so UI shows N/D instead of error message for PIB card.
  }


  indicators.lastUpdated = new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  if (errors.length > 0) {
    indicators.errors = errors;
  }

  return indicators;
}

/**
 * Fetches the latest Bitcoin price from CoinGecko API.
 */
export async function fetchLatestBitcoinPrice(): Promise<BtcPriceInfo | null> {
  const apiUrl = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=brl,usd&include_last_updated_at=true';
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`CoinGecko API request failed with status ${response.status}`);
    }
    const data = await response.json();
    if (data.bitcoin && data.bitcoin.brl && data.bitcoin.usd && data.bitcoin.last_updated_at) {
      return {
        brl: data.bitcoin.brl,
        usd: data.bitcoin.usd,
        lastUpdatedAt: data.bitcoin.last_updated_at,
      };
    } else {
      throw new Error('Invalid Bitcoin price data format from CoinGecko');
    }
  } catch (e: any) {
    console.error("Error fetching Bitcoin price from CoinGecko:", e.message, e);
    return null;
  }
}

/**
 * Fetches the latest USD/BRL PTAX Venda rate from BCB SGS API.
 * SGS 10813: Taxa de câmbio - Livre - Dólar americano (venda) - diário
 */
export async function fetchLatestUsdBrlRate(): Promise<UsdBrlRateInfo | null> {
  const sgsCodePtaxVenda = 10813;
  const apiUrl = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${sgsCodePtaxVenda}/dados/ultimos/1?formato=json`;
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`BCB API PTAX Venda (SGS ${sgsCodePtaxVenda}) request failed with status ${response.status}`);
    }
    const data = await response.json();
    if (data && data.length > 0 && data[0].valor !== undefined && data[0].data !== undefined) {
      const rate = parseFloat(data[0].valor);
      if (isNaN(rate)) {
        throw new Error('Invalid PTAX rate value (NaN)');
      }
      
      // Convert DD/MM/YYYY to YYYY-MM-DDTHH:mm:ssZ
      const dateParts = data[0].data.split('/');
      if (dateParts.length !== 3) {
        throw new Error('Invalid PTAX date format from SGS');
      }
      // PTAX is typically defined in the afternoon. Using 16:00 UTC as a generic time.
      const isoDateTime = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}T16:00:00Z`;

      return {
        rate: rate,
        dateTime: isoDateTime,
      };
    } else {
      throw new Error('Invalid PTAX data format from SGS');
    }
  } catch (e: any) {
    console.error(`Error fetching PTAX Venda (SGS ${sgsCodePtaxVenda}):`, e.message, e);
    return null;
  }
}


/**
 * Fetches historical data for a given BCB SGS code.
 * @param sgsCode The SGS code of the series.
 * @param startDate Formatted as DD/MM/YYYY.
 * @param endDate Formatted as DD/MM/YYYY.
 * @returns Array of data points or throws an error.
 */
export async function fetchHistoricalSgsData(
  sgsCode: string | number,
  startDate: string, // DD/MM/YYYY
  endDate: string    // DD/MM/YYYY
): Promise<Array<{ data: string; valor: string }>> { 
  const apiUrl = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${sgsCode}/dados?formato=json&dataInicial=${startDate}&dataFinal=${endDate}`;
  console.log("Fetching SGS Historical:", apiUrl);
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      const errorBody = await response.text();
      console.error("SGS API Error Body:", errorBody);
      throw new Error(`Falha na API SGS (${sgsCode}) status ${response.status}. Data: ${startDate} a ${endDate}.`);
    }
    const data = await response.json();
    if (!Array.isArray(data)) {
        throw new Error(`Resposta inesperada da API SGS (${sgsCode}). Esperava um array.`);
    }
    return data;
  } catch (e: any) {
    console.error(`Erro ao buscar dados históricos para SGS ${sgsCode}:`, e.message, e);
    throw e; 
  }
}

/**
 * Fetches historical PTAX USD/BRL exchange rates for a given period.
 * @param startDate Formatted as DD/MM/YYYY.
 * @param endDate Formatted as DD/MM/YYYY.
 * @returns Array of PTAX data points or throws an error.
 */
export async function fetchHistoricalPtAXData(
  startDate: string, // DD/MM/YYYY
  endDate: string    // DD/MM/YYYY
): Promise<Array<{ cotacaoVenda: number; dataHoraCotacao: string }>> {
  const convertDate = (dateStr: string) => {
    const parts = dateStr.split('/');
    return `${parts[1]}-${parts[0]}-${parts[2]}`;
  };
  const apiStartDate = convertDate(startDate);
  const apiEndDate = convertDate(endDate);

  const apiUrl = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?@dataInicial='${apiStartDate}'&@dataFinalCotacao='${apiEndDate}'&$format=json&$select=cotacaoVenda,dataHoraCotacao`;
  console.log("Fetching PTAX Historical:", apiUrl);
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      const errorBody = await response.text();
      console.error("PTAX API Error Body:", errorBody);
      throw new Error(`Falha na API PTAX status ${response.status}. Data: ${apiStartDate} a ${apiEndDate}.`);
    }
    const data = await response.json();
     if (data && data.value && Array.isArray(data.value)) {
        return data.value;
    }
    throw new Error("Resposta inesperada da API PTAX. Esperava 'value' como array.");
  } catch (e: any) {
    console.error("Erro ao buscar dados históricos PTAX:", e.message, e);
    throw e; 
  }
}

/**
 * Fetches and calculates the geometric average of a historical series from BCB SGS.
 * @param sgsCode The SGS code of the monthly series.
 * @param numberOfYears The number of years of historical data to fetch.
 * @returns An object containing the average annual rate, the source date range, and any error.
 */
export async function fetchAndCalculateHistoricalAverage(
  sgsCode: string | number,
  numberOfYears: number
): Promise<DynamicHistoricalAverage> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(endDate.getFullYear() - numberOfYears);

  // Ensure startDate is at least the earliest possible for some series if needed, e.g. BCB start
  // const earliestDataDate = new Date('1995-01-01'); // Example for some series
  // if (startDate < earliestDataDate) {
  //   startDate.setTime(earliestDataDate.getTime());
  // }

  const formatDate = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  const apiStartDateStr = formatDate(startDate);
  const apiEndDateStr = formatDate(endDate);
  
  let rawData: Array<{ data: string; valor: string }> = [];
  try {
    rawData = await fetchHistoricalSgsData(sgsCode, apiStartDateStr, apiEndDateStr);
    if (!rawData || rawData.length === 0) {
      return { value: null, isLoading: false, error: "Nenhum dado retornado pela API.", sourceSgsCode: sgsCode };
    }

    const monthlyValues: number[] = rawData.map(item => parseFloat(item.valor.replace(',', '.')) / 100).filter(v => !isNaN(v));

    if (monthlyValues.length === 0) {
      return { value: null, isLoading: false, error: "Dados retornados não contêm valores numéricos válidos.", sourceSgsCode: sgsCode };
    }

    // Geometric mean calculation
    let productOfGrowthFactors = 1;
    for (const monthlyRate of monthlyValues) {
      productOfGrowthFactors *= (1 + monthlyRate);
    }

    const averageMonthlyGrowthFactor = Math.pow(productOfGrowthFactors, 1 / monthlyValues.length);
    const averageAnnualRate = (Math.pow(averageMonthlyGrowthFactor, 12) - 1) * 100;

    if (isNaN(averageAnnualRate)) {
        return { value: null, isLoading: false, error: "Cálculo da média resultou em NaN.", sourceSgsCode: sgsCode };
    }

    const firstDataDate = rawData[0].data; // dd/MM/yyyy
    const lastDataDate = rawData[rawData.length - 1].data; // dd/MM/yyyy
    
    const formatDisplayDate = (dmyString: string) => {
        const parts = dmyString.split('/');
        return `${parts[1]}/${parts[2]}`; // MM/YYYY
    }

    return {
      value: averageAnnualRate,
      isLoading: false,
      error: null,
      sourceDateRange: `${formatDisplayDate(firstDataDate)} - ${formatDisplayDate(lastDataDate)} (${monthlyValues.length} meses)`,
      sourceSgsCode: sgsCode
    };

  } catch (e: any) {
    console.error(`Error fetching/calculating historical average for SGS ${sgsCode}:`, e.message, e);
    return { 
        value: null, 
        isLoading: false, 
        error: `Falha ao buscar/calcular dados históricos (SGS ${sgsCode}).`, 
        sourceSgsCode: sgsCode 
    };
  }
}