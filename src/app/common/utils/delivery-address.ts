interface DeliveryAddressLike {
    deliveryStreet?: string | null;
    deliveryWardName?: string | null;
    deliveryProvinceName?: string | null;
    deliveryLatitude?: number | null;
    deliveryLongitude?: number | null;
}

/** "123 Lê Lợi, Phường Bến Thành, Thành phố Hồ Chí Minh" — rỗng nếu đơn không có địa chỉ. */
export function getFullDeliveryAddress(order: DeliveryAddressLike): string {
    return [order.deliveryStreet, order.deliveryWardName, order.deliveryProvinceName]
        .map(part => part?.trim())
        .filter(Boolean)
        .join(', ');
}

/** Chuỗi tìm trên bản đồ: ưu tiên tọa độ GPS (chính xác tới cửa), không có thì dùng địa chỉ chữ. */
export function getMapQuery(order: DeliveryAddressLike): string {
    return order.deliveryLatitude != null && order.deliveryLongitude != null
        ? `${order.deliveryLatitude},${order.deliveryLongitude}`
        : getFullDeliveryAddress(order);
}

/** Link mở Google Maps (tab mới). */
export function getGoogleMapsUrl(order: DeliveryAddressLike): string | null {
    const query = getMapQuery(order);

    return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : null;
}
