export const API_ENDPOINT = {
  AUTH: {
    LOGIN: 'auth/login',
    REGISTER: 'auth/register',
    VERIFY: 'auth/verify',
    CHECK_EMAIL: 'auth/check-email',
    CHANGE_PASSWORD: 'auth/change-password'
  },
  STORE: {
    BASE: 'stores',
    BY_REF: (refCode: string) => `stores/ref/${refCode}`
  },
  STORE_FOOD: {
    BASE: 'store-foods',
    DETAIL: (id: number) => `store-foods/${id}`,
    BY_STORE:`store-foods/store`
  },
  STORE_FOOD_CATEGORY: {
    BASE: 'store-food-categories',
    DETAIL: (id: number) => `store-food-categories/${id}`,
    SEARCH: 'store-food-categories/search',
    BY_STORE: `store-food-categories/get`
  },
  PROFILE: {
    LIST_ACC: 'profile/accounts-users',
    LIST_ACC_AGENTS: 'profile/accounts-agents',
    ME: 'profile/me',
    GUEST_PROFILE: 'profile/guest-profile',
    ACCOUNT_PROFILE: 'profile/account-profile',
    BANK_ACCOUNTS: 'profile/bank-accounts',
    STORE_PAYMENT: (orderCode: string) => `profile/store-payment/${encodeURIComponent(orderCode)}`
  },
  ORDER: {
    BASE: 'orders',
    GUEST: 'orders/guest',
    MY: 'orders/my',
    DETAIL: (id: number) => `orders/${id}`,
    STORE_DETAIL: (id: number) => `orders/${id}/store`,
    STATUS: (id: number) => `orders/${id}/status`,
    STATUS_PAYMENT: (id: number) => `orders/${id}/payment-status`,
    ORDER_CANCEL: (id: number) => `orders/${id}/cancel`,
    BY_STORE: 'orders/store/search',
    PAYMENT_STATUS: (orderCode: string) => `orders/${orderCode}/payment-status`,
    PENDING_ORDER: 'orders/pending-order'
  },
  CUSTOMER: {
    AGENT_SEARCH: 'customers/agent/search',
    AGENT_DETAIL: (refCode: string) => `customers/agent/${refCode}`
  },
  STORE_NOTIFICATION: {
    BASE: 'store-notifications',
    READ: (id: number) => `store-notifications/${id}/read`,
    READ_ALL: 'store-notifications/read-all'
  },
  ACTIVITY_LOG: {
    STORE_SEARCH: 'activity-logs/store/search'
  },
  INVENTORY: {
    TRANSACTIONS_SEARCH: 'inventory/transactions/search',
    RECEIPTS: 'inventory/receipts',
    RECEIPTS_SEARCH: 'inventory/receipts/search',
    RECEIPT_DETAIL: (id: number) => `inventory/receipts/${id}`,
    STOCKTAKES: 'inventory/stocktakes',
    STOCKTAKES_SEARCH: 'inventory/stocktakes/search',
    STOCKTAKE_DETAIL: (id: number) => `inventory/stocktakes/${id}`
  },
  SUPPLIER: {
    BASE: 'suppliers',
    SEARCH: 'suppliers/search',
    DETAIL: (id: number) => `suppliers/${id}`
  },
  REVENUE: {
    AGENT: 'revenue/agent',
    AGENT_TOP_PRODUCTS: 'revenue/agent/top-products',
    AGENT_PRODUCTS_SEARCH: 'revenue/agent/products/search'
  },
  PROMOTION: {
    BASE: 'promotions',
    SEARCH: 'promotions/search',
    DETAIL: (id: number) => `promotions/${id}`,
    STATS: (id: number) => `promotions/${id}/stats`,
    PAUSE: (id: number) => `promotions/${id}/pause`,
    RESUME: (id: number) => `promotions/${id}/resume`,
    CANCEL: (id: number) => `promotions/${id}/cancel`,
    ACTIVE_BY_STORE: (storeRefCode: string) => `promotions/store/${storeRefCode}/active`,
    STORE_WIDE_DISCOUNT_ELIGIBILITY: (storeRefCode: string) => `promotions/store/${storeRefCode}/store-wide-discount-eligibility`
  }
} as const;