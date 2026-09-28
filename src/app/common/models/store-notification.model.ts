export interface StoreNotificationResponse {
    id: number;
    /** NEW_ORDER (hiện tại chỉ có đơn hàng mới). */
    type: string;
    orderId: number | null;
    orderCode: string | null;
    storeRefCode: string;
    customerName: string | null;
    totalAmount: number | null;
    isRead: boolean;
    createdAt: string;
}

export interface StoreNotificationListResponse {
    items: StoreNotificationResponse[];
    /** Tổng số thông báo chưa đọc của cửa hàng (không chỉ trong trang đang lấy). */
    unreadCount: number;
    totalRecords: number;
}
