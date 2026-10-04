import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface FavoritesState {
  apartmentIds: string[];
}

const initialState: FavoritesState = {
  apartmentIds: [],
};

const favoritesSlice = createSlice({
  name: 'favorites',
  initialState,
  reducers: {
    setFavorites: (state, action: PayloadAction<string[]>) => {
      state.apartmentIds = action.payload;
    },
    addFavorite: (state, action: PayloadAction<string>) => {
      if (!state.apartmentIds.includes(action.payload)) {
        state.apartmentIds.push(action.payload);
      }
    },
    removeFavorite: (state, action: PayloadAction<string>) => {
      state.apartmentIds = state.apartmentIds.filter(id => id !== action.payload);
    },
  },
});

export const { setFavorites, addFavorite, removeFavorite } = favoritesSlice.actions;
export default favoritesSlice.reducer;
