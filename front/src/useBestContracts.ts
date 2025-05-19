import { useGetBestContractsQuery } from './apiSlice';
import { Duration } from './types/duration';

interface BestContractsParams {
  start?: string;
  end?: string;
  period?: Duration;
  resolution?: Duration;

  consumption: string; // will cast to number at backend
  postalCode: string;
}

export interface Contract {
  TargetGroup: 'Household' | 'Company' | 'Both';
  PricingModel: "Spot" | "FixedPrice";
  annualizedCost: {
    total: number;
  };
  instantPricing: {
    CentPerKiwattHour: number;
    EurPerMonth: number;
  };
}

export interface BestContractsApiResponseMeta {
  postalCode: string;
  consumption: string;
}

export interface BestContractsApiResponseData {
  Spot: Contract;
  FixedPrice: Contract;
}

export interface BestContractsApiResponse {
  meta: BestContractsApiResponseMeta;
  data: BestContractsApiResponseData;
}

export const useBestContracts = (params: BestContractsParams) => {
  const bestContracts = useGetBestContractsQuery({ postalCode: params.postalCode, consumption: params.consumption });

  return { bestContracts };
};
