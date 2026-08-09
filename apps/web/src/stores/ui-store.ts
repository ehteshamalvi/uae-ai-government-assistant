import { create } from 'zustand';
import { DEMO_TRANSACTION_ID } from '@/types';

interface ActiveTransactionState {
  activeTransactionId: string | null;
  setActiveTransactionId: (id: string | null) => void;
}

export const useActiveTransactionStore = create<ActiveTransactionState>((set) => ({
  activeTransactionId: DEMO_TRANSACTION_ID,
  setActiveTransactionId: (id) => set({ activeTransactionId: id }),
}));
