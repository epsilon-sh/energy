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
  tagTypes: ['Consumption'],
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
        queryParams.append('meteringPoint', params.meteringPoint || 'TEST_METERINGPOINT')

        return `consumption?${queryParams.toString()}`;
      },
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

export const { useGetPricesQuery, useGetConsumptionQuery, useUploadConsumptionMutation } = apiSlice;
