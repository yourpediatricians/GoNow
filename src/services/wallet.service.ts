import api from './api';

export const walletService = {
  getBalance: async () => {
    const { data } = await api.get('/wallet/balance');
    return data; // { balance, totalEarned, totalSpent }
  },

  getTransactions: async (page = 1, limit = 20, type?: 'credit' | 'debit') => {
    const { data } = await api.get('/wallet/transactions', {
      params: { page, limit, type },
    });
    return data; // { balance, transactions[], pagination }
  },

  addMoney: async (amount: number) => {
    const { data } = await api.post('/wallet/add-money', { amount });
    return data; // { message, newBalance }
  },

  withdraw: async (amount: number) => {
    const { data } = await api.post('/wallet/withdraw', { amount });
    return data; // { message, newBalance }
  },
};
