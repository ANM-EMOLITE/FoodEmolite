import { Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { ToastService } from '../../../../common/services/toast.service';
import { PromotionService } from '../../../../common/services/promotion.service';
import { ProfileService } from '../../../../common/services/profile.service';
import { StoreFoodService } from '../../../../common/services/store-food.service';
import { DatePickerComponent } from '../../../../shared/component/date-picker/date-picker';
import { CheckboxComponent } from '../../../../shared/component/checkbox/checkbox';
import { URL_ENDPOINT } from '../../../../common/constants/url-endpoint';
import {
    CreatePromotionRequest,
    PromotionConditionType,
    PromotionDiscountItemRequest,
    PromotionDiscountType,
    PromotionFixedPriceItemRequest,
    PromotionGiftItemRequest,
    PromotionResponse,
    PromotionType
} from '../../../../common/models/promotion.model';

interface FoodItem {
    id: number;
    name: string;
    price: number;
}

/** Giá trị khuyến mãi của 1 món — dùng chung cho cả 3 loại, mỗi loại chỉ đọc field của mình. */
interface ItemValue {
    fixedPrice: number | null;
    discountType: PromotionDiscountType;
    discountValue: number | null;
    maxDiscountAmount: number | null;
    giftQuantity: number | null;
}

interface PromotionFormState {
    promotionCode: string;
    promotionType: PromotionType;
    name: string;
    description: string;
    startDate: string;
    hasEndDate: boolean;
    endDate: string;
    allDay: boolean;
    startTime: string;
    endTime: string;
    selectedDays: boolean[];
    conditionType: PromotionConditionType;
    conditionMinAmount: number | null;
    conditionMinQuantity: number | null;
    // Chỉ dùng khi promotionType = PRODUCT_DISCOUNT: giảm giá toàn bộ sản phẩm, khách tự chọn 1 món lúc thanh toán
    applyToAllProducts: boolean;
}

interface TypeOption {
    value: PromotionType;
    label: string;
    description: string;
}

const DAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const TYPE_OPTIONS: TypeOption[] = [
    { value: 'FIXED_PRICE', label: 'Đồng giá', description: 'Bán các món đã chọn cùng 1 mức giá' },
    { value: 'PRODUCT_DISCOUNT', label: 'Giảm giá sản phẩm', description: 'Giảm theo % hoặc số tiền trên từng món' },
    { value: 'BUY_X_GET_Y', label: 'Mua X tặng Y', description: 'Đủ điều kiện mua thì được tặng món' }
];

const CONDITION_OPTIONS: { value: PromotionConditionType; label: string }[] = [
    { value: 'NONE', label: 'Không điều kiện' },
    { value: 'MIN_ORDER_AMOUNT', label: 'Đơn tối thiểu (đ)' },
    { value: 'MIN_QUANTITY', label: 'Số lượng món tối thiểu' }
];

const defaultItemValue =(): ItemValue => ({
    fixedPrice: null,
    discountType: 'PERCENT',
    discountValue: null,
    maxDiscountAmount: null,
    giftQuantity: 1
});

@Component({
    selector: 'app-page-agent-promotion-form',
    imports: [NgTemplateOutlet, FormsModule, DatePickerComponent, CheckboxComponent],
    templateUrl: './agent-promotion-form.html'
})
export class PageAgentPromotionFormComponent {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly toastService = inject(ToastService);
    private readonly promotionService = inject(PromotionService);
    private readonly profileService = inject(ProfileService);
    private readonly storeFoodService = inject(StoreFoodService);

    readonly dayLabels = DAY_LABELS;
    readonly typeOptions = TYPE_OPTIONS;
    readonly conditionOptions = CONDITION_OPTIONS;

    readonly editingId = signal<number | null>(null);
    readonly loading = signal(true);
    readonly isSubmitting = signal(false);

    readonly form = signal<PromotionFormState>({
        promotionCode: '',
        promotionType: 'FIXED_PRICE',
        name: '',
        description: '',
        startDate: new Date().toISOString().split('T')[0],
        hasEndDate: false,
        endDate: '',
        allDay: true,
        startTime: '',
        endTime: '',
        selectedDays: [true, true, true, true, true, true, true],
        conditionType: 'NONE',
        conditionMinAmount: null,
        conditionMinQuantity: null,
        applyToAllProducts: false
    });

    readonly foods = signal<FoodItem[]>([]);
    readonly foodKeyword = signal('');
    readonly showSelectedOnly = signal(false);

    /** Món đã chọn theo thứ tự chọn (thứ tự này dùng làm sortOrder cho quà tặng). */
    readonly selectedIds = signal<number[]>([]);
    /** Giá trị riêng của từng món — chỉ dùng khi tắt "cùng một mức cho tất cả món". */
    readonly itemValues = signal<Map<number, ItemValue>>(new Map());
    /** Bật: mọi món đã chọn dùng chung `sharedValue` (nhập 1 lần). Tắt: nhập riêng từng món. */
    readonly syncValues = signal(true);
    readonly sharedValue = signal<ItemValue>(defaultItemValue());

    readonly isEditMode = computed(() => this.editingId() !== null);

    readonly selectedIdSet = computed(() => new Set(this.selectedIds()));

    readonly filteredFoods = computed(() => {
        const keyword = this.foodKeyword().trim().toLowerCase();
        const selected = this.selectedIdSet();

        return this.foods().filter(food =>
            (!keyword || food.name.toLowerCase().includes(keyword)) &&
            (!this.showSelectedOnly() || selected.has(food.id))
        );
    });

    readonly allFilteredSelected = computed(() => {
        const list = this.filteredFoods();
        const selected = this.selectedIdSet();

        return list.length > 0 && list.every(food => selected.has(food.id));
    });

    readonly someFilteredSelected = computed(() => {
        const selected = this.selectedIdSet();

        return !this.allFilteredSelected() && this.filteredFoods().some(food => selected.has(food.id));
    });

    constructor() {
        const idParam = this.route.snapshot.paramMap.get('id');
        const id = idParam ? Number(idParam) : null;

        if (id) {
            this.editingId.set(id);
        }

        this.loadData(id);
    }

    private loadData(id: number | null): void {
        this.profileService.getMyProfile().subscribe({
            next: response => {
                const refCode = response.data?.store?.refCode;

                if (!response.isSuccess || !refCode) {
                    this.loading.set(false);
                    this.toastService.error('Không tìm thấy cửa hàng của đại lý');
                    return;
                }

                forkJoin({
                    foods: this.storeFoodService.getByStoreRefCode(refCode, null, 1, 500),
                    promotion: id ? this.promotionService.getDetail(id) : of(null)
                }).subscribe({
                    next: ({ foods, promotion }) => {
                        this.foods.set(foods.items.map(food => ({
                            id: food.id,
                            name: food.foodName,
                            price: food.price
                        })));

                        if (promotion) {
                            if (!promotion.isSuccess || !promotion.data) {
                                this.toastService.error(promotion.message || 'Không tìm thấy chương trình khuyến mãi');
                                this.goBack();
                                return;
                            }

                            if (promotion.data.status !== 'DRAFT') {
                                this.toastService.error('Chỉ chỉnh sửa được chương trình đang ở dạng nháp');
                                this.goBack();
                                return;
                            }

                            this.fillFromPromotion(promotion.data);
                        }

                        this.loading.set(false);
                    },
                    error: () => {
                        this.loading.set(false);
                        this.toastService.error('Không tải được dữ liệu');
                    }
                });
            },
            error: () => {
                this.loading.set(false);
                this.toastService.error('Không tải được thông tin đại lý');
            }
        });
    }

    private fillFromPromotion(promo: PromotionResponse): void {
        this.form.set({
            promotionCode: promo.promotionCode ?? '',
            promotionType: promo.promotionType,
            name: promo.name,
            description: promo.description ?? '',
            startDate: promo.startDate,
            hasEndDate: !!promo.endDate,
            endDate: promo.endDate ?? '',
            allDay: !promo.startTime || !promo.endTime,
            startTime: promo.startTime ? promo.startTime.slice(0, 5) : '',
            endTime: promo.endTime ? promo.endTime.slice(0, 5) : '',
            selectedDays: Array.from({ length: 7 }, (_, index) => (promo.daysOfWeekMask & (1 << index)) !== 0),
            conditionType: promo.conditionType,
            conditionMinAmount: promo.conditionMinAmount,
            conditionMinQuantity: promo.conditionMinQuantity,
            applyToAllProducts: promo.applyToAllProducts
        });

        let entries: [number, ItemValue][] = [];

        if (promo.promotionType === 'FIXED_PRICE') {
            entries = promo.fixedPriceItems.map(item => [
                item.storeFoodId,
                { ...defaultItemValue(), fixedPrice: item.fixedPrice }
            ]);
        } else if (promo.promotionType === 'PRODUCT_DISCOUNT') {
            if (promo.applyToAllProducts) {
                this.sharedValue.set({
                    ...defaultItemValue(),
                    discountType: promo.discountType ?? 'PERCENT',
                    discountValue: promo.discountValue,
                    maxDiscountAmount: promo.maxDiscountAmount
                });
            }

            entries = promo.discountItems.map(item => [
                item.storeFoodId,
                {
                    ...defaultItemValue(),
                    discountType: item.discountType,
                    discountValue: item.discountValue,
                    maxDiscountAmount: item.maxDiscountAmount
                }
            ]);
        } else {
            entries = [...promo.giftItems]
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map(item => [item.storeFoodId, { ...defaultItemValue(), giftQuantity: item.giftQuantity }]);
        }

        if (!entries.length) {
            return;
        }

        this.selectedIds.set(entries.map(([id]) => id));
        this.itemValues.set(new Map(entries));

        // Nếu mọi món đang cùng một mức thì mở ở chế độ đồng bộ cho gọn; khác nhau thì mở chế độ nhập riêng.
        const values = entries.map(([, value]) => JSON.stringify(value));
        const allSame = values.every(value => value === values[0]);

        this.syncValues.set(allSame);
        this.sharedValue.set(allSame ? { ...entries[0][1] } : defaultItemValue());
    }

    // ===== Form chung =====

    patchForm(patch: Partial<PromotionFormState>): void {
        this.form.update(value => ({ ...value, ...patch }));
    }

    selectType(type: PromotionType): void {
        this.patchForm({ promotionType: type });
    }

    toggleDay(index: number): void {
        const days = [...this.form().selectedDays];
        days[index] = !days[index];
        this.patchForm({ selectedDays: days });
    }

    setDaysPreset(preset: 'ALL' | 'WEEKDAYS' | 'WEEKEND'): void {
        const days = DAY_LABELS.map((_, index) =>
            preset === 'ALL' ? true :
            preset === 'WEEKDAYS' ? index < 5 :
            index >= 5
        );

        this.patchForm({ selectedDays: days });
    }

    // ===== Chọn món =====

    isSelected(id: number): boolean {
        return this.selectedIdSet().has(id);
    }

    toggleFood(id: number): void {
        if (this.isSelected(id)) {
            this.selectedIds.update(ids => ids.filter(x => x !== id));
            return;
        }

        this.selectedIds.update(ids => [...ids, id]);

        // Món mới chọn lấy sẵn mức đang dùng chung để không phải nhập lại từ đầu.
        if (!this.itemValues().has(id)) {
            this.itemValues.update(map => new Map(map).set(id, { ...this.sharedValue() }));
        }
    }

    /** Chọn tất cả món (đang lọc) — tự bật chế độ đồng bộ để nhập 1 mức cho tất cả cho nhanh. */
    toggleSelectAllFiltered(): void {
        const filteredIds = this.filteredFoods().map(food => food.id);

        if (this.allFilteredSelected()) {
            const removing = new Set(filteredIds);
            this.selectedIds.update(ids => ids.filter(id => !removing.has(id)));
            return;
        }

        const selected = this.selectedIdSet();
        this.selectedIds.update(ids => [...ids, ...filteredIds.filter(id => !selected.has(id))]);
        this.syncValues.set(true);
    }

    clearSelection(): void {
        this.selectedIds.set([]);
        this.showSelectedOnly.set(false);
    }

    setSyncValues(enabled: boolean): void {
        // Tắt đồng bộ: mọi món đã chọn bắt đầu từ mức đang dùng chung, sau đó sửa riêng từng món.
        if (!enabled) {
            const shared = this.sharedValue();
            this.itemValues.update(map => {
                const next = new Map(map);
                this.selectedIds().forEach(id => next.set(id, { ...shared }));
                return next;
            });
        }

        this.syncValues.set(enabled);
    }

    patchShared(patch: Partial<ItemValue>): void {
        this.sharedValue.update(value => ({ ...value, ...patch }));
    }

    valueOf(id: number): ItemValue {
        return this.itemValues().get(id) ?? this.sharedValue();
    }

    patchItem(id: number, patch: Partial<ItemValue>): void {
        this.itemValues.update(map => new Map(map).set(id, { ...this.valueOf(id), ...patch }));
    }

    /** Giá trị thực tế sẽ lưu cho món: chế độ đồng bộ thì lấy mức chung. */
    effectiveValue(id: number): ItemValue {
        return this.syncValues() ? this.sharedValue() : this.valueOf(id);
    }

    /** Giá sau khuyến mãi để xem trước (null nếu chưa nhập đủ hoặc loại không đổi giá). */
    previewPrice(food: FoodItem): number | null {
        const value = this.effectiveValue(food.id);
        const type = this.form().promotionType;

        if (type === 'FIXED_PRICE') {
            return value.fixedPrice && value.fixedPrice > 0 ? value.fixedPrice : null;
        }

        if (type === 'PRODUCT_DISCOUNT') {
            if (!value.discountValue || value.discountValue <= 0) {
                return null;
            }

            let discount = value.discountType === 'PERCENT'
                ? food.price * value.discountValue / 100
                : value.discountValue;

            if (value.discountType === 'PERCENT' && value.maxDiscountAmount) {
                discount = Math.min(discount, value.maxDiscountAmount);
            }

            return Math.max(0, Math.round(food.price - discount));
        }

        return null;
    }

    usesFoodList(): boolean {
        const value = this.form();
        return !(value.promotionType === 'PRODUCT_DISCOUNT' && value.applyToAllProducts);
    }

    selectedCount(): number {
        return this.selectedIds().length;
    }

    // ===== Tóm tắt =====

    typeLabel(): string {
        return TYPE_OPTIONS.find(x => x.value === this.form().promotionType)?.label ?? '';
    }

    scheduleSummary(): string {
        const value = this.form();
        const start = value.startDate ? this.formatShortDate(value.startDate) : '—';
        const end = value.hasEndDate && value.endDate ? this.formatShortDate(value.endDate) : 'không giới hạn';

        return `${start} → ${end}`;
    }

    timeSummary(): string {
        const value = this.form();
        return value.allDay ? 'Cả ngày' : `${value.startTime || '--:--'} – ${value.endTime || '--:--'}`;
    }

    daysSummary(): string {
        const days = this.form().selectedDays;

        if (days.every(Boolean)) return 'Cả tuần';
        if (!days.some(Boolean)) return 'Chưa chọn ngày';

        return DAY_LABELS.filter((_, index) => days[index]).join(', ');
    }

    conditionSummary(): string {
        const value = this.form();

        switch (value.conditionType) {
            case 'MIN_ORDER_AMOUNT':
                return `Đơn từ ${this.formatCurrency(value.conditionMinAmount ?? 0)}`;
            case 'MIN_QUANTITY':
                return `Mua từ ${value.conditionMinQuantity ?? 0} món`;
            default:
                return 'Không điều kiện';
        }
    }

    valueSummary(): string {
        const type = this.form().promotionType;

        if (this.usesFoodList() && !this.syncValues()) {
            return 'Nhập riêng từng món';
        }

        const value = this.sharedValue();

        if (type === 'FIXED_PRICE') {
            return value.fixedPrice ? `Đồng giá ${this.formatCurrency(value.fixedPrice)}` : 'Chưa nhập giá';
        }

        if (type === 'PRODUCT_DISCOUNT') {
            if (!value.discountValue) return 'Chưa nhập mức giảm';

            if (value.discountType === 'AMOUNT') {
                return `Giảm ${this.formatCurrency(value.discountValue)}`;
            }

            return value.maxDiscountAmount
                ? `Giảm ${value.discountValue}% (tối đa ${this.formatCurrency(value.maxDiscountAmount)})`
                : `Giảm ${value.discountValue}%`;
        }

        return `Tặng ${value.giftQuantity ?? 0} / món`;
    }

    formatCurrency(value: number): string {
        return `${value.toLocaleString('vi-VN')}đ`;
    }

    private formatShortDate(value: string): string {
        return new Date(value).toLocaleDateString('vi-VN');
    }

    // ===== Lưu =====

    goBack(): void {
        this.router.navigate(['/', URL_ENDPOINT.AGENT, URL_ENDPOINT.AGENT_PROMOTIONS]);
    }

    submit(saveAsDraft: boolean): void {
        const request = this.buildRequest(saveAsDraft);

        if (!request) {
            return;
        }

        const id = this.editingId();

        this.isSubmitting.set(true);

        const save$ = id
            ? this.promotionService.update(id, request)
            : this.promotionService.create(request);

        save$.subscribe({
            next: response => {
                this.isSubmitting.set(false);

                if (!response.isSuccess) {
                    this.toastService.error(response.message);
                    return;
                }

                this.toastService.success(response.message);
                this.goBack();
            },
            error: () => {
                this.isSubmitting.set(false);
                this.toastService.error(id ? 'Cập nhật chương trình khuyến mãi thất bại' : 'Tạo chương trình khuyến mãi thất bại');
            }
        });
    }

    private buildRequest(saveAsDraft: boolean): CreatePromotionRequest | null {
        const value = this.form();

        if (!value.name.trim()) {
            return this.fail('Vui lòng nhập tên chương trình');
        }

        if (!value.startDate) {
            return this.fail('Vui lòng chọn ngày bắt đầu');
        }

        if (value.hasEndDate && !value.endDate) {
            return this.fail('Vui lòng chọn ngày kết thúc');
        }

        if (value.hasEndDate && value.endDate < value.startDate) {
            return this.fail('Ngày kết thúc phải sau ngày bắt đầu');
        }

        if (!value.allDay && (!value.startTime || !value.endTime)) {
            return this.fail('Vui lòng nhập đủ khung giờ áp dụng');
        }

        const daysOfWeekMask = value.selectedDays.reduce(
            (mask, selected, index) => selected ? mask | (1 << index) : mask,
            0
        );

        if (daysOfWeekMask === 0) {
            return this.fail('Vui lòng chọn ít nhất 1 ngày áp dụng trong tuần');
        }

        if (value.conditionType === 'MIN_ORDER_AMOUNT' && !(value.conditionMinAmount && value.conditionMinAmount > 0)) {
            return this.fail('Vui lòng nhập giá trị đơn hàng tối thiểu');
        }

        if (value.conditionType === 'MIN_QUANTITY' && !(value.conditionMinQuantity && value.conditionMinQuantity > 0)) {
            return this.fail('Vui lòng nhập số lượng tối thiểu');
        }

        if (value.promotionType === 'BUY_X_GET_Y' && value.conditionType === 'NONE') {
            return this.fail('Chương trình Mua X tặng Y cần điều kiện mua tối thiểu (mua X)');
        }

        const isStoreWide = value.promotionType === 'PRODUCT_DISCOUNT' && value.applyToAllProducts;
        const selectedIds = this.selectedIds();

        if (!isStoreWide && !selectedIds.length) {
            return this.fail('Vui lòng chọn ít nhất 1 món áp dụng');
        }

        let fixedPriceItems: PromotionFixedPriceItemRequest[] = [];
        let discountItems: PromotionDiscountItemRequest[] = [];
        let giftItems: PromotionGiftItemRequest[] = [];

        if (value.promotionType === 'FIXED_PRICE') {
            fixedPriceItems = selectedIds.map(id => ({
                storeFoodId: id,
                fixedPrice: this.effectiveValue(id).fixedPrice ?? 0
            }));

            if (fixedPriceItems.some(item => item.fixedPrice <= 0)) {
                return this.fail('Giá đồng giá phải lớn hơn 0');
            }
        } else if (value.promotionType === 'PRODUCT_DISCOUNT' && !isStoreWide) {
            discountItems = selectedIds.map(id => {
                const item = this.effectiveValue(id);

                return {
                    storeFoodId: id,
                    discountType: item.discountType,
                    discountValue: item.discountValue ?? 0,
                    maxDiscountAmount: item.discountType === 'PERCENT' ? (item.maxDiscountAmount || null) : null
                };
            });

            const error = this.validateDiscount(discountItems);

            if (error) {
                return this.fail(error);
            }
        } else if (value.promotionType === 'BUY_X_GET_Y') {
            giftItems = selectedIds.map((id, index) => ({
                storeFoodId: id,
                giftQuantity: this.effectiveValue(id).giftQuantity ?? 0,
                sortOrder: index
            }));

            if (giftItems.some(item => item.giftQuantity <= 0)) {
                return this.fail('Số lượng quà tặng phải lớn hơn 0');
            }
        }

        const shared = this.sharedValue();

        if (isStoreWide) {
            const error = this.validateDiscount([{ discountType: shared.discountType, discountValue: shared.discountValue ?? 0 }]);

            if (error) {
                return this.fail(error);
            }
        }

        return {
            promotionCode: value.promotionCode.trim() || null,
            promotionType: value.promotionType,
            name: value.name.trim(),
            description: value.description.trim() || null,
            saveAsDraft,
            startDate: value.startDate,
            endDate: value.hasEndDate ? value.endDate : null,
            startTime: value.allDay ? null : value.startTime,
            endTime: value.allDay ? null : value.endTime,
            daysOfWeekMask,
            conditionType: value.conditionType,
            conditionMinAmount: value.conditionType === 'MIN_ORDER_AMOUNT' ? value.conditionMinAmount : null,
            conditionMinQuantity: value.conditionType === 'MIN_QUANTITY' ? value.conditionMinQuantity : null,
            applyToAllProducts: isStoreWide,
            discountType: isStoreWide ? shared.discountType : null,
            discountValue: isStoreWide ? shared.discountValue : null,
            maxDiscountAmount: isStoreWide && shared.discountType === 'PERCENT' ? (shared.maxDiscountAmount || null) : null,
            fixedPriceItems,
            discountItems,
            giftItems
        };
    }

    private validateDiscount(items: { discountType: PromotionDiscountType; discountValue: number }[]): string | null {
        if (items.some(item => item.discountValue <= 0)) {
            return 'Mức giảm phải lớn hơn 0';
        }

        if (items.some(item => item.discountType === 'PERCENT' && item.discountValue > 100)) {
            return 'Giảm theo % không được vượt quá 100%';
        }

        return null;
    }

    private fail(message: string): null {
        this.toastService.error(message);
        return null;
    }
}
