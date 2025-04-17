import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import donorReducer from './slices/donorSlice';
import hospitalReducer from './slices/hospitalSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    donor: donorReducer,
    hospital: hospitalReducer,
  },
}); 