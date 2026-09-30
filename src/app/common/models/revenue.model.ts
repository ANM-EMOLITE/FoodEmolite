export type RevenueGroupBy = 'day' | 'month';

export interface RevenueQuery {
  fromDate?: string | null;
  toDate?: string | null;
  groupBy?: RevenueGroupBy;
}

export interface RevenueLineChartItem {
  label: string;
  revenue: number;
  cost: number;
  profit: number;
  orderCount: number;
}

export interface RevenuePieChartItem {
  label: string;
  value: number;
}

export interface AgentRevenueResponse {
  totalOrders: number;
  totalCancelledOrders: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  lineChart: RevenueLineChartItem[];
  pieChart: RevenuePieChartItem[];
}

export interface TopSellingProduct {
  storeFoodId: number;
  foodName: string;
  thumbnailUrl: string | null;
  quantitySold: number;
  revenue: number;
  cost: number;
  profit: number;
  storeRefCode: string;
  storeName: string;
}

export interface ProductRevenueSearchRequest {
  fromDate?: string | null;
  toDate?: string | null;
  keyword?: string | null;
  storeRefCode?: string | null;
}