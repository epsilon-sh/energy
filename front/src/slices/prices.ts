import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface PricePoint {
  time: string;
  domain: string;
  resolution: string;
  price: number;
}

interface PricesState {
  data: PricePoint[];
  loading: boolean;
  error: string | null;
}

const initialState: PricesState = {
  data: [],
  loading: false,
  error: null,
};

const pricesSlice = createSlice({
  name: "prices",
  initialState,
  reducers: {
    fetchPricesStart(state) {
      state.loading = true;
      state.error = null;
    },
    fetchPricesSuccess(state, action: PayloadAction<PricePoint[]>) {
      state.data = action.payload;
      state.loading = false;
    },
    fetchPricesFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const { fetchPricesStart, fetchPricesSuccess, fetchPricesFailure } = pricesSlice.actions;
export default pricesSlice.reducer;

