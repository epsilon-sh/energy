import { useGetPricesQuery, useGetConsumptionQuery } from './apiSlice';
import { Duration } from './types/duration';

interface EnergyDataParams {
  start?: string;
  end?: string;
  period?: Duration;
  resolution?: Duration;
  meteringPoint?: string;
}

export const useEnergyData = (params?: EnergyDataParams) => {
  const prices = useGetPricesQuery(params);
  const consumption = useGetConsumptionQuery(params);

  return { prices, consumption };
};
