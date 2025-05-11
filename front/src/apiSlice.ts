import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export interface PricePoint {
  time: string;
  domain: string;
  resolution: string;
  price: number;
}

export interface ConsumptionPoint {
  startTime: string;
  resolution: string;
  quantity: string;
}

export interface ContractPrice {
  pricingModel: "Spot" | "FixedPrice";
  centsPerKiwattHour: number;
  euroPerMonth: number;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8989/';

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: API_URL }),
  tagTypes: ['Consumption'],
  endpoints: (builder) => ({
    getPrices: builder.query<PricePoint[], { start: string; end: string; resolution: string; meteringPoint: string }>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        params?.start && queryParams.append('start', params.start);
        params?.end && queryParams.append('end', params.end);
        params?.resolution && queryParams.append('resolution', params.resolution);
        return `prices?${queryParams.toString()}`;
      }
    }),
    getConsumption: builder.query<ConsumptionPoint[], { start: string; end: string; resolution: string; meteringPoint: string }>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        params?.start && queryParams.append('start', params.start);
        params?.end && queryParams.append('end', params.end);
        params?.resolution && queryParams.append('resolution', params.resolution);
        params?.meteringPoint && queryParams.append('meteringPoint', params.meteringPoint);

        return `consumption?${queryParams.toString()}`;
      },
    }),
    getBestContracts: builder.query<ContractPrice[], { postalCode: number }>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        params?.postalCode && queryParams.append('postalCode', params.postalCode.toString());
        return `contracts/best?${queryParams.toString()}`
      }
    }),
    uploadConsumption: builder.mutation<{ message: string }, FormData>({
      query: (formData) => ({
        url: 'consumption/upload',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['Consumption'],
    }),
  }),
});

export const {
  useGetBestContractsQuery,
  useGetConsumptionQuery,
  useGetPricesQuery,
  useUploadConsumptionMutation,
} = apiSlice;
