import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  hospitals: [],
  selectedHospital: null,
  loading: false,
  error: null,
};

const hospitalSlice = createSlice({
  name: 'hospital',
  initialState,
  reducers: {
    setHospitals: (state, action) => {
      state.hospitals = action.payload;
      state.loading = false;
      state.error = null;
    },
    setSelectedHospital: (state, action) => {
      state.selectedHospital = action.payload;
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
    addHospital: (state, action) => {
      state.hospitals.push(action.payload);
      state.loading = false;
      state.error = null;
    },
    updateHospital: (state, action) => {
      const index = state.hospitals.findIndex(hospital => hospital._id === action.payload._id);
      if (index !== -1) {
        state.hospitals[index] = action.payload;
      }
      state.loading = false;
      state.error = null;
    },
    deleteHospital: (state, action) => {
      state.hospitals = state.hospitals.filter(hospital => hospital._id !== action.payload);
      state.loading = false;
      state.error = null;
    },
    clearHospitalState: (state) => {
      state.hospitals = [];
      state.selectedHospital = null;
      state.loading = false;
      state.error = null;
    },
  },
});

export const {
  setHospitals,
  setSelectedHospital,
  setLoading,
  setError,
  addHospital,
  updateHospital,
  deleteHospital,
  clearHospitalState,
} = hospitalSlice.actions;

const hospitalReducer = hospitalSlice.reducer;
export default hospitalReducer; 