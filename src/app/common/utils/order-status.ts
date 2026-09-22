/**
 * Trạng thái gộp của đơn hàng (thay cho việc hiện riêng "trạng thái đơn" + "thanh toán"):
 * đơn đã huỷ luôn là CANCELLED, còn lại theo việc đã thanh toán hay chưa.
 */
export type OrderDisplayStatus = 'UNPAID' | 'PAID' | 'CANCELLED';

export const ORDER_DISPLAY_STATUS_TEXT: Record<OrderDisplayStatus, string> = {
    UNPAID: 'Chưa thanh toán',
    PAID: 'Đã thanh toán',
    CANCELLED: 'Đã huỷ'
};

export const ORDER_DISPLAY_STATUS_OPTIONS = [
    { label: ORDER_DISPLAY_STATUS_TEXT.UNPAID, value: 'UNPAID' },
    { label: ORDER_DISPLAY_STATUS_TEXT.PAID, value: 'PAID' },
    { label: ORDER_DISPLAY_STATUS_TEXT.CANCELLED, value: 'CANCELLED' }
];

export function getOrderDisplayStatus(order: { orderStatus: string; paymentStatus: string }): OrderDisplayStatus {
    if (order.orderStatus === 'CANCELLED') {
        return 'CANCELLED';
    }

    return order.paymentStatus === 'PAID' ? 'PAID' : 'UNPAID';
}

/** Badge sáng (nền nhạt + viền) dùng ở trang lịch sử của khách. */
export function getOrderDisplayStatusBadgeClass(status: OrderDisplayStatus): string {
    switch (status) {
        case 'PAID':
            return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
        case 'CANCELLED':
            return 'bg-red-50 text-red-700 ring-red-600/20';
        default:
            return 'bg-orange-50 text-orange-700 ring-orange-600/20';
    }
}
