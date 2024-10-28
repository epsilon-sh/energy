import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface ConsumptionPoint {
  time: string;
  domain: string;
  resolution: string;
  consumption: number;
}

interface ConsumptionState {
  data: ConsumptionPoint[];
  loading: boolean;
  error: string | null;
}

const initialState: ConsumptionState = {
  data: [],
  loading: false,
  error: null,
}

const consumptionSlice = createSlice({
  name: 'consumption',
  initialState,
  reducers: {
    fetchConsumptionStart(state) {
      state.loading = true;
      state.error = null;
    },
    fetchConsumptionSuccess(state, action: PayloadAction<ConsumptionPoint[]>) {
      state.data = action.payload;
      state.loading = false;
    },
    fetchConsumptionFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
  },
})

export const { fetchConsumptionStart, fetchConsumptionSuccess, fetchConsumptionFailure } = consumptionSlice.actions;
export default consumptionSlice.reducer;
