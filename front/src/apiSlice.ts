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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8989/';

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: API_URL }),
  endpoints: (builder) => ({
    getPrices: builder.query<PricePoint[], { start: string; period: string; resolution: string }>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        queryParams.append('start', params.start);
        queryParams.append('period', params.period);
        queryParams.append('resolution', params.resolution);
        return `prices?${queryParams.toString()}`;
      },
    }),
    getConsumption: builder.query<ConsumptionPoint[], { start: string; period: string; resolution: string }>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        queryParams.append('start', params.start);
        queryParams.append('period', params.period);
        queryParams.append('resolution', params.resolution);
        return `consumption?${queryParams.toString()}`;
      },
    }),
  }),
});

export const { useGetPricesQuery, useGetConsumptionQuery } = apiSlice;
