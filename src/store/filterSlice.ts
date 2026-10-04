import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface FilterState {
  searchQuery: string;
  city: string | null;
  priceMin: number;
  priceMax: number;
  bedrooms: number | null;
  bathrooms: number | null;
  amenities: string[];
  checkInDate: Date | null;
  checkOutDate: Date | null;
}

const initialState: FilterState = {
  searchQuery: "",
  city: null,
  priceMin: 0,
  priceMax: 10000,
  bedrooms: null,
  bathrooms: null,
  amenities: [],
  checkInDate: null,
  checkOutDate: null,
};

const filterSlice = createSlice({
  name: "filters",
  initialState,
  reducers: {
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setCity: (state, action: PayloadAction<string | null>) => {
      state.city = action.payload;
    },
    setPriceRange: (state, action: PayloadAction<{ min: number; max: number }>) => {
      state.priceMin = action.payload.min;
      state.priceMax = action.payload.max;
    },
    setBedrooms: (state, action: PayloadAction<number | null>) => {
      state.bedrooms = action.payload;
    },
    setBathrooms: (state, action: PayloadAction<number | null>) => {
      state.bathrooms = action.payload;
    },
    setAmenities: (state, action: PayloadAction<string[]>) => {
      state.amenities = action.payload;
    },
    setDateRange: (
      state,
      action: PayloadAction<{ checkIn: Date | null; checkOut: Date | null }>
    ) => {
      state.checkInDate = action.payload.checkIn;
      state.checkOutDate = action.payload.checkOut;
    },
    clearFilters: (state) => {
      return initialState;
    },
  },
});

export const {
  setSearchQuery,
  setCity,
  setPriceRange,
  setBedrooms,
  setBathrooms,
  setAmenities,
  setDateRange,
  clearFilters,
} = filterSlice.actions;

export default filterSlice.reducer;
