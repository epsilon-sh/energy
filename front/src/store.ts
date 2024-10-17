import {
    combineReducers,
    configureStore,
} from '@reduxjs/toolkit'

import prices, {
    actions as pricesActions,
    reducer as pricesReducer,
} from './slices/pricesSlice.ts'

export const actions = {
    prices: pricesActions,
}

const store = configureStore({
    reducer: combineReducers({
        prices: pricesReducer,
    })
})

console.log(store.getState())

const slices = {
    prices,
}

export {
    store as default,
    store, prices,
    slices
}
