export type PromotionType = 'FIXED_PRICE' | 'PRODUCT_DISCOUNT' | 'BUY_X_GET_Y';
export type PromotionStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'ENDED';
export type PromotionConditionType = 'NONE' | 'MIN_ORDER_AMOUNT' | 'MIN_QUANTITY';
export type PromotionDiscountType = 'PERCENT' | 'AMOUNT';

export interface PromotionFixedPriceItemRequest {
    storeFoodId: number;
    fixedPrice: number;
}

export interface PromotionDiscountItemRequest {
    storeFoodId: number;
    discountType: PromotionDiscountType;
    discountValue: number;
    maxDiscountAmount?: number | null;
}

export interface PromotionGiftItemRequest {
    storeFoodId: number;
    giftQuantity: number;
    sortOrder: number;
}

export interface PromotionFixedPriceItemResponse {
    id: number;
    storeFoodId: number;
    foodName: string;
    thumbnailUrl: string | null;
    originalPrice: number;
    fixedPrice: number;
}

export interface PromotionDiscountItemResponse {
    id: number;
    storeFoodId: number;
    foodName: string;
    thumbnailUrl: string | null;
    originalPrice: number;
    discountType: PromotionDiscountType;
    discountValue: number;
    maxDiscountAmount: number | null;
}

export interface PromotionGiftItemResponse {
    id: number;
    storeFoodId: number;
    foodName: string;
    thumbnailUrl: string | null;
    giftQuantity: number;
    sortOrder: number;
}

export interface PromotionResponse {
    id: number;
    refCode: string | null;
    storeRefCode: string;
    promotionCode: string | null;
    promotionType: PromotionType;
    name: string;
    description: string | null;
    status: PromotionStatus;
    startDate: string;
    endDate: string | null;
    startTime: string | null;
    endTime: string | null;
    daysOfWeekMask: number;
    conditionType: PromotionConditionType;
    conditionMinAmount: number | null;
    conditionMinQuantity: number | null;
    applyToAllProducts: boolean;
    discountType: PromotionDiscountType | null;
    discountValue: number | null;
    maxDiscountAmount: number | null;
    createdAt: string;
    fixedPriceItems: PromotionFixedPriceItemResponse[];
    discountItems: PromotionDiscountItemResponse[];
    giftItems: PromotionGiftItemResponse[];
}

export interface CreatePromotionRequest {
    promotionCode?: string | null;
    promotionType: PromotionType;
    name: string;
    description?: string | null;
    saveAsDraft: boolean;
    startDate: string;
    endDate?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    daysOfWeekMask: number;
    conditionType: PromotionConditionType;
    conditionMinAmount?: number | null;
    conditionMinQuantity?: number | null;
    applyToAllProducts?: boolean;
    discountType?: PromotionDiscountType | null;
    discountValue?: number | null;
    maxDiscountAmount?: number | null;
    fixedPriceItems: PromotionFixedPriceItemRequest[];
    discountItems: PromotionDiscountItemRequest[];
    giftItems: PromotionGiftItemRequest[];
}

export interface PromotionSearchRequest {
    keyword?: string | null;
    promotionType?: string | null;
    status?: string | null;
}

/** Thống kê hiệu quả chương trình — chỉ tính các đơn chưa huỷ. */
export interface PromotionStatsResponse {
    orderCount: number;
    /** Tổng số lượng món được áp chương trình (quà tặng cũng tính). */
    usageCount: number;
    revenue: number;
    paidRevenue: number;
    /** Tổng tiền đã giảm cho khách: Σ (giá gốc − giá bán) × số lượng. */
    discountAmount: number;
}
