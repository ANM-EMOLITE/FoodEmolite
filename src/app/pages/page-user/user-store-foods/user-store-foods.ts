import {
    Component,
    OnDestroy,
    computed,
    effect,
    inject,
    signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { StoreFoodService } from '../../../common/services/store-food.service';
import { StoreService } from '../../../common/services/store.service';
import { ToastService } from '../../../common/services/toast.service';
import { OrderService } from '../../../common/services/order.service';
import { AuthService } from '../../../common/services/auth.service';
import { PromotionService } from '../../../common/services/promotion.service';
import { RealtimeService } from '../../../common/services/realtime.service';
import { StoreFoodResponse } from '../../../common/models/store-food.model';
import { PromotionResponse } from '../../../common/models/promotion.model';
import { PaymentMethod, SelectedGiftRequest, SelectedStoreWideDiscountRequest } from '../../../common/models/order.model';
import {
    PromotionalPriceInfo,
    getEligibleGiftPromotions,
    getPromotionalPrice,
    getStoreWideDiscountPromotions,
    computeStoreWideDiscountPrice,
    getPromotionTypeLabel
} from '../../../common/utils/promotion-pricing';
import { URL_ENDPOINT } from '../../../common/constants/url-endpoint';
import { PopUpUserFoodOptionsComponent } from './pop-up-user-food-options/pop-up-user-food-options';
import { StoreFoodCategoryService } from '../../../common/services/store-food-category.service';
import { StoreFoodCategoryResponse } from '../../../common/models/store-food-category.model';
import { SelectedStoreService } from '../../../common/services/selectedstore.service';
import { GuestService } from '../../../common/services/guest.service';
import { TooltipDirective } from '../../../shared/directive/tooltip.directive';

export interface CartItemOption {
    optionGroupId: number;
    optionGroupName: string;
    optionId: number;
    optionName: string;
    additionalPrice: number;
}

interface CartItem {
    id: number;
    food: StoreFoodResponse;
    quantity: number;
    note: string;
    selectedOptions: CartItemOption[];
    isDetailLoaded: boolean;
}

@Component({
    selector: 'app-page-user-store-foods',
    imports: [PopUpUserFoodOptionsComponent, TooltipDirective],
    templateUrl: './user-store-foods.html',
    styleUrl: './user-store-foods.css'
})
export class PageUserStoreFoodsComponent implements OnDestroy {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly storeFoodService = inject(StoreFoodService);
    private readonly storeService = inject(StoreService);
    private readonly toastService = inject(ToastService);
    private readonly orderService = inject(OrderService);
    private readonly authService = inject(AuthService);
    private readonly categoryService = inject(StoreFoodCategoryService);
    private readonly selectedStoreService = inject(SelectedStoreService);
    private readonly guestService = inject(GuestService)
    private readonly promotionService = inject(PromotionService);
    private readonly realtimeService = inject(RealtimeService);
    private paymentInterval: any;
    private nextCartItemId = 1;

    activePromotions = signal<PromotionResponse[]>([]);
    selectedGifts = signal<SelectedGiftRequest[]>([]);
    selectedStoreWideDiscounts = signal<SelectedStoreWideDiscountRequest[]>([]);
    promoCodeInput = signal('');
    appliedPromoCode = signal<string | null>(null);
    paymentMethod = signal<PaymentMethod>('CASH');

    categories = signal<StoreFoodCategoryResponse[]>([]);
    selectedCategoryId = signal<number | null>(null);
    isQrPopupOpen = signal(false);
    qrData = signal<any>(null);
    storeRefCode = signal('');
    isFromDirectLink = signal(false);
    foods = signal<StoreFoodResponse[]>([]);
    cart = signal<CartItem[]>([]);

    /** Danh sách món để hiển thị — món hết hàng bị đẩy xuống cuối, không đổi thứ tự trong `foods()` gốc. */
    sortedFoods = computed(() =>
        [...this.foods()].sort((a, b) => (a.quantity === 0 ? 1 : 0) - (b.quantity === 0 ? 1 : 0))
    );

    /** Danh sách giỏ hàng để hiển thị — món đã hết hàng bị đẩy xuống cuối, không đổi thứ tự trong `cart()` gốc. */
    sortedCart = computed(() =>
        [...this.cart()].sort((a, b) => (a.food.quantity === 0 ? 1 : 0) - (b.food.quantity === 0 ? 1 : 0))
    );

    loading = signal(false);
    ordering = signal(false);
    isMobileCartOpen = signal(false);
    orderNote = signal('');

    hadGuestProfileOnOpen = signal(false);
    isGuestNameOpen = signal(false);      // popup A - nhập tên
    isConfirmOrderOpen = signal(false);   // popup B - cảnh báo xác nhận
    isOptionPopupOpen = signal(false);
    selectingCartId = signal<number | null>(null);
    pendingFood = signal<StoreFoodResponse | null>(null);

    guestCustomerName = computed(() => this.guestService.customerName());

    isLoggedIn = computed(() => this.authService.isLoggedIn());

    selectedStoreInfo = computed(() => this.selectedStoreService.storeInfo());

    totalQuantity = computed(() =>
        this.cart().reduce((total, item) => total + item.quantity, 0)
    );

    originalSubtotal = computed(() =>
        this.cart().reduce((total, item) => {
            const optionAmount = item.selectedOptions.reduce((sum, option) => sum + option.additionalPrice, 0);

            return total + (item.food.price + optionAmount) * item.quantity;
        }, 0)
    );

    activePopupFood = computed(() => {
        const editingId = this.selectingCartId();

        if (editingId !== null) {
            return this.cart().find(item => item.id === editingId)?.food ?? null;
        }

        return this.pendingFood();
    });

    activePopupOptions = computed(() => {
        const editingId = this.selectingCartId();

        if (editingId !== null) {
            return this.cart().find(item => item.id === editingId)?.selectedOptions ?? [];
        }

        return [];
    });

    qrImageUrl = computed(() => {
        const url = this.qrData()?.vietQrUrl;

        if (!url) return null;

        return url.replace(/-(compact2|compact|print)\.png/, '-qr_only.png');
    });

    /** Promotion đang active mà khách được áp dụng: không cần mã, hoặc có mã và khách đã nhập đúng. */
    applicablePromotions = computed(() =>
        this.activePromotions().filter(promo =>
            !promo.promotionCode || promo.promotionCode === this.appliedPromoCode()
        )
    );

    /** Khách hiện tại (theo deviceId/tài khoản) có đủ điều kiện dùng KM "toàn bộ sản phẩm" hay không —
     * mặc định false để không hiện UI rồi lại ẩn ngay khi API trả lời "không đủ điều kiện". */
    storeWideDiscountEligible = signal(false);

    /** Chương trình "Giảm giá sản phẩm" áp dụng toàn bộ sản phẩm — khách tự chọn 1 món trong giỏ để nhận giảm giá.
     * Chỉ hiện khi khách đủ điều kiện dùng (đã kiểm tra qua API, xem checkStoreWideDiscountEligibility). */
    storeWideDiscountPromotions = computed(() =>
        this.storeWideDiscountEligible() ? getStoreWideDiscountPromotions(this.applicablePromotions()) : []
    );

    /** Danh sách món (không trùng) hiện có trong giỏ hàng, dùng để chọn món nhận giảm giá "toàn bộ sản phẩm". */
    uniqueCartFoods = computed(() => {
        const seen = new Set<number>();
        const result: StoreFoodResponse[] = [];

        for (const item of this.cart()) {
            if (!seen.has(item.food.id)) {
                seen.add(item.food.id);
                result.push(item.food);
            }
        }

        return result;
    });

    /** StoreFoodId -> giá đã giảm cho các món khách chọn nhận giảm giá "toàn bộ sản phẩm". */
    storeWideDiscountPriceMap = computed(() => {
        const map = new Map<number, number>();
        const promotions = this.storeWideDiscountPromotions();

        for (const selected of this.selectedStoreWideDiscounts()) {
            const promo = promotions.find(p => p.id === selected.promotionId);
            const food = this.uniqueCartFoods().find(f => f.id === selected.storeFoodId);

            if (promo && food) {
                map.set(selected.storeFoodId, computeStoreWideDiscountPrice(promo, food.price));
            }
        }

        return map;
    });

    /** Chưa ai được chọn nhận giảm giá "toàn bộ sản phẩm" và giỏ hàng đang trống — hiện giá đã giảm
     * trên TẤT CẢ món trong danh sách để khách biết CT áp dụng cho món nào cũng được. */
    showStoreWideDiscountPreview = computed(() =>
        this.storeWideDiscountPromotions().length > 0 && this.cart().length === 0
    );

    totalAmount = computed(() =>
        this.cart().reduce((total, item) => total + this.getLineTotal(item), 0)
    );

    /** Tổng số tiền được giảm nhờ khuyến mãi (chênh lệch giá gốc - giá đã giảm), hiện phía trên Tổng tiền. */
    totalDiscountAmount = computed(() =>
        this.cart().reduce((total, item) => {
            const overridePrice = this.storeWideDiscountPriceMap().get(item.food.id);

            if (overridePrice !== undefined) {
                const baseUnitPrice = getPromotionalPrice(
                    item.food.id, item.food.price, this.applicablePromotions(),
                    this.originalSubtotal(), this.totalQuantity()
                ).effectivePrice;

                return total + Math.max(baseUnitPrice - overridePrice, 0);
            }

            const pricing = this.getFoodPricing(item.food);

            if (pricing.hasPromotion) {
                return total + (pricing.originalPrice - pricing.effectivePrice) * item.quantity;
            }

            return total;
        }, 0)
    );

    /** Chương trình "Mua X tặng Y" mà giỏ hàng hiện tại đã đủ điều kiện nhận quà. */
    eligibleGiftPromotions = computed(() =>
        getEligibleGiftPromotions(this.applicablePromotions(), this.totalAmount(), this.totalQuantity())
    );

    constructor() {
        effect(() => {
            const eligibleIds = new Set(this.eligibleGiftPromotions().map(p => p.id));

            this.selectedGifts.update(list =>
                list.filter(g => eligibleIds.has(g.promotionId))
            );
        });

        // Tự động chọn/bỏ chọn món nhận giảm giá "toàn bộ sản phẩm": nếu giỏ chỉ còn đúng 1 món thì
        // tự áp dụng luôn (không cần bấm); nếu có từ 2 món trở lên mà món đang chọn không còn trong
        // giỏ, bỏ chọn để khách tự bấm "Áp dụng" trên món khác.
        effect(() => {
            const uniqueFoods = this.uniqueCartFoods();
            const promo = this.storeWideDiscountPromotions()[0];

            if (!promo || uniqueFoods.length === 0) {
                if (this.selectedStoreWideDiscounts().length > 0) {
                    this.selectedStoreWideDiscounts.set([]);
                }
                return;
            }

            const current = this.selectedStoreWideDiscounts().find(d => d.promotionId === promo.id);
            const currentStillInCart = !!current && uniqueFoods.some(f => f.id === current.storeFoodId);

            if (currentStillInCart) {
                return;
            }

            if (uniqueFoods.length === 1) {
                this.selectedStoreWideDiscounts.set([{ promotionId: promo.id, storeFoodId: uniqueFoods[0].id }]);
            } else if (this.selectedStoreWideDiscounts().length > 0) {
                this.selectedStoreWideDiscounts.set([]);
            }
        });

        this.realtimeService.connect();

        this.realtimeService.promotionStatusChanged$
            .pipe(takeUntilDestroyed())
            .subscribe(notification => {
                if (notification.storeRefCode === this.storeRefCode()) {
                    this.loadActivePromotions();
                }
            });

        this.realtimeService.foodQuantityChanged$
            .pipe(takeUntilDestroyed())
            .subscribe(notification => {
                if (notification.storeRefCode !== this.storeRefCode()) {
                    return;
                }

                this.foods.update(list =>
                    list.map(f => f.id === notification.storeFoodId
                        ? { ...f, quantity: notification.quantity }
                        : f
                    )
                );
            });

        this.route.queryParamMap.subscribe(params => {
            const orderCode = params.get('orderCode');
            const resume = params.get('resume');

            if (resume === 'true' && orderCode) {
                this.resumePayment(orderCode);
            }
        });

        const linkStoreRefCode = this.route.snapshot.queryParamMap.get('storeRefCode');

        if (linkStoreRefCode) {
            this.isFromDirectLink.set(true);
            this.loadStoreByRefCode(linkStoreRefCode);
            return;
        }

        const storeRefCode = this.selectedStoreService.storeRefCode() ?? '';

        if (!storeRefCode) {
            this.toastService.error('Không tìm thấy cửa hàng, vui lòng chọn lại');
            return;
        }

        this.storeRefCode.set(storeRefCode);
        this.loadCategories();
        this.loadFoods();
        this.loadActivePromotions();
        this.realtimeService.joinPublicStoreGroup(storeRefCode);
    }

    loadActivePromotions(): void {
        const refCode = this.storeRefCode();

        if (!refCode) {
            return;
        }

        this.promotionService.getActiveByStore(refCode).subscribe({
            next: response => {
                if (response.isSuccess && response.data) {
                    this.activePromotions.set(response.data);
                }
            }
        });

        this.checkStoreWideDiscountEligibility(refCode);
    }

    /** Kiểm tra khách hiện tại có đủ điều kiện dùng KM "toàn bộ sản phẩm" hay không, để chỉ hiện UI
     * chọn giảm giá khi khách thực sự dùng được (đã từng đặt hàng/đã đăng nhập, chưa dùng CT đó). */
    private checkStoreWideDiscountEligibility(refCode: string): void {
        const deviceId = this.isLoggedIn() ? null : this.guestService.getGuestToken();

        this.promotionService.checkStoreWideDiscountEligibility(refCode, deviceId).subscribe({
            next: response => {
                this.storeWideDiscountEligible.set(response.isSuccess && response.data === true);
            },
            error: () => {
                this.storeWideDiscountEligible.set(false);
            }
        });
    }

    applyPromoCode(): void {
        const code = this.promoCodeInput().trim();

        if (!code) {
            return;
        }

        const matched = this.activePromotions().find(promo =>
            promo.promotionCode?.toLowerCase() === code.toLowerCase()
        );

        if (!matched) {
            this.toastService.error('Mã giảm giá không hợp lệ hoặc đã hết hạn');
            return;
        }

        this.appliedPromoCode.set(matched.promotionCode);
        this.toastService.success(`Đã áp dụng mã "${matched.promotionCode}"`);
    }

    removePromoCode(): void {
        this.appliedPromoCode.set(null);
        this.promoCodeInput.set('');
    }

    setPaymentMethod(method: PaymentMethod): void {
        this.paymentMethod.set(method);
    }

    selectGift(promotionId: number, storeFoodId: number): void {
        this.selectedGifts.update(list => [
            ...list.filter(g => g.promotionId !== promotionId),
            { promotionId, storeFoodId }
        ]);
    }

    clearGiftSelection(promotionId: number): void {
        this.selectedGifts.update(list => list.filter(g => g.promotionId !== promotionId));
    }

    getSelectedGiftFoodId(promotionId: number): number | null {
        return this.selectedGifts().find(g => g.promotionId === promotionId)?.storeFoodId ?? null;
    }

    getFoodPricing(food: StoreFoodResponse): PromotionalPriceInfo {
        const overridePrice = this.storeWideDiscountPriceMap().get(food.id);

        if (overridePrice !== undefined) {
            return {
                hasPromotion: true,
                originalPrice: food.price,
                effectivePrice: overridePrice
            };
        }

        const promo = this.storeWideDiscountPromotions()[0];

        if (promo && this.showStoreWideDiscountPreview()) {
            return {
                hasPromotion: true,
                originalPrice: food.price,
                effectivePrice: computeStoreWideDiscountPrice(promo, food.price)
            };
        }

        return getPromotionalPrice(
            food.id, food.price, this.applicablePromotions(),
            this.originalSubtotal(), this.totalQuantity()
        );
    }

    /** Tooltip cho mác "Khuyến mãi": "Tên CT - Tên loại CT" (vd: "SALE FOR YOU - Giảm giá sản phẩm"). */
    getPromotionTooltip(pricing: PromotionalPriceInfo): string {
        if (!pricing.promotionName) {
            return '';
        }

        const typeLabel = getPromotionTypeLabel(pricing.promotionType);

        return typeLabel ? `${pricing.promotionName} - ${typeLabel}` : pricing.promotionName;
    }

    /** Hiện cạnh giá gạch: "-x%" nếu là CT giảm giá, hoặc số tiền được giảm nếu là CT đồng giá. */
    getDiscountBadgeText(pricing: PromotionalPriceInfo): string {
        const saved = pricing.originalPrice - pricing.effectivePrice;

        if (saved <= 0) {
            return '';
        }

        if (pricing.promotionType === 'PRODUCT_DISCOUNT') {
            const percent = Math.round((saved / pricing.originalPrice) * 100);
            return `-${percent}%`;
        }

        return `-${this.formatCurrency(saved)}`;
    }

    /** Tổng tiền 1 dòng giỏ hàng. Nếu món này được chọn nhận giảm giá "toàn bộ sản phẩm", CHỈ 1 đơn vị
     * được tính giá đã giảm — phần còn lại (nếu số lượng > 1) vẫn tính giá bình thường (khớp logic BE). */
    getLineTotal(item: CartItem): number {
        const optionAmount = item.selectedOptions.reduce((sum, option) => sum + option.additionalPrice, 0);
        const overridePrice = this.storeWideDiscountPriceMap().get(item.food.id);

        if (overridePrice !== undefined) {
            const baseUnitPrice = getPromotionalPrice(
                item.food.id, item.food.price, this.applicablePromotions(),
                this.originalSubtotal(), this.totalQuantity()
            ).effectivePrice;

            return baseUnitPrice * (item.quantity - 1) + overridePrice + optionAmount * item.quantity;
        }

        const pricing = this.getFoodPricing(item.food);

        return (pricing.effectivePrice + optionAmount) * item.quantity;
    }

    /** Bấm "Áp dụng" trên 1 món trong giỏ để chuyển giảm giá "toàn bộ sản phẩm" sang món đó — chỉ 1 món
     * tại 1 thời điểm (chỉ tối đa 1 chương trình dạng này hoạt động cùng lúc mỗi cửa hàng). */
    applyStoreWideDiscount(storeFoodId: number): void {
        const promo = this.storeWideDiscountPromotions()[0];

        if (!promo) {
            return;
        }

        this.selectedStoreWideDiscounts.set([{ promotionId: promo.id, storeFoodId }]);
    }

    isStoreWideDiscountSelected(storeFoodId: number): boolean {
        return this.selectedStoreWideDiscounts().some(d => d.storeFoodId === storeFoodId);
    }

    private loadStoreByRefCode(refCode: string): void {
        this.loading.set(true);

        this.storeService.getByRefCode(refCode).subscribe({
            next: response => {
                this.loading.set(false);

                if (!response.isSuccess || !response.data) {
                    this.toastService.error('Không tìm thấy cửa hàng, vui lòng chọn lại');
                    return;
                }

                this.selectedStoreService.setStore(response.data);
                this.storeRefCode.set(response.data.refCode);
                this.loadCategories();
                this.loadFoods();
                this.loadActivePromotions();
                this.realtimeService.joinPublicStoreGroup(response.data.refCode);
            },
            error: () => {
                this.loading.set(false);
                this.toastService.error('Không tìm thấy cửa hàng, vui lòng chọn lại');
            }
        });
    }

    selectCategory(
        categoryId: number | null
    ): void {
        this.selectedCategoryId.set(categoryId);

        this.loadFoods();
    }

    ngOnDestroy() {
        if (this.paymentInterval) {
            clearInterval(this.paymentInterval);
            this.paymentInterval = null;
        }

        this.realtimeService.disconnect();
    }

    loadCategories(): void {
        this.categoryService
            .getByStoreRefCode(this.storeRefCode())
            .subscribe({
                next: response => {
                    if (
                        response.isSuccess &&
                        response.data
                    ) {
                        this.categories.set(
                            response.data
                        );
                    }
                }
            });
    }

    loadFoods(): void {
        this.loading.set(true);

        this.storeFoodService
            .getByStoreRefCode(
                this.storeRefCode(),
                this.selectedCategoryId(),
                1,
                100
            )
            .subscribe({
                next: response => {
                    this.loading.set(false);

                    this.foods.set(
                        response.items.filter(
                            food => food.isAvailable
                        )
                    );
                },
                error: () => {
                    this.loading.set(false);

                    this.toastService.error(
                        'Không tải được danh sách món ăn'
                    );
                }
            });
    }

    changeCategory(categoryId: number | null): void {
        this.selectedCategoryId.set(
            categoryId
        );

        this.loadFoods();
    }

    updateOrderNote(value: string): void {
        this.orderNote.set(value);
    }

    addToCart(food: StoreFoodResponse): void {
        const existed = this.cart().find(item =>
            item.food.id === food.id &&
            item.selectedOptions.length === 0
        );

        if (existed) {
            this.increase(existed.id);
            return;
        }

        this.cart.update(items => [
            ...items,
            {
                id: this.nextCartItemId++,
                food,
                quantity: 1,
                note: '',
                selectedOptions: [],
                isDetailLoaded: true
            }
        ]);
    }

    increase(cartItemId: number): void {
        this.cart.update(items =>
            items.map(item =>
                item.id === cartItemId
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            )
        );
    }

    decrease(cartItemId: number): void {
        this.cart.update(items =>
            items
                .map(item =>
                    item.id === cartItemId
                        ? { ...item, quantity: item.quantity - 1 }
                        : item
                )
                .filter(item => item.quantity > 0)
        );
    }

    setQuantity(cartItemId: number, quantity: number): void {
        const nextQuantity = !quantity || quantity < 1
            ? 1
            : Math.floor(quantity);

        this.cart.update(items =>
            items.map(item =>
                item.id === cartItemId
                    ? { ...item, quantity: nextQuantity }
                    : item
            )
        );
    }

    remove(cartItemId: number): void {
        this.cart.update(items =>
            items.filter(item => item.id !== cartItemId)
        );
    }

    updateNote(cartItemId: number, note: string): void {
        this.cart.update(items =>
            items.map(item =>
                item.id === cartItemId
                    ? { ...item, note }
                    : item
            )
        );
    }

    updateGuestCustomerName(value: string): void {
        this.guestService.customerName.set(value);
    }

    blockInvalidQuantityKey(event: KeyboardEvent): void {
        const allowedKeys = [
            'Backspace',
            'Delete',
            'Tab',
            'ArrowLeft',
            'ArrowRight',
            'Home',
            'End'
        ];

        if (allowedKeys.includes(event.key)) return;

        if (!/^\d$/.test(event.key)) {
            event.preventDefault();
        }
    }

    onQuantityInput(cartItemId: number, input: HTMLInputElement): void {
        const sanitizedValue = input.value.replace(/\D/g, '');

        if (!sanitizedValue) {
            input.value = '1';
            this.setQuantity(cartItemId, 1);
            return;
        }

        const quantity = Number(sanitizedValue);

        if (quantity < 1) {
            input.value = '1';
            this.setQuantity(cartItemId, 1);
            return;
        }

        input.value = quantity.toString();
        this.setQuantity(cartItemId, quantity);
    }

    openOptionPopup(cartItemId: number): void {
        const exists = this.cart().some(item => item.id === cartItemId);

        if (!exists) return;

        this.pendingFood.set(null);
        this.selectingCartId.set(cartItemId);
        this.isOptionPopupOpen.set(true);
    }

    openConfirmOrder(): void {
        if (this.cart().length === 0 || this.ordering()) return;

        if (this.hasMissingRequiredOptions()) {
            this.toastService.error('Vui lòng chọn đầy đủ option bắt buộc');
            return;
        }

        if (!this.isLoggedIn() && !this.hasGuestProfile()) {
            this.isGuestNameOpen.set(true);
            return;
        }

        this.isConfirmOrderOpen.set(true);
    }

    submitGuestName(): void {
        if (!this.guestCustomerName().trim()) {
            this.toastService.error('Vui lòng nhập tên khách hàng');
            return;
        }

        this.isGuestNameOpen.set(false);
        this.isConfirmOrderOpen.set(true);
    }

    closeGuestNamePopup(): void {
        this.isGuestNameOpen.set(false);
    }

    confirmOrder(): void {
        this.isConfirmOrderOpen.set(false);
        this.createOrder();
    }

    closeConfirmOrder(): void {
        this.isConfirmOrderOpen.set(false);
    }


    hasMissingRequiredOptions(): boolean {
        return this.cart().some(item => this.isCartItemMissingRequiredOption(item));
    }

    private isCartItemMissingRequiredOption(item: CartItem): boolean {
        const requiredGroups = (item.food.optionGroups ?? []).filter(group =>
            group.isRequired
        );

        if (requiredGroups.length === 0) return false;

        return requiredGroups.some(group =>
            !item.selectedOptions.some(option =>
                option.optionGroupId === group.id
            )
        );
    }

    applyOptions(options: CartItemOption[]): void {
        const editingId = this.selectingCartId();

        if (editingId !== null) {
            this.cart.update(items =>
                items.map(item =>
                    item.id === editingId
                        ? { ...item, selectedOptions: options }
                        : item
                )
            );

            this.closeOptionPopup();
            return;
        }

        const food = this.pendingFood();

        if (!food) {
            this.closeOptionPopup();
            return;
        }

        const existed = this.cart().find(item =>
            item.food.id === food.id &&
            this.sameOptions(item.selectedOptions, options)
        );

        if (existed) {
            this.increase(existed.id);
        } else {
            this.cart.update(items => [
                ...items,
                {
                    id: this.nextCartItemId++,
                    food,
                    quantity: 1,
                    note: '',
                    selectedOptions: options,
                    isDetailLoaded: true
                }
            ]);
        }

        this.closeOptionPopup();
    }

    private sameOptions(a: CartItemOption[], b: CartItemOption[]): boolean {
        if (a.length !== b.length) return false;

        const aIds = a.map(option => option.optionId).sort();
        const bIds = b.map(option => option.optionId).sort();

        return aIds.every((id, index) => id === bIds[index]);
    }

    closeOptionPopup(): void {
        this.isOptionPopupOpen.set(false);
        this.selectingCartId.set(null);
        this.pendingFood.set(null);
    }

    createOrder(): void {
        if (this.cart().length === 0 || this.ordering()) return;

        this.ordering.set(true);

        const request = {
            storeRefCode: this.storeRefCode(),
            note: this.orderNote().trim() || null,
            items: this.cart().map(item => ({
                storeFoodId: item.food.id,
                quantity: item.quantity,
                options: item.selectedOptions.map(option => ({
                    optionGroupId: option.optionGroupId,
                    optionGroupName: option.optionGroupName,
                    optionId: option.optionId,
                    optionName: option.optionName,
                    additionalPrice: option.additionalPrice
                }))
            })),
            selectedGifts: this.selectedGifts(),
            selectedStoreWideDiscounts: this.selectedStoreWideDiscounts(),
            promoCode: this.appliedPromoCode(),
            paymentMethod: this.paymentMethod()
        };

        const createOrder$ = this.isLoggedIn()
            ? this.orderService.create(request)
            : this.orderService.createGuest({
                ...request,
                customerName: this.guestCustomerName().trim(),
                deviceId: this.guestService.getGuestToken()
            });

        createOrder$.subscribe({
            next: response => {
                if (!response.isSuccess) {
                    this.ordering.set(false);
                    this.toastService.error(response.message);
                    return;
                }

                const order = response.data;
                if (!order) {
                    this.ordering.set(false);
                    this.toastService.error('Không tạo được đơn hàng');
                    return;
                }
                this.cart.set([]);
                this.orderNote.set('');
                this.selectedGifts.set([]);
                this.selectedStoreWideDiscounts.set([]);
                this.appliedPromoCode.set(null);
                this.promoCodeInput.set('');

                const currentRefCode = this.storeRefCode();
                if (currentRefCode) {
                    this.checkStoreWideDiscountEligibility(currentRefCode);
                }
                this.closeMobileCart();

                if (order.totalAmount <= 0 || order.paymentStatus === 'PAID') {
                    this.toastService.success('Tạo đơn hàng thành công!');
                    this.ordering.set(false);
                    return;
                }

                if (order.paymentMethod === 'CASH') {
                    this.toastService.success('Tạo đơn hàng thành công! Vui lòng thanh toán tiền mặt khi nhận món.');
                    this.ordering.set(false);
                    return;
                }

                this.orderService.getStorePaymentInfo(
                    order.orderCode
                ).subscribe({
                    next: (res) => {
                        if (!res.isSuccess) {
                            this.toastService.error(res.message);
                            return;
                        }

                        this.qrData.set(res.data);
                        this.isQrPopupOpen.set(true);
                        this.startPaymentPolling(order.orderCode);
                    },
                    error: () => {
                        this.toastService.error('Không tạo được QR thanh toán');
                    }
                });

                this.ordering.set(false);
            },
            error: () => {
                this.ordering.set(false);
                this.toastService.error('Không thể tạo đơn hàng');
            }
        });
    }

    hasGuestProfile = computed(() =>
        this.guestService.customerName().trim().length > 0
    );

    back(): void {
        this.router.navigate([
            '/',
            URL_ENDPOINT.USER,
            URL_ENDPOINT.USER_STORES
        ]);
    }

    openMobileCart(): void {
        this.isMobileCartOpen.set(true);
    }

    closeMobileCart(): void {
        this.isMobileCartOpen.set(false);
    }

    getItemAmount(item: CartItem): number {
        return this.getLineTotal(item);
    }

    getOptionText(item: CartItem): string {
        if (item.selectedOptions.length === 0) return '';

        return item.selectedOptions
            .map(option => `${option.optionGroupName}: ${option.optionName}`)
            .join(', ');
    }

    hasOptions(food: StoreFoodResponse): boolean {
        return (food.optionGroups ?? []).length > 0;
    }

    formatCurrency(value: number): string {
        return `${value.toLocaleString('vi-VN')}đ`;
    }

    flyToCart(food: StoreFoodResponse): void {

        if (this.hasOptions(food)) {
            this.pendingFood.set(food);
            this.selectingCartId.set(null);
            this.isOptionPopupOpen.set(true);
            return;
        }

        // Desktop
        if (window.innerWidth >= 1024) {
            this.addToCart(food);
            return;
        }

        this.animateFly(food.id);

        setTimeout(() => {
            this.addToCart(food);
        }, 450);
    }

    private startPaymentPolling(orderCode: string) {
        clearInterval(this.paymentInterval);

        this.paymentInterval = setInterval(() => {
            this.orderService.getPaymentStatus(orderCode).subscribe({
                next: res => {
                    if (res.isSuccess && res.data === 'CANCELLED') {
                        clearInterval(this.paymentInterval);

                        this.isQrPopupOpen.set(false);
                        this.toastService.error('Đơn hàng đã bị hủy');
                        return;
                    }

                    if (res.isSuccess && res.data === 'PAID') {
                        clearInterval(this.paymentInterval);

                        this.isQrPopupOpen.set(false);
                        this.toastService.success('Thanh toán thành công');

                        this.router.navigate(['/success'], {
                            queryParams: {
                                orderCode,
                                amount: this.qrData()?.amount ?? null
                            }
                        });
                    }
                },
                error: () => {
                    clearInterval(this.paymentInterval);
                    this.toastService.error('Lỗi kiểm tra thanh toán');
                }
            });
        }, 1500);
    }

    private animateFly(foodId: number) {

        const img = document.getElementById(`food-img-${foodId}`);
        const cart = document.getElementById("mobile-cart-btn");

        if (!img || !cart) return;

        const imgRect = img.getBoundingClientRect();
        const cartRect = cart.getBoundingClientRect();

        const clone = img.cloneNode(true) as HTMLImageElement;

        clone.style.position = "fixed";
        clone.style.left = imgRect.left + "px";
        clone.style.top = imgRect.top + "px";
        clone.style.width = imgRect.width + "px";
        clone.style.height = imgRect.height + "px";
        clone.style.borderRadius = "14px";
        clone.style.pointerEvents = "none";
        clone.style.zIndex = "9999";
        clone.style.transition =
            "all .55s cubic-bezier(.22,.8,.3,1)";

        document.body.appendChild(clone);

        requestAnimationFrame(() => {

            clone.style.left =
                cartRect.left + cartRect.width / 2 - 18 + "px";

            clone.style.top =
                cartRect.top + cartRect.height / 2 - 18 + "px";

            clone.style.width = "36px";
            clone.style.height = "36px";

            clone.style.opacity = "0";

            clone.style.transform = "rotate(360deg) scale(.2)";

        });

        clone.addEventListener("transitionend", () => {

            clone.remove();

            cart.classList.add("cart-bounce");

            setTimeout(() => {
                cart.classList.remove("cart-bounce");
            }, 500);

        });

    }

    private resumePayment(orderCode: string): void {
        this.orderService.getPaymentStatus(orderCode).subscribe({
            next: status => {
                if (!status.isSuccess || status.data !== 'UNPAID') {
                    return;
                }

                this.orderService.getStorePaymentInfo(orderCode).subscribe({
                    next: res => {
                        if (!res.isSuccess) {
                            return;
                        }

                        this.qrData.set(res.data);
                        this.isQrPopupOpen.set(true);
                        this.startPaymentPolling(orderCode);
                    }
                });
            }
        });
    }
}