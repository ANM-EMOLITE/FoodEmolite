export const URL_ENDPOINT = {
  LOGIN: 'login',
  REGISTER: 'register',
  SUCCESS: 'success',

  AGENT: 'agent',
  AGENT_PROFILE: 'profile',
  AGENT_FOODS: 'foods',
  AGENT_FOOD_CATEGORIES: 'categories',
  AGENT_ORDERS: 'orders',
  AGENT_ORDER_DETAIL: 'orders/:id',
  AGENT_PROMOTIONS: 'promotions',
  AGENT_REVENUE: 'revenue',
  AGENT_PRODUCT_REVENUE: 'product-revenue',
  AGENT_CUSTOMERS: 'customers',
  AGENT_ACTIVITY_LOGS: 'activity-logs',
  AGENT_SETTINGS: 'settings',
  AGENT_STORE: 'store',

  USER: 'user',
  USER_STORES: 'welcome',
  USER_STORE_FOODS: 'store-foods',
  USER_ORDER: 'order',
  USER_HISTORY: 'history'
} as const;