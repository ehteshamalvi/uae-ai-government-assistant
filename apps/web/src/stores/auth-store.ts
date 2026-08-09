import { create } from 'zustand';

interface AuthState {
  isAuthenticated: boolean;
  email: string | null;
  setSession: (email: string | null) => void;
  clearSession: () => void;
}

/** Placeholder auth store — real JWT wiring lands in a later phase. */
export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  email: null,
  setSession: (email) => set({ isAuthenticated: Boolean(email), email }),
  clearSession: () => set({ isAuthenticated: false, email: null }),
}));
