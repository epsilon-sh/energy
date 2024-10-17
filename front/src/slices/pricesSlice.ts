import {
    createSlice,
    PayloadAction,
} from '@reduxjs/toolkit'

import pricesData, {
    PriceSeries,
    PricePoint
} from '../types/Prices.ts'

const initialState = pricesData as PriceSeries

// Stub state stuff
const slice = createSlice({
    name: 'prices',
    initialState,
    reducers: {
        reset: _ => initialState,
        add: (state, action: PayloadAction<PricePoint>) =>
            state.concat(action.payload),
    },
    selectors: {
        all: state => state,
    }
})

const actions = slice.actions
const reducer = slice.reducer


export {
    slice as default,
    actions, reducer,
    type PriceSeries,
    type PricePoint,
}
