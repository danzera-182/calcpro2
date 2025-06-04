// utils/economicIndicatorsAPI.ts
import { HistoricalDataPoint, DynamicHistoricalAverage, BtcPriceInfo, UsdBrlRateInfo, BitcoinPriceHistoryPoint, UsdtPriceInfo, FetchedEconomicIndicators } from '../types'; 
// Removed FinnhubNewsItem from import
// Added FetchedEconomicIndicators to import

// Removed local FetchedEconomicIndicators interface, using the one from types.ts

const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';

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
        if(!isNaN(ipcaValue)) {
            indicators.ipcaRate = ipcaValue;
            indicators.ipcaSourceType = 'projection';
            indicators.ipcaReferenceDate = String(currentSystemYear);
            ipcaFetchedSuccessfully = true;
        } else {
            console.warn(`IPCA Projection for ${currentSystemYear} was NaN.`);
        }
      }
    } catch (e: any) {
      console.warn(`Error fetching IPCA Projection for ${currentSystemYear}:`, e.message);
    }

    // Attempt 2: Previous Year Projection if current year failed
    if (!ipcaFetchedSuccessfully) {
      try {
        const ipcaResponsePreviousYear = await fetch(ipcaProjectionApiUrlForYear(currentSystemYear - 1));
        if (!ipcaResponsePreviousYear.ok) throw new Error(`Request for IPCA Projection ${currentSystemYear - 1} failed with status ${ipcaResponsePreviousYear.status}`);
        const ipcaDataPreviousYear = await ipcaResponsePreviousYear.json();
        if (ipcaDataPreviousYear.value && ipcaDataPreviousYear.value.length > 0 && ipcaDataPreviousYear.value[0].Mediana !== undefined) {
          const ipcaValue = parseFloat(ipcaDataPreviousYear.value[0].Mediana);
          if(!isNaN(ipcaValue)) {
            indicators.ipcaRate = ipcaValue;
            indicators.ipcaSourceType = 'projection';
            indicators.ipcaReferenceDate = String(currentSystemYear - 1);
            ipcaFetchedSuccessfully = true;
          } else {
            console.warn(`IPCA Projection for ${currentSystemYear -1} was NaN.`);
          }
        }
      } catch (e: any) {
        console.warn(`Error fetching IPCA Projection for ${currentSystemYear - 1}:`, e.message);
      }
    }

    // Attempt 3: Accumulated 12 months as a fallback if projections failed
    if (!ipcaFetchedSuccessfully) {
      try {
        const ipcaAccumulatedResponse = await fetch(ipcaAccumulatedApiUrl);
        if (!ipcaAccumulatedResponse.ok) throw new Error(`Request for IPCA Accumulated failed with status ${ipcaAccumulatedResponse.status}`);
        const ipcaAccumulatedData = await ipcaAccumulatedResponse.json();
        if (ipcaAccumulatedData && ipcaAccumulatedData.length > 0 && ipcaAccumulatedData[0].valor !== undefined) {
          const ipcaValue = parseFloat(ipcaAccumulatedData[0].valor);
          if(!isNaN(ipcaValue)) {
            indicators.ipcaRate = ipcaValue;
            indicators.ipcaSourceType = 'accumulated12m';
            indicators.ipcaReferenceDate = formatSgsDateToMonthYear(ipcaAccumulatedData[0].data);
            ipcaFetchedSuccessfully = true;
          } else {
             console.warn(`IPCA Accumulated was NaN.`);
          }
        }
      } catch (e: any) {
        console.warn("Error fetching IPCA Accumulated (12m):", e.message);
      }
    }
    if (!ipcaFetchedSuccessfully) {
        throw new Error('Failed to fetch IPCA from all sources.');
    }

  } catch (e: any) {
    errors.push('IPCA (Inflação)');
    console.error("Error fetching IPCA:", e.message, e);
  }

  // 4. TR (SGS 226 - Taxa Referencial - daily, value is monthly rate)
  try {
    const trResponse = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.226/dados/ultimos/1?formato=json');
    if (!trResponse.ok) throw new Error(`BCB API TR request failed with status ${trResponse.status}`);
    const trData = await trResponse.json();
    if (trData && trData.length > 0 && trData[0].valor !== undefined) {
      const trValue = parseFloat(trData[0].valor);
      if(isNaN(trValue)) throw new Error('Invalid TR value (NaN)');
      indicators.trRate = trValue; // This is already the monthly rate
      indicators.trReferenceDate = trData[0].data;
    } else {
      throw new Error('Invalid TR data format');
    }
  } catch (e: any) {
    errors.push('Taxa Referencial (TR)');
    console.error("Error fetching TR:", e.message, e);
  }

  // 5. IGP-M (SGS 189 - IGP-M variação mensal - FGV) - Calculate 12-month accumulated
  try {
    const igpmResponse = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.189/dados/ultimos/12?formato=json');
    if (!igpmResponse.ok) throw new Error(`BCB API IGP-M request failed with status ${igpmResponse.status}`);
    const igpmData = await igpmResponse.json();
    if (igpmData && igpmData.length === 12) {
      let accumulatedIgpm = 1;
      for (const record of igpmData) {
        const monthlyRate = parseFloat(record.valor);
        if (isNaN(monthlyRate)) throw new Error('Invalid monthly IGP-M value (NaN)');
        accumulatedIgpm *= (1 + monthlyRate / 100);
      }
      indicators.igpmRate = (accumulatedIgpm - 1) * 100;
      indicators.igpmReferenceDate = formatSgsDateToMonthYear(igpmData[igpmData.length - 1].data);
    } else {
      throw new Error('Invalid IGP-M data format or insufficient data for 12-month accumulation');
    }
  } catch (e: any) {
    errors.push('IGP-M (Inflação)');
    console.error("Error fetching IGP-M:", e.message, e);
  }

 // 6. Dívida Líquida do Setor Público (% PIB) (SGS 4513)
  try {
    const debtToGdpResponse = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.4513/dados/ultimos/1?formato=json');
    if (!debtToGdpResponse.ok) throw new Error(`BCB API DLSP/PIB (4513) request failed: ${debtToGdpResponse.status}`);
    const debtToGdpData = await debtToGdpResponse.json();
    if (debtToGdpData && debtToGdpData.length > 0 && debtToGdpData[0].valor !== undefined) {
      const value = parseFloat(debtToGdpData[0].valor);
      if(isNaN(value)) throw new Error('Invalid DLSP/PIB (4513) value (NaN)');
      indicators.netPublicDebtToGdpSGS4513 = value;
      indicators.netPublicDebtToGdpSGS4513ReferenceDate = formatSgsDateToMonthYear(debtToGdpData[0].data);
    } else {
      throw new Error('Invalid DLSP/PIB (4513) data format');
    }
  } catch (e: any) {
    errors.push('Dívida Líquida Setor Público (% PIB)');
    console.error("Error fetching DLSP/PIB (SGS 4513):", e.message, e);
  }

  // 7. IBC-Br (SGS 24364 - Índice de Atividade Econômica Dessazonalizado) - Calculate 12-month accumulated change
  try {
    // Fetch last 13 months to calculate 12-month change (current_month / month_12_ago - 1)
    const ibcBrResponse = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.24364/dados/ultimos/13?formato=json');
    if (!ibcBrResponse.ok) throw new Error(`BCB API IBC-Br (24364) request failed: ${ibcBrResponse.status}`);
    const ibcBrData = await ibcBrResponse.json();
    if (ibcBrData && ibcBrData.length === 13) {
      const currentValue = parseFloat(ibcBrData[12].valor); // Most recent
      const pastValue = parseFloat(ibcBrData[0].valor);   // 12 months ago
      if(isNaN(currentValue) || isNaN(pastValue) || pastValue === 0) throw new Error('Invalid IBC-Br values for accumulation (NaN or zero past value)');
      indicators.ibcBrRate = ((currentValue / pastValue) - 1) * 100;
      indicators.ibcBrReferenceDate = formatSgsDateToMonthYear(ibcBrData[12].data);
    } else {
      throw new Error('Invalid IBC-Br (24364) data format or insufficient data');
    }
  } catch (e: any) {
    errors.push('IBC-Br (Atividade Econ.)');
    console.error("Error fetching IBC-Br (SGS 24364):", e.message, e);
  }
  
  // 8. Reservas Internacionais - Conceito liquidez (SGS 13621 - US$ milhões)
  try {
    const reservesResponse = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.13621/dados/ultimos/1?formato=json');
    if (!reservesResponse.ok) throw new Error(`BCB API Reservas (13621) request failed: ${reservesResponse.status}`);
    const reservesData = await reservesResponse.json();
    if (reservesData && reservesData.length > 0 && reservesData[0].valor !== undefined) {
      const value = parseFloat(reservesData[0].valor);
      if(isNaN(value)) throw new Error('Invalid Reservas (13621) value (NaN)');
      indicators.internationalReserves = value;
      indicators.internationalReservesReferenceDate = reservesData[0].data; // dd/MM/yyyy
    } else {
      throw new Error('Invalid Reservas (13621) data format');
    }
  } catch (e: any) {
    errors.push('Reservas Internacionais');
    console.error("Error fetching Reservas (SGS 13621):", e.message, e);
  }

  // 9. Reservas internacionais - Ouro (SGS 3552 - US$ milhões)
  try {
    const goldReservesResponse = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.3552/dados/ultimos/1?formato=json');
    if (!goldReservesResponse.ok) throw new Error(`BCB API Ouro Reservas (3552) request failed: ${goldReservesResponse.status}`);
    const goldReservesData = await goldReservesResponse.json();
    if (goldReservesData && goldReservesData.length > 0 && goldReservesData[0].valor !== undefined) {
      const value = parseFloat(goldReservesData[0].valor);
      if(isNaN(value)) throw new Error('Invalid Ouro Reservas (3552) value (NaN)');
      indicators.goldReservesSGS3552MillionsUSD = value;
      indicators.goldReservesSGS3552MillionsUSDReferenceDate = formatSgsDateToMonthYear(goldReservesData[0].data);
    } else {
      throw new Error('Invalid Ouro Reservas (3552) data format');
    }
  } catch (e: any) {
    errors.push('Reservas Internacionais - Ouro');
    console.error("Error fetching Ouro Reservas (SGS 3552):", e.message, e);
  }
  
  // 10. PIB (Focus Projection - Kept as secondary)
  try {
    const pibFocusResponse = await fetch(`https://olinda.bcb.gov.br/olinda/servico/Focus/versao/v1/odata/ExpectativaMercadoAnual?$format=json&$top=1&$filter=Indicador%20eq%20'PIB%20Total'%20and%20DataReferencia%20eq%20'${currentSystemYear}'&$select=Mediana,Data`);
    if (!pibFocusResponse.ok) throw new Error(`BCB Focus API PIB request failed: ${pibFocusResponse.status}`);
    const pibFocusData = await pibFocusResponse.json();
    if (pibFocusData.value && pibFocusData.value.length > 0 && pibFocusData.value[0].Mediana !== undefined) {
      const value = parseFloat(pibFocusData.value[0].Mediana);
      if(isNaN(value)) throw new Error('Invalid PIB Focus value (NaN)');
      indicators.gdpProjection = value;
      indicators.gdpProjectionSourceType = 'projection_focus';
      indicators.gdpProjectionReferenceDate = String(currentSystemYear);
    } else {
      const pibFocusPrevYearResponse = await fetch(`https://olinda.bcb.gov.br/olinda/servico/Focus/versao/v1/odata/ExpectativaMercadoAnual?$format=json&$top=1&$filter=Indicador%20eq%20'PIB%20Total'%20and%20DataReferencia%20eq%20'${currentSystemYear - 1}'&$select=Mediana,Data`);
      if (!pibFocusPrevYearResponse.ok) throw new Error(`BCB Focus API PIB (Prev Year) request failed: ${pibFocusPrevYearResponse.status}`);
      const pibFocusPrevYearData = await pibFocusPrevYearResponse.json();
      if (pibFocusPrevYearData.value && pibFocusPrevYearData.value.length > 0 && pibFocusPrevYearData.value[0].Mediana !== undefined) {
        const value = parseFloat(pibFocusPrevYearData.value[0].Mediana);
         if(isNaN(value)) throw new Error('Invalid PIB Focus (Prev Year) value (NaN)');
        indicators.gdpProjection = value;
        indicators.gdpProjectionSourceType = 'projection_focus';
        indicators.gdpProjectionReferenceDate = String(currentSystemYear - 1);
      } else {
        console.warn('PIB Focus: Invalid data format for current and previous year, not critical for PIB 12M card.');
      }
    }
  } catch (e: any) {
    // errors.push('PIB (Focus)'); // Don't add to main errors if SGS 4382 succeeds
    console.warn("Error fetching PIB (Focus, secondary):", e.message, e);
  }

  // 11. Dívida Bruta do Governo Geral (% PIB) (SGS 13762)
  try {
    const dbggResponse = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.13762/dados/ultimos/1?formato=json');
    if (!dbggResponse.ok) throw new Error(`BCB API DBGG/PIB (13762) request failed: ${dbggResponse.status}`);
    const dbggData = await dbggResponse.json();
    if (dbggData && dbggData.length > 0 && dbggData[0].valor !== undefined) {
      const value = parseFloat(dbggData[0].valor);
      if(isNaN(value)) throw new Error('Invalid DBGG/PIB (13762) value (NaN)');
      indicators.grossGeneralGovernmentDebtToGdp = value;
      indicators.grossGeneralGovernmentDebtToGdpReferenceDate = formatSgsDateToMonthYear(dbggData[0].data);
    } else {
      throw new Error('Invalid DBGG/PIB (13762) data format');
    }
  } catch (e: any) {
    errors.push('Dívida Bruta Gov. Geral');
    console.error("Error fetching DBGG/PIB (SGS 13762):", e.message, e);
  }

  // 12. M2 (Saldo em Milhares de R$) (SGS 27842)
  try {
    const m2Response = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.27842/dados/ultimos/1?formato=json');
    if (!m2Response.ok) throw new Error(`BCB API M2 (27842) request failed: ${m2Response.status}`);
    const m2Data = await m2Response.json();
    if (m2Data && m2Data.length > 0 && m2Data[0].valor !== undefined) {
      const value = parseFloat(m2Data[0].valor);
      if(isNaN(value)) throw new Error('Invalid M2 (27842) value (NaN)');
      indicators.m2BalanceSGS27842 = value;
      indicators.m2BalanceSGS27842ReferenceDate = formatSgsDateToMonthYear(m2Data[0].data);
    } else {
      throw new Error('Invalid M2 (27842) data format');
    }
  } catch (e: any) {
    errors.push('M2 (Base Monetária)');
    console.error("Error fetching M2 (SGS 27842):", e.message, e);
  }
  
  // 13. PIB Acumulado 12 Meses (SGS 4382 - R$ milhões) - Primary for card
  try {
    const pib12mResponse = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.4382/dados/ultimos/1?formato=json');
    if (!pib12mResponse.ok) throw new Error(`BCB API PIB 12M (4382) request failed: ${pib12mResponse.status}`);
    const pib12mData = await pib12mResponse.json();
    if (pib12mData && pib12mData.length > 0 && pib12mData[0].valor !== undefined) {
      const value = parseFloat(pib12mData[0].valor);
      if(isNaN(value)) throw new Error('Invalid PIB 12M (4382) value (NaN)');
      indicators.gdpAccumulated12mSGS4382 = value; // This is in R$ milhões
      indicators.gdpAccumulated12mSGS4382ReferenceDate = formatSgsDateToMonthYear(pib12mData[0].data);
    } else {
      throw new Error('Invalid PIB 12M (4382) data format');
    }
  } catch (e: any) {
    errors.push('PIB (Acum. 12M)');
    console.error("Error fetching PIB 12M (SGS 4382):", e.message, e);
  }


  if (errors.length > 0) {
    indicators.errors = errors;
  }
  indicators.lastUpdated = new Date().toLocaleString('pt-BR');
  return indicators;
}


export async function fetchLatestUsdBrlRate(): Promise<UsdBrlRateInfo | null> {
  const today = new Date();
  const endDate = `${today.getMonth() + 1}-${today.getDate()}-${today.getFullYear()}`;
  // Look back up to 7 days for the latest PTAX rate
  const startDateDaysAgo = new Date(today);
  startDateDaysAgo.setDate(today.getDate() - 7); 
  const startDate = `${startDateDaysAgo.getMonth() + 1}-${startDateDaysAgo.getDate()}-${startDateDaysAgo.getFullYear()}`;

  const url = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?@dataInicial='${startDate}'&@dataFinalCotacao='${endDate}'&$top=1&$orderby=dataHoraCotacao%20desc&$format=json&$select=cotacaoVenda,dataHoraCotacao`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`BCB PTAX API request failed with status ${response.status}: ${await response.text()}`);
      throw new Error('Falha ao buscar cotação PTAX do BCB.');
    }
    const data = await response.json();
    if (data.value && data.value.length > 0) {
      const latestRate = data.value[0];
      if (latestRate.cotacaoVenda && latestRate.dataHoraCotacao) {
        return {
          rate: latestRate.cotacaoVenda,
          dateTime: latestRate.dataHoraCotacao,
        };
      }
    }
    console.warn("Nenhuma cotação PTAX encontrada no período recente.");
    return null;
  } catch (error) {
    console.error("Error fetching USD/BRL PTAX rate:", error);
    throw error; // Re-throw to be caught by the caller
  }
}


export async function fetchLatestBitcoinPrice(): Promise<BtcPriceInfo | null> {
  const coinId = 'bitcoin';
  const vsCurrencies = 'usd,brl';
  const includeMarketCap = 'true';
  const includeLastUpdatedAt = 'true';
  const includeDescription = 'true';
  const include24hrChange = 'true';

  const apiKey = (typeof process !== 'undefined' && process.env) ? process.env.COINGECKO_API_KEY : undefined;

  // Primarily use the /coins/{id} endpoint for all data to reduce API calls
  const url = `${COINGECKO_BASE_URL}/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`;
  
  const headers: HeadersInit = {};
  if (apiKey) {
    // headers['x-cg-pro-api-key'] = apiKey; // For Pro API
    // Append as query parameter for demo/public key
     // url += (url.includes('?') ? '&' : '?') + `x_cg_demo_api_key=${apiKey}`;
  }

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      console.error(`CoinGecko API request for Bitcoin details failed: ${response.status}`, errorData);
      throw new Error(`Falha ao buscar dados detalhados do Bitcoin (CoinGecko): ${errorData.error || response.statusText}`);
    }
    const data = await response.json();

    if (data && data.market_data) {
      return {
        usd: data.market_data.current_price?.usd,
        brl: data.market_data.current_price?.brl,
        lastUpdatedAt: data.market_data.last_updated ? Math.floor(new Date(data.market_data.last_updated).getTime() / 1000) : undefined,
        marketCapUsd: data.market_data.market_cap?.usd,
        marketCapBrl: data.market_data.market_cap?.brl,
        totalSupply: data.market_data.total_supply,
        circulatingSupply: data.market_data.circulating_supply,
        description: data.description?.pt || data.description?.en, // Prefer Portuguese description
        usd_24h_change: data.market_data.price_change_percentage_24h_in_currency?.usd,
        brl_24h_change: data.market_data.price_change_percentage_24h_in_currency?.brl,
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching Bitcoin price from CoinGecko:", error);
    throw error;
  }
}


export async function fetchLatestUsdtPrice(): Promise<UsdtPriceInfo | null> {
  const coinId = 'tether';
  // Similar to Bitcoin, fetch all data from the /coins/{id} endpoint
  let url = `${COINGECKO_BASE_URL}/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`;
  
  const apiKey = (typeof process !== 'undefined' && process.env) ? process.env.COINGECKO_API_KEY : undefined;
  const headers: HeadersInit = {};
  if (apiKey) {
    // headers['x-cg-pro-api-key'] = apiKey; // For Pro API
    // url += (url.includes('?') ? '&' : '?') + `x_cg_demo_api_key=${apiKey}`;
  }

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      console.error(`CoinGecko API request for USDT details failed: ${response.status}`, errorData);
      throw new Error(`Falha ao buscar dados detalhados do USDT (CoinGecko): ${errorData.error || response.statusText}`);
    }
    const data = await response.json();

    if (data && data.market_data) {
      return {
        usd: data.market_data.current_price?.usd,
        brl: data.market_data.current_price?.brl,
        lastUpdatedAt: data.market_data.last_updated ? Math.floor(new Date(data.market_data.last_updated).getTime() / 1000) : undefined,
        marketCapUsd: data.market_data.market_cap?.usd,
        marketCapBrl: data.market_data.market_cap?.brl,
        totalSupply: data.market_data.total_supply,
        circulatingSupply: data.market_data.circulating_supply,
        description: data.description?.pt || data.description?.en,
        usd_24h_change: data.market_data.price_change_percentage_24h_in_currency?.usd,
        brl_24h_change: data.market_data.price_change_percentage_24h_in_currency?.brl,
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching USDT price from CoinGecko:", error);
    throw error;
  }
}


export async function fetchBitcoinHistoricalChartData(
  coinId: string = 'bitcoin',
  vsCurrency: string = 'usd',
  days: string = '30' // Can be '1', '7', '30', '90', '365', 'max'
): Promise<BitcoinPriceHistoryPoint[] | null> {
  let url = `${COINGECKO_BASE_URL}/coins/${coinId}/market_chart?vs_currency=${vsCurrency}&days=${days}`;
  
  const apiKey = (typeof process !== 'undefined' && process.env) ? process.env.COINGECKO_API_KEY : undefined;
  const headers: HeadersInit = {};
  if (apiKey) {
    // headers['x-cg-pro-api-key'] = apiKey; // For Pro API
    // url += (url.includes('?') ? '&' : '?') + `x_cg_demo_api_key=${apiKey}`;
  }

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      console.error(`CoinGecko API historical chart data for Bitcoin failed: ${response.status}`, errorData);
      throw new Error(`Falha ao buscar dados históricos do Bitcoin (CoinGecko): ${errorData.error || response.statusText}`);
    }
    const data = await response.json();
    if (data && data.prices) {
      return data.prices.map((item: [number, number]) => ({
        timestamp: item[0],
        price: item[1],
      }));
    }
    return null;
  } catch (error) {
    console.error("Error fetching Bitcoin historical chart data from CoinGecko:", error);
    throw error;
  }
}

export async function fetchUsdtHistoricalChartData(
  coinId: string = 'tether',
  vsCurrency: string = 'brl',
  days: string = '30'
): Promise<BitcoinPriceHistoryPoint[] | null> { // Reusing BitcoinPriceHistoryPoint for simplicity
  let url = `${COINGECKO_BASE_URL}/coins/${coinId}/market_chart?vs_currency=${vsCurrency}&days=${days}`;
  
  const apiKey = (typeof process !== 'undefined' && process.env) ? process.env.COINGECKO_API_KEY : undefined;
  const headers: HeadersInit = {};
  if (apiKey) {
    // headers['x-cg-pro-api-key'] = apiKey; // For Pro API
    // url += (url.includes('?') ? '&' : '?') + `x_cg_demo_api_key=${apiKey}`;
  }

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      console.error(`CoinGecko API historical chart data for USDT failed: ${response.status}`, errorData);
      throw new Error(`Falha ao buscar dados históricos do USDT (CoinGecko): ${errorData.error || response.statusText}`);
    }
    const data = await response.json();
    if (data && data.prices) {
      return data.prices.map((item: [number, number]) => ({
        timestamp: item[0],
        price: item[1],
      }));
    }
    return null;
  } catch (error) {
    console.error("Error fetching USDT historical chart data from CoinGecko:", error);
    throw error;
  }
}

// Function to fetch historical data for a given SGS code
export const fetchHistoricalSgsData = async (
  sgsCode: string | number,
  startDate: string, // dd/MM/yyyy
  endDate: string    // dd/MM/yyyy
): Promise<Array<{ data: string; valor: string }>> => {
  // Basic validation for dates format
  const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    throw new Error("Formato de data inválido. Use dd/MM/yyyy.");
  }

  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${sgsCode}/dados?formato=json&dataInicial=${startDate}&dataFinal=${endDate}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Falha ao buscar dados históricos SGS ${sgsCode}: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Erro ao buscar dados para SGS ${sgsCode}:`, error);
    throw error;
  }
};

// Function to fetch historical PTAX data
export const fetchHistoricalPtAXData = async (
  startDate: string, // dd/MM/yyyy
  endDate: string    // dd/MM/yyyy
): Promise<Array<{ cotacaoVenda: number; dataHoraCotacao: string }>> => {
  const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    throw new Error("Formato de data inválido para PTAX. Use dd/MM/yyyy.");
  }
  // Convert dd/MM/yyyy to MM-dd-yyyy for PTAX API
  const convertDate = (dateStr: string) => {
    const [day, month, year] = dateStr.split('/');
    return `${month}-${day}-${year}`;
  };
  const apiStartDate = convertDate(startDate);
  const apiEndDate = convertDate(endDate);

  const url = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?@dataInicial='${apiStartDate}'&@dataFinalCotacao='${apiEndDate}'&$format=json&$select=cotacaoVenda,dataHoraCotacao&$orderby=dataHoraCotacao asc`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Falha ao buscar dados históricos PTAX: ${response.statusText}`);
    }
    const data = await response.json();
    return data.value || [];
  } catch (error) {
    console.error(`Erro ao buscar dados PTAX:`, error);
    throw error;
  }
};


// Function to fetch and calculate historical average for CDI or IPCA (monthly rates)
export const fetchAndCalculateHistoricalAverage = async (
  sgsCode: string, // e.g., '4391' for CDI monthly, '433' for IPCA monthly
  years: number
): Promise<DynamicHistoricalAverage> => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(endDate.getFullYear() - years);

  const formatDateForApi = (date: Date) => 
    `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;

  const apiStartDate = formatDateForApi(startDate);
  const apiEndDate = formatDateForApi(endDate);

  try {
    const rawData = await fetchHistoricalSgsData(sgsCode, apiStartDate, apiEndDate);
    if (!rawData || rawData.length === 0) {
      return { value: null, isLoading: false, error: "Nenhum dado histórico encontrado.", sourceDateRange: `${apiStartDate} - ${apiEndDate}` };
    }

    let productOfGrowthFactors = 1;
    let validMonthsCount = 0;

    for (const record of rawData) {
      const monthlyRate = parseFloat(record.valor.replace(',', '.'));
      if (!isNaN(monthlyRate)) {
        productOfGrowthFactors *= (1 + monthlyRate / 100);
        validMonthsCount++;
      }
    }
    
    if (validMonthsCount === 0) {
        return { value: null, isLoading: false, error: "Nenhum dado histórico válido encontrado para calcular a média.", sourceDateRange: `${apiStartDate} - ${apiEndDate}` };
    }

    // Geometric average monthly rate
    const averageMonthlyRateDecimal = Math.pow(productOfGrowthFactors, 1 / validMonthsCount) - 1;
    // Annualize the geometric average monthly rate
    const averageAnnualRatePercent = (Math.pow(1 + averageMonthlyRateDecimal, 12) - 1) * 100;
    
    const firstDataDate = rawData[0].data;
    const lastDataDate = rawData[rawData.length -1].data;


    return { 
        value: averageAnnualRatePercent, 
        isLoading: false, 
        error: null, 
        sourceDateRange: `${firstDataDate} - ${lastDataDate} (aprox. ${Math.round(validMonthsCount/12)} anos)` 
    };

  } catch (e: any) {
    console.error(`Error calculating historical average for SGS ${sgsCode}:`, e);
    return { value: null, isLoading: false, error: e.message || `Erro ao calcular média para SGS ${sgsCode}.`, sourceDateRange: `${apiStartDate} - ${apiEndDate}` };
  }
};