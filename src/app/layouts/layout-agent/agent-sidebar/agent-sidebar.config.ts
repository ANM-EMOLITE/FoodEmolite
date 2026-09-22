import { URL_ENDPOINT } from '../../../common/constants/url-endpoint';
export interface AgentNavIconShape {
  d?: string;
  cx?: number;
  cy?: number;
  r?: number;
  solid?: boolean;
}

export interface AgentNavItem {
  label: string;
  path: string;
  icon: AgentNavIconShape[];
}

export interface AgentNavGroup {
  title: string;
  items: AgentNavItem[];
}

export const AGENT_NAV_GROUPS: AgentNavGroup[] = [
  {
    title: 'Thông Tin Chung',
    items: [
      {
        label: 'Thông Tin',
        path: URL_ENDPOINT.AGENT_PROFILE,
        icon: [
          { d: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2' },
          { cx: 12, cy: 7, r: 4 }
        ]
      },
      {
        label: 'Thông Tin Cửa Hàng',
        path: URL_ENDPOINT.AGENT_STORE,
        icon: [
          { d: 'M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20' },
          { d: 'M9 7h6' },
          { d: 'M9 11h6' }
        ]
      }
    ]
  },
  {
    title: 'Sản Phẩm & Danh Mục',
    items: [
      {
        label: 'Danh Mục',
        path: URL_ENDPOINT.AGENT_FOOD_CATEGORIES,
        icon: [
          { d: 'M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20' },
          { d: 'M9 10h6' }
        ]
      },
      {
        label: 'Sản Phẩm',
        path: URL_ENDPOINT.AGENT_FOODS,
        icon: [
          { d: 'M15 21v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5' },
          { d: 'M17.774 10.31a1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.451 0 1.12 1.12 0 0 0-1.548 0 2.5 2.5 0 0 1-3.452 0 1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.77-3.248l2.889-4.184A2 2 0 0 1 7 2h10a2 2 0 0 1 1.653.873l2.895 4.192a2.5 2.5 0 0 1-3.774 3.244' },
          { d: 'M4 10.95V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8.05' }
        ]
      },
    ]
  },
  {
    title: 'Quản Lý',
    items: [
      {
        label: 'Đơn Hàng',
        path: URL_ENDPOINT.AGENT_ORDERS,
        icon: [
          { d: 'M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z' },
          { d: 'M12 22V12' },
          { d: 'M3.29 7 12 12l8.71-5' },
          { d: 'm7.5 4.27 9 5.15' }
        ]
      },
      {
        label: 'Khuyến Mãi',
        path: URL_ENDPOINT.AGENT_PROMOTIONS,
        icon: [
          { d: 'M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z' },
          { cx: 7.5, cy: 7.5, r: 1.5, solid: true }
        ]
      },
      {
        label: 'Khách Hàng',
        path: URL_ENDPOINT.AGENT_CUSTOMERS,
        icon: [
          { d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' },
          { d: 'M16 3.128a4 4 0 0 1 0 7.744' },
          { d: 'M22 21v-2a4 4 0 0 0-3-3.87' },
          { cx: 9, cy: 7, r: 4 }
        ]
      }
    ]
  },
  {
    title: 'Thống kê & Báo cáo',
    items: [
      {
        label: 'Thống Kê',
        path: URL_ENDPOINT.AGENT_REVENUE,
        icon: [
          { cx: 12, cy: 12, r: 10 },
          { d: 'M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8' },
          { d: 'M12 18V6' }
        ]
      },
      {
        label: 'Báo cáo',
        path: URL_ENDPOINT.AGENT_PRODUCT_REVENUE,
        icon: [
          { d: 'M18 20V10' },
          { d: 'M12 20V4' },
          { d: 'M6 20v-6' }
        ]
      }
    ]
  },
  {
    title: 'Quyền riêng tư',
    items: [
      {
        label: 'Lịch Sử Hoạt Động',
        path: URL_ENDPOINT.AGENT_ACTIVITY_LOGS,
        icon: [
          { d: 'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8' },
          { d: 'M3 3v5h5' },
          { d: 'M12 7v5l4 2' }
        ]
      },
      {
        label: 'Cài Đặt',
        path: URL_ENDPOINT.AGENT_SETTINGS,
        icon: [
          { d: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z' },
          { cx: 12, cy: 12, r: 3 }
        ]
      }
    ]
  }
];
