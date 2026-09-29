export const URL_ENDPOINT = {
  LOGIN: 'login',
  REGISTER: 'register',
  SUCCESS: 'success',

  AGENT: 'agent',
  /** Bán hàng tại quầy: chủ cửa hàng dùng trang đặt món của khách, nhưng giữ topbar của agent. */
  POS: 'pos',
  AGENT_PROFILE: 'profile',
  AGENT_FOODS: 'foods',
  AGENT_FOOD_CATEGORIES: 'categories',
  AGENT_ORDERS: 'orders',
  AGENT_ORDER_DETAIL: 'orders/:id',
  AGENT_PROMOTIONS: 'promotions',
  AGENT_PROMOTION_CREATE: 'promotions/new',
  AGENT_PROMOTION_EDIT: 'promotions/:id/edit',
  AGENT_REVENUE: 'revenue',
  AGENT_PRODUCT_REVENUE: 'product-revenue',
  AGENT_CUSTOMERS: 'customers',
  AGENT_ACTIVITY_LOGS: 'activity-logs',
  AGENT_NOTIFICATIONS: 'notifications',
  AGENT_SETTINGS: 'settings',
  AGENT_STORE: 'store',

  USER: 'user',
  USER_STORES: 'welcome',
  USER_STORE_FOODS: 'store-foods',
  USER_ORDER: 'order',
  USER_HISTORY: 'history',
  /** Thông tin nhận hàng (tên, SĐT, địa chỉ, ghim bản đồ) — mở từ icon trên topbar user. */
  USER_DELIVERY_INFO: 'delivery-info'
} as const;