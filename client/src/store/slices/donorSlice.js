import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  donors: [],
  selectedDonor: null,
  loading: false,
  error: null,
};

const donorSlice = createSlice({
  name: 'donor',
  initialState,
  reducers: {
    setDonors: (state, action) => {
      state.donors = action.payload;
      state.loading = false;
      state.error = null;
    },
    setSelectedDonor: (state, action) => {
      state.selectedDonor = action.payload;
      state.loading = false;
      state.error = null;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    addDonor: (state, action) => {
      state.donors.push(action.payload);
      state.loading = false;
      state.error = null;
    },
    updateDonor: (state, action) => {
      const index = state.donors.findIndex(donor => donor._id === action.payload._id);
      if (index !== -1) {
        state.donors[index] = action.payload;
      }
      state.loading = false;
      state.error = null;
    },
    deleteDonor: (state, action) => {
      state.donors = state.donors.filter(donor => donor._id !== action.payload);
      state.loading = false;
      state.error = null;
    },
    clearDonorState: (state) => {
      state.donors = [];
      state.selectedDonor = null;
      state.loading = false;
      state.error = null;
    },
  },
});

export const {
  setDonors,
  setSelectedDonor,
  setLoading,
  setError,
  addDonor,
  updateDonor,
  deleteDonor,
  clearDonorState,
} = donorSlice.actions;

export default donorSlice.reducer; 