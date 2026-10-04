import { configureStore } from '@reduxjs/toolkit';
import favoritesReducer from './favoritesSlice';
import filterReducer from './filterSlice';

export const store = configureStore({
  reducer: {
    favorites: favoritesReducer,
    filters: filterReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
