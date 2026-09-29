import { Routes } from '@angular/router';
import { URL_ENDPOINT } from './common/constants/url-endpoint';
import { roleRedirectGuard } from './common/guard/role-redirect.guard';


export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [roleRedirectGuard],
    children: []
  },
  {
    path: URL_ENDPOINT.LOGIN,
    loadComponent: () => import('./pages/page-login/login/login').then(m => m.PageLoginComponent)
  },
  {
    path: URL_ENDPOINT.REGISTER,
    loadComponent: () => import('./pages/page-login/register/register').then(m => m.PageRegisterComponent)
  },
  {
    path: URL_ENDPOINT.SUCCESS,
    loadComponent: () => import('./pages/page-user/order-success/order-success').then(m => m.PageOrderSuccessComponent)
  },

  {
    path: URL_ENDPOINT.AGENT,
    loadComponent: () => import('./layouts/layout-agent/layout-agent').then(m => m.LayoutAgentComponent),
    children: [
      {
        path: '',
        redirectTo: URL_ENDPOINT.AGENT_PROFILE,
        pathMatch: 'full'
      },
      {
        path: URL_ENDPOINT.AGENT_PROFILE,
        loadComponent: () => import('./pages/page-agent/agent-info/agent-info').then(m => m.PageAgentInfoComponent),
        data: {
          title: 'Thông tin'
        }
      },
      {
        path: URL_ENDPOINT.AGENT_FOOD_CATEGORIES,
        loadComponent: () => import('./pages/page-agent/agent-food-categories/agent-food-categories').then(m => m.PageAgentFoodCategoriesComponent),
        data: {
          title: 'Danh sách danh mục'
        }
      },
      {
        path: URL_ENDPOINT.AGENT_FOODS,
        loadComponent: () => import('./pages/page-agent/agent-foods/agent-foods').then(m => m.PageAgentFoodsComponent),
        data: {
          title: 'Danh sách món ăn'
        }
      },
      {
        path: URL_ENDPOINT.AGENT_ORDERS,
        loadComponent: () => import('./pages/page-agent/agent-orders/agent-orders').then(m => m.PageAgentOrdersComponent),
        data: {
          title: 'Danh sách đơn hàng'
        }
      },
      {
        path: URL_ENDPOINT.AGENT_ORDER_DETAIL,
        loadComponent: () => import('./pages/page-agent/agent-orders/agent-order-detail/agent-order-detail').then(m => m.PageAgentOrderDetailComponent),
        data: {
          title: 'Chi tiết đơn hàng'
        }
      },
      {
        path: URL_ENDPOINT.AGENT_PROMOTIONS,
        loadComponent: () => import('./pages/page-agent/agent-promotions/agent-promotions').then(m => m.PageAgentPromotionsComponent),
        data: {
          title: 'Chương trình khuyến mãi'
        }
      },
      {
        path: URL_ENDPOINT.AGENT_PROMOTION_CREATE,
        loadComponent: () => import('./pages/page-agent/agent-promotions/agent-promotion-form/agent-promotion-form').then(m => m.PageAgentPromotionFormComponent),
        data: {
          title: 'Tạo khuyến mãi'
        }
      },
      {
        path: URL_ENDPOINT.AGENT_PROMOTION_EDIT,
        loadComponent: () => import('./pages/page-agent/agent-promotions/agent-promotion-form/agent-promotion-form').then(m => m.PageAgentPromotionFormComponent),
        data: {
          title: 'Chỉnh sửa khuyến mãi'
        }
      },
      {
        path: URL_ENDPOINT.AGENT_REVENUE,
        loadComponent: () => import('./pages/page-agent/agent-revenue/agent-revenue').then(m => m.AgentRevenueComponent),
        data: {
          title: 'Thống kê'
        }
      },
      {
        path: URL_ENDPOINT.AGENT_PRODUCT_REVENUE,
        loadComponent: () => import('./pages/page-agent/agent-product-revenue/agent-product-revenue').then(m => m.AgentProductRevenueComponent),
        data: {
          title: 'Doanh thu sản phẩm'
        }
      },
      {
        path: URL_ENDPOINT.AGENT_CUSTOMERS,
        loadComponent: () => import('./pages/page-agent/agent-customers/agent-customers').then(m => m.PageAgentCustomersComponent),
        data: {
          title: 'Danh sách khách hàng'
        }
      },
      {
        path: URL_ENDPOINT.AGENT_ACTIVITY_LOGS,
        loadComponent: () => import('./pages/page-agent/agent-activity-logs/agent-activity-logs').then(m => m.PageAgentActivityLogsComponent),
        data: {
          title: 'Lịch sử hoạt động'
        }
      },
      {
        path: URL_ENDPOINT.AGENT_NOTIFICATIONS,
        loadComponent: () => import('./pages/page-agent/agent-notifications/agent-notifications').then(m => m.PageAgentNotificationsComponent),
        data: {
          title: 'Thông báo'
        }
      },
      {
        path: URL_ENDPOINT.AGENT_SETTINGS,
        loadComponent: () => import('./pages/page-agent/agent-settings/agent-settings').then(m => m.PageAgentSettingsComponent),
        data: {
          title: 'Cài đặt'
        }
      },
      {
        path: URL_ENDPOINT.AGENT_STORE,
        loadComponent: () => import('./pages/page-agent/agent-store-info/agent-store-info').then(m => m.PageAgentStoreInfoComponent),
        data: {
          title: 'Thông tin cửa hàng'
        }
      },
    ]
  },

  {
    path: URL_ENDPOINT.POS,
    loadComponent: () => import('./layouts/layout-pos/layout-pos').then(m => m.LayoutPosComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/page-user/user-store-foods/user-store-foods').then(m => m.PageUserStoreFoodsComponent),
        data: {
          title: 'Bán hàng tại quầy',
          // Đơn tại quầy — không cần địa chỉ giao hàng
          isPos: true
        }
      }
    ]
  },

  {
    path: URL_ENDPOINT.USER,
    loadComponent: () => import('./layouts/layout-user/layout-user').then(m => m.LayoutUserComponent),
    children: [
      {
        path: '',
        redirectTo: URL_ENDPOINT.USER_STORES,
        pathMatch: 'full'
      },
      {
        path: URL_ENDPOINT.USER_STORES,
        loadComponent: () => import('./pages/page-user/user-stores/user-stores').then(m => m.PageUserStoresComponent),
        data: {
          title: 'Danh sách cửa hàng'
        }
      },
      {
        path: `${URL_ENDPOINT.USER_STORE_FOODS}/${URL_ENDPOINT.USER_ORDER}`,
        loadComponent: () => import('./pages/page-user/user-store-foods/user-store-foods').then(m => m.PageUserStoreFoodsComponent)
      },
      {
        path: URL_ENDPOINT.USER_HISTORY,
        loadComponent: () => import('./pages/page-user/user-histories/user-histories').then(m => m.PageUserOrderHistoryComponent),
        data: {
          title: 'Lịch sử'
        }
      },
      {
        path: URL_ENDPOINT.USER_DELIVERY_INFO,
        loadComponent: () => import('./pages/page-user/user-delivery-info/user-delivery-info').then(m => m.PageUserDeliveryInfoComponent),
        data: {
          title: 'Thông tin nhận hàng'
        }
      }
    ]
  }
];
