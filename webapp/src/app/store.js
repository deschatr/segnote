import { configureStore } from '@reduxjs/toolkit'

import appStateReducer from './appStateSlice'

export const store = configureStore({
  reducer: {
    appState    : appStateReducer
  }
})