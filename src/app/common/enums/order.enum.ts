/** Nguồn đơn — khớp enum OrderSource ở BE (BE tự xác định khi tạo đơn). */
export enum OrderSource {
    /** Chủ cửa hàng tạo tại quầy. */
    Pos = 'POS',
    /** User đã đăng nhập đặt trên trang user. */
    WebUser = 'WEB_USER',
    /** Khách vãng lai đặt qua link cửa hàng. */
    WebGuest = 'WEB_GUEST'
}

export const ORDER_SOURCE_TEXT: Record<OrderSource, string> = {
    [OrderSource.Pos]: 'Tại quầy (POS)',
    [OrderSource.WebUser]: 'Khách đăng nhập',
    [OrderSource.WebGuest]: 'Khách vãng lai'
};

export const ORDER_SOURCE_OPTIONS = Object.values(OrderSource).map(value => ({
    label: ORDER_SOURCE_TEXT[value],
    value
}));

/** Loại đơn — khớp enum OrderType ở BE. */
export enum OrderType {
    /** Tại quầy. */
    DineIn = 'DINE_IN',
    /** Giao hàng — có SĐT + địa chỉ giao hàng. */
    Delivery = 'DELIVERY'
}

export const ORDER_TYPE_TEXT: Record<OrderType, string> = {
    [OrderType.DineIn]: 'Tại quầy',
    [OrderType.Delivery]: 'Giao hàng'
};

export enum OrderStatus {
    Pending = 'PENDING',
    Confirmed = 'CONFIRMED',
    Completed = 'COMPLETED',
    Cancelled = 'CANCELLED'
}

export enum PaymentStatus {
    Unpaid = 'UNPAID',
    Paid = 'PAID'
}
