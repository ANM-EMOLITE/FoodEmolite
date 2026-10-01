import { OrderSource, OrderStatus, OrderType, PaymentStatus } from '../enums/order.enum';

export interface CustomerListItem {
    refCode: string;
    customerName: string;
    phoneNumber: string | null;
    email: string | null;
    avatarUrl: string | null;
    isGuest: boolean;
    totalOrders: number;
    totalSpent: number;
    lastOrderAt: string | null;
    storeRefCode: string;
    storeName: string;
}

export interface CustomerSearchRequest {
    keyword?: string | null;
    storeRefCode?: string | null;
}

export interface CustomerRecentOrder {
    id: number;
    orderCode: string;
    totalAmount: number;
    orderStatus: OrderStatus;
    paymentStatus: PaymentStatus;
    orderType: OrderType;
    orderSource: OrderSource;
    note: string | null;
    createdAt: string;
}

export interface CustomerDetail {
    refCode: string;
    customerCode: string | null;
    customerName: string;
    phoneNumber: string | null;
    email: string | null;
    avatarUrl: string | null;
    gender: string | null;
    dateOfBirth: string | null;
    address: string | null;
    isGuest: boolean;
    totalOrders: number;
    paidOrders: number;
    cancelledOrders: number;
    totalSpent: number;
    firstOrderAt: string | null;
    lastOrderAt: string | null;
    recentOrders: CustomerRecentOrder[];
}
