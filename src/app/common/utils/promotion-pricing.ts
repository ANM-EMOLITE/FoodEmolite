import { PromotionResponse, PromotionType } from '../models/promotion.model';

export interface PromotionalPriceInfo {
    hasPromotion: boolean;
    originalPrice: number;
    effectivePrice: number;
    promotionName?: string;
    /** Loại chương trình — dùng để quyết định hiện % (giảm giá) hay số tiền (đồng giá) cạnh giá gạch, và ghép vào tooltip. */
    promotionType?: PromotionType;
    /** Chương trình có điều kiện áp dụng (mua tối thiểu...) hay không — dùng để quyết định có hiện tooltip tên CTKM hay không. */
    hasCondition?: boolean;
    /** Món này thuộc 1 CT khuyến mãi nhưng CHƯA đạt điều kiện (mua tối thiểu) — hasPromotion vẫn false
     * (giá gốc), nhưng hiện thông báo này để khách biết cần mua thêm bao nhiêu mới được giảm. */
    unmetConditionMessage?: string;
}

/** Tên loại chương trình để hiện trong tooltip, dạng "Tên CT - Tên loại CT". */
export function getPromotionTypeLabel(type: PromotionType | undefined): string {
    switch (type) {
        case 'FIXED_PRICE': return 'Đồng giá';
        case 'PRODUCT_DISCOUNT': return 'Giảm giá sản phẩm';
        case 'BUY_X_GET_Y': return 'Mua X tặng Y';
        default: return '';
    }
}

/** CT có điều kiện (mua tối thiểu) đã đạt hay chưa, tính trên tổng đơn hàng theo giá GỐC. */
function isConditionMet(promo: PromotionResponse, subtotal: number, totalQuantity: number): boolean {
    if (promo.conditionType === 'MIN_ORDER_AMOUNT') {
        return subtotal >= (promo.conditionMinAmount ?? Number.POSITIVE_INFINITY);
    }

    if (promo.conditionType === 'MIN_QUANTITY') {
        return totalQuantity >= (promo.conditionMinQuantity ?? Number.POSITIVE_INFINITY);
    }

    return true;
}

function buildUnmetConditionMessage(promo: PromotionResponse, subtotal: number, totalQuantity: number): string | undefined {
    if (promo.conditionType === 'MIN_ORDER_AMOUNT' && promo.conditionMinAmount) {
        const remaining = promo.conditionMinAmount - subtotal;

        if (remaining > 0) {
            return `Mua thêm ${remaining.toLocaleString('vi-VN')}đ để được giảm giá`;
        }
    }

    if (promo.conditionType === 'MIN_QUANTITY' && promo.conditionMinQuantity) {
        const remaining = promo.conditionMinQuantity - totalQuantity;

        if (remaining > 0) {
            return `Mua thêm ${remaining} sản phẩm để được giảm giá`;
        }
    }

    return undefined;
}

export function getPromotionalPrice(
    storeFoodId: number,
    originalPrice: number,
    activePromotions: PromotionResponse[],
    subtotal: number,
    totalQuantity: number
): PromotionalPriceInfo {
    for (const promo of activePromotions) {
        if (promo.promotionType === 'FIXED_PRICE') {
            const item = promo.fixedPriceItems.find(i => i.storeFoodId === storeFoodId);

            if (item) {
                if (!isConditionMet(promo, subtotal, totalQuantity)) {
                    return {
                        hasPromotion: false,
                        originalPrice,
                        effectivePrice: originalPrice,
                        unmetConditionMessage: buildUnmetConditionMessage(promo, subtotal, totalQuantity)
                    };
                }

                return {
                    hasPromotion: true,
                    originalPrice,
                    effectivePrice: item.fixedPrice,
                    promotionName: promo.name,
                    promotionType: promo.promotionType,
                    hasCondition: promo.conditionType !== 'NONE'
                };
            }
        } else if (promo.promotionType === 'PRODUCT_DISCOUNT' && !promo.applyToAllProducts) {
            const item = promo.discountItems.find(i => i.storeFoodId === storeFoodId);

            if (item) {
                if (!isConditionMet(promo, subtotal, totalQuantity)) {
                    return {
                        hasPromotion: false,
                        originalPrice,
                        effectivePrice: originalPrice,
                        unmetConditionMessage: buildUnmetConditionMessage(promo, subtotal, totalQuantity)
                    };
                }

                let effectivePrice: number;

                if (item.discountType === 'PERCENT') {
                    let discountAmount = (originalPrice * item.discountValue) / 100;

                    if (item.maxDiscountAmount) {
                        discountAmount = Math.min(discountAmount, item.maxDiscountAmount);
                    }

                    effectivePrice = Math.max(originalPrice - discountAmount, 0);
                } else {
                    effectivePrice = Math.max(originalPrice - item.discountValue, 0);
                }

                return {
                    hasPromotion: true,
                    originalPrice,
                    effectivePrice,
                    promotionName: promo.name,
                    promotionType: promo.promotionType,
                    hasCondition: promo.conditionType !== 'NONE'
                };
            }
        }
    }

    return {
        hasPromotion: false,
        originalPrice,
        effectivePrice: originalPrice
    };
}

/** Các chương trình "Giảm giá sản phẩm" áp dụng cho toàn bộ sản phẩm — khách tự chọn 1 món trong đơn để nhận giảm giá. */
export function getStoreWideDiscountPromotions(activePromotions: PromotionResponse[]): PromotionResponse[] {
    return activePromotions.filter(promo => promo.promotionType === 'PRODUCT_DISCOUNT' && promo.applyToAllProducts);
}

/** Giá sau khi áp dụng giảm giá "toàn bộ sản phẩm" của 1 chương trình lên 1 món có giá gốc cho trước. */
export function computeStoreWideDiscountPrice(promo: PromotionResponse, originalPrice: number): number {
    if (!promo.discountType || promo.discountValue == null) {
        return originalPrice;
    }

    let discountAmount = promo.discountType === 'PERCENT'
        ? (originalPrice * promo.discountValue) / 100
        : promo.discountValue;

    if (promo.discountType === 'PERCENT' && promo.maxDiscountAmount) {
        discountAmount = Math.min(discountAmount, promo.maxDiscountAmount);
    }

    return Math.max(originalPrice - discountAmount, 0);
}

/** Các chương trình "Mua X tặng Y" mà giỏ hàng hiện tại đã đủ điều kiện nhận quà. */
export function getEligibleGiftPromotions(
    activePromotions: PromotionResponse[],
    subtotal: number,
    totalQuantity: number
): PromotionResponse[] {
    return activePromotions.filter(promo => {
        if (promo.promotionType !== 'BUY_X_GET_Y') {
            return false;
        }

        if (promo.conditionType === 'MIN_ORDER_AMOUNT') {
            return subtotal >= (promo.conditionMinAmount ?? Number.POSITIVE_INFINITY);
        }

        if (promo.conditionType === 'MIN_QUANTITY') {
            return totalQuantity >= (promo.conditionMinQuantity ?? Number.POSITIVE_INFINITY);
        }

        return false;
    });
}
