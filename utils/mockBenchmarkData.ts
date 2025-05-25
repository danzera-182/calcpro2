import { BenchmarkDataPoint } from '../types';

// IMPORTANT: This is REAL HISTORICAL data, but it's STATIC.
// It will not update automatically. For illustrative and comparative purposes.
// Rates are annual (e.g., 0.05 means 5% return for the year).
// Data is ordered from most recent (year: 1, i.e., "1 year ago" - 2023) to oldest (year: 15 - 2009).

export const HISTORICAL_BENCHMARK_DATA: BenchmarkDataPoint[] = [
  { year: 1,  ipcaRate: 0.0462, ibovespaRate:  0.2228, cdiRate: 0.1304 }, // 2023
  { year: 2,  ipcaRate: 0.0579, ibovespaRate:  0.0469, cdiRate: 0.1239 }, // 2022
  { year: 3,  ipcaRate: 0.1006, ibovespaRate: -0.1193, cdiRate: 0.0442 }, // 2021
  { year: 4,  ipcaRate: 0.0452, ibovespaRate:  0.0292, cdiRate: 0.0276 }, // 2020
  { year: 5,  ipcaRate: 0.0431, ibovespaRate:  0.3158, cdiRate: 0.0596 }, // 2019
  { year: 6,  ipcaRate: 0.0375, ibovespaRate:  0.1503, cdiRate: 0.0642 }, // 2018
  { year: 7,  ipcaRate: 0.0295, ibovespaRate:  0.2686, cdiRate: 0.0993 }, // 2017
  { year: 8,  ipcaRate: 0.0629, ibovespaRate:  0.3894, cdiRate: 0.1388 }, // 2016
  { year: 9,  ipcaRate: 0.1067, ibovespaRate: -0.1331, cdiRate: 0.1324 }, // 2015
  { year: 10, ipcaRate: 0.0641, ibovespaRate: -0.0291, cdiRate: 0.1081 }, // 2014
  { year: 11, ipcaRate: 0.0591, ibovespaRate: -0.1550, cdiRate: 0.0808 }, // 2013
  { year: 12, ipcaRate: 0.0584, ibovespaRate:  0.0740, cdiRate: 0.0835 }, // 2012
  { year: 13, ipcaRate: 0.0650, ibovespaRate: -0.1811, cdiRate: 0.1168 }, // 2011
  { year: 14, ipcaRate: 0.0591, ibovespaRate:  0.0104, cdiRate: 0.0981 }, // 2010
  { year: 15, ipcaRate: 0.0431, ibovespaRate:  0.8266, cdiRate: 0.0988 }, // 2009
];

export const MAX_HISTORICAL_DATA_YEARS = HISTORICAL_BENCHMARK_DATA.length;
