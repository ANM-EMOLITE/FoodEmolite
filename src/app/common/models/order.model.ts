import { OrderSource, OrderType } from '../enums/order.enum';

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER';

export interface CreateOrderRequest {
  storeRefCode: string;
  note?: string | null;
  items: CreateOrderItemRequest[];
  selectedGifts?: SelectedGiftRequest[];
  selectedStoreWideDiscounts?: SelectedStoreWideDiscountRequest[];
  promoCode?: string | null;
  paymentMethod: PaymentMethod;
  /** Địa chỉ giao hàng (đơn giao hàng): bắt buộc SĐT + (GPS hoặc đủ Tỉnh + Phường + số nhà). Bỏ qua với đơn tại quầy (POS). */
  deliveryPhone?: string | null;
  deliveryProvinceCode?: string | null;
  deliveryProvinceName?: string | null;
  deliveryWardCode?: string | null;
  deliveryWardName?: string | null;
  deliveryStreet?: string | null;
  deliveryLatitude?: number | null;
  deliveryLongitude?: number | null;
}

export interface SelectedGiftRequest {
  promotionId: number;
  storeFoodId: number;
}

export interface SelectedStoreWideDiscountRequest {
  promotionId: number;
  storeFoodId: number;
}

export interface CreateOrderItemRequest {
  storeFoodId: number;
  quantity: number;
  options: CreateOrderItemOptionRequest[];
}

export interface CreateOrderItemOptionRequest {
  optionGroupId: number;
  optionGroupName: string;
  optionId: number;
  optionName: string;
  additionalPrice: number;
}

export interface CreateGuestOrderRequest extends CreateOrderRequest {
  customerName: string;
  deviceId: string;
}

export interface UpdateOrderStatusRequest {
  newStatus: string;
  changedNote?: string | null;
}

export interface UpdatePaymentStatusRequest {
  newStatus: string;
  changedNote?: string | null;
}

export interface OrderResponse {
  id: number;
  orderCode: string;
  refCode: string;
  customerAccountId: number;
  customerName: string;
  storeRefCode: string;
  totalAmount: number;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: PaymentMethod;
  note?: string | null;
  createdAt: string;
  orderSource: OrderSource;
  orderType: OrderType;
  deliveryPhone?: string | null;
  deliveryProvinceCode?: string | null;
  deliveryProvinceName?: string | null;
  deliveryWardCode?: string | null;
  deliveryWardName?: string | null;
  deliveryStreet?: string | null;
  deliveryLatitude?: number | null;
  deliveryLongitude?: number | null;
  items: OrderItemResponse[];
}

export interface OrderItemResponse {
  id: number;
  orderId: number;
  storeFoodId: number;
  foodName: string;
  productCode: string | null;
  thumbnailUrl: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  originalUnitPrice: number;
  promotionId: number | null;
  promotionName: string | null;
  options: OrderItemOptionResponse[];
}

export interface OrderItemOptionResponse {
  id: number;
  orderItemId: number;
  optionGroupId: number | null;
  optionGroupName: string;
  optionId: number | null;
  optionName: string;
  additionalPrice: number;
}

export interface OrderSearchRequest {
  keyword?: string | null;
  storeRefCode?: string | null;
  orderStatus?: string | null;
  paymentStatus?: string | null;
  /** Trạng thái gộp: UNPAID | PAID | CANCELLED (đơn huỷ luôn tính là CANCELLED). */
  status?: string | null;
  /** Loại khuyến mãi đã áp trong đơn: FIXED_PRICE | PRODUCT_DISCOUNT | BUY_X_GET_Y | NONE (không có khuyến mãi). */
  promotionType?: string | null;
  /** Từ khoá lọc theo tên / mã khuyến mãi đã áp trong đơn. */
  promotionKeyword?: string | null;
  /** Nguồn đơn: POS | WEB_USER | WEB_GUEST. */
  orderSource?: OrderSource | null;
  fromDate?: string | null;
  toDate?: string | null;
}

export interface CreateOrderResponse {
    orderId: number;
    orderCode: string;
    paymentStatus: string;
    paymentMethod: PaymentMethod;
    totalAmount: number;
}