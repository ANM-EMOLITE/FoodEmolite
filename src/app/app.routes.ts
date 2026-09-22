import { Routes } from '@angular/router';
import { URL_ENDPOINT } from './common/constants/url-endpoint';
import { roleRedirectGuard } from './common/guard/role-redirect.guard';

import { PageLoginComponent } from './pages/page-login/login/login';
import { PageRegisterComponent } from './pages/page-login/register/register';
import { LayoutAgentComponent } from './layouts/layout-agent/layout-agent';
import { PageAgentInfoComponent } from './pages/page-agent/agent-info/agent-info';
import { PageAgentFoodsComponent } from './pages/page-agent/agent-foods/agent-foods';
import { LayoutUserComponent } from './layouts/layout-user/layout-user';
import { PageUserStoresComponent } from './pages/page-user/user-stores/user-stores';
import { PageUserStoreFoodsComponent } from './pages/page-user/user-store-foods/user-store-foods';
import { PageUserOrderHistoryComponent } from './pages/page-user/user-histories/user-histories';
import { PageAgentOrdersComponent } from './pages/page-agent/agent-orders/agent-orders';
import { PageAgentOrderDetailComponent } from './pages/page-agent/agent-orders/agent-order-detail/agent-order-detail';
import { AgentRevenueComponent } from './pages/page-agent/agent-revenue/agent-revenue';
import { PageOrderSuccessComponent } from './pages/page-user/order-success/order-success';
import { PageAgentFoodCategoriesComponent } from './pages/page-agent/agent-food-categories/agent-food-categories';
import { PageAgentPromotionsComponent } from './pages/page-agent/agent-promotions/agent-promotions';
import { AgentProductRevenueComponent } from './pages/page-agent/agent-product-revenue/agent-product-revenue';
import { PageAgentCustomersComponent } from './pages/page-agent/agent-customers/agent-customers';
import { PageAgentActivityLogsComponent } from './pages/page-agent/agent-activity-logs/agent-activity-logs';
import { PageAgentSettingsComponent } from './pages/page-agent/agent-settings/agent-settings';
import { PageAgentStoreInfoComponent } from './pages/page-agent/agent-store-info/agent-store-info';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [roleRedirectGuard],
    children: []
  },
  {
    path: URL_ENDPOINT.LOGIN,
    component: PageLoginComponent
  },
  {
    path: URL_ENDPOINT.REGISTER,
    component: PageRegisterComponent
  },
  {
    path: URL_ENDPOINT.SUCCESS,
    component: PageOrderSuccessComponent
  },

  {
    path: URL_ENDPOINT.AGENT,
    component: LayoutAgentComponent,
    children: [
      {
        path: '',
        redirectTo: URL_ENDPOINT.AGENT_PROFILE,
        pathMatch: 'full'
      },
      {
        path: URL_ENDPOINT.AGENT_PROFILE,
        component: PageAgentInfoComponent,
        data: {
          title: 'Thông tin'
        }
      },
      {
        path: URL_ENDPOINT.AGENT_FOOD_CATEGORIES,
        component: PageAgentFoodCategoriesComponent,
        data: {
          title: 'Danh sách danh mục'
        }
      },
      {
        path: URL_ENDPOINT.AGENT_FOODS,
        component: PageAgentFoodsComponent,
        data: {
          title: 'Danh sách món ăn'
        }
      },
      {
        path: URL_ENDPOINT.AGENT_ORDERS,
        component: PageAgentOrdersComponent,
        data: {
          title: 'Danh sách đơn hàng'
        }
      },
      {
        path: URL_ENDPOINT.AGENT_ORDER_DETAIL,
        component: PageAgentOrderDetailComponent,
        data: {
          title: 'Chi tiết đơn hàng'
        }
      },
      {
        path: URL_ENDPOINT.AGENT_PROMOTIONS,
        component: PageAgentPromotionsComponent,
        data: {
          title: 'Chương trình khuyến mãi'
        }
      },
      {
        path: URL_ENDPOINT.AGENT_REVENUE,
        component: AgentRevenueComponent,
        data: {
          title: 'Thống kê'
        }
      },
      {
        path: URL_ENDPOINT.AGENT_PRODUCT_REVENUE,
        component: AgentProductRevenueComponent,
        data: {
          title: 'Doanh thu sản phẩm'
        }
      },
      {
        path: URL_ENDPOINT.AGENT_CUSTOMERS,
        component: PageAgentCustomersComponent,
        data: {
          title: 'Danh sách khách hàng'
        }
      },
      {
        path: URL_ENDPOINT.AGENT_ACTIVITY_LOGS,
        component: PageAgentActivityLogsComponent,
        data: {
          title: 'Lịch sử hoạt động'
        }
      },
      {
        path: URL_ENDPOINT.AGENT_SETTINGS,
        component: PageAgentSettingsComponent,
        data: {
          title: 'Cài đặt'
        }
      },
      {
        path: URL_ENDPOINT.AGENT_STORE,
        component: PageAgentStoreInfoComponent,
        data: {
          title: 'Thông tin cửa hàng'
        }
      },
    ]
  },

  {
    path: URL_ENDPOINT.USER,
    component: LayoutUserComponent,
    children: [
      {
        path: '',
        redirectTo: URL_ENDPOINT.USER_STORES,
        pathMatch: 'full'
      },
      {
        path: URL_ENDPOINT.USER_STORES,
        component: PageUserStoresComponent,
        data: {
          title: 'Danh sách cửa hàng'
        }
      },
      {
        path: `${URL_ENDPOINT.USER_STORE_FOODS}/${URL_ENDPOINT.USER_ORDER}`,
        component: PageUserStoreFoodsComponent
      },
      {
        path: URL_ENDPOINT.USER_HISTORY,
        component: PageUserOrderHistoryComponent,
        data: {
          title: 'Lịch sử'
        }
      }
    ]
  }
];
