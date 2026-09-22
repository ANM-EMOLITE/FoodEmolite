export type PaymentMethod = 'CASH' | 'BANK_TRANSFER';

export interface CreateOrderRequest {
  storeRefCode: string;
  note?: string | null;
  items: CreateOrderItemRequest[];
  selectedGifts?: SelectedGiftRequest[];
  selectedStoreWideDiscounts?: SelectedStoreWideDiscountRequest[];
  promoCode?: string | null;
  paymentMethod: PaymentMethod;
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