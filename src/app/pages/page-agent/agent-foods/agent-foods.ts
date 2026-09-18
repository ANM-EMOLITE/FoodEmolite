import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AppTableComponent } from '../../../shared/component/table/table';
import { FilterComponent } from '../../../shared/component/filter/filter';
import { ToastService } from '../../../common/services/toast.service';
import { StoreFoodService } from '../../../common/services/store-food.service';
import { ProfileService } from '../../../common/services/profile.service';
import { RealtimeService } from '../../../common/services/realtime.service';
import { PromotionService } from '../../../common/services/promotion.service';
import { FilterField } from '../../../common/models/front-end/filter/filter-field.model';
import {
    TableColumn,
    TableRow
} from '../../../common/models/front-end/table/table-column.model';
import {
    CreateStoreFoodRequest,
    StoreFoodResponse,
    UpdateStoreFoodRequest
} from '../../../common/models/store-food.model';
import { PromotionResponse } from '../../../common/models/promotion.model';
import { getPromotionalPrice } from '../../../common/utils/promotion-pricing';
import { PopUpAgentFoodAddComponent } from './pop-up-agent-food-add/pop-up-agent-food-add';
import { PopUpAgentFoodDetailComponent } from './pop-up-agent-food-detail/pop-up-agent-food-detail';
import { StoreFoodCategoryService } from '../../../common/services/store-food-category.service';
import { URL_ENDPOINT } from '../../../common/constants/url-endpoint';

interface StoreFoodFilter {
    foodName: string;
    isAvailable: boolean | '';
    categoryId: number | '';
}

@Component({
    selector: 'app-page-agent-foods',
    imports: [
        AppTableComponent,
        FilterComponent,
        PopUpAgentFoodAddComponent,
        PopUpAgentFoodDetailComponent
    ],
    templateUrl: './agent-foods.html'
})
export class PageAgentFoodsComponent {
    private readonly storeFoodService = inject(StoreFoodService);
    private readonly profileService = inject(ProfileService);
    private readonly toastService = inject(ToastService);
    private readonly categoryService = inject(StoreFoodCategoryService);
    private readonly realtimeService = inject(RealtimeService);
    private readonly promotionService = inject(PromotionService);

    activePromotions = signal<PromotionResponse[]>([]);

    storeFoods = signal<StoreFoodResponse[]>([]);
    selectedFood = signal<StoreFoodResponse | null>(null);
    storeRefCode = signal<string | null>(null);

    page = signal(1);
    pageSize = signal(30);
    totalPages = signal(1);
    loading = signal(false);
    isSubmitting = signal(false);
    isDetailLoading = signal(false);

    isAddOpen = signal(false);
    isDetailOpen = signal(false);
    isDetailRendered = signal(false);

    sortBy = signal('');
    asc = signal(false);

    filter = signal<StoreFoodFilter>({
        foodName: '',
        isAvailable: '',
        categoryId: ''
    });

    categoryOptions: {
        label: string;
        value: number | '';
    }[] = [];

    categoryDropdownOptions: {
        label: string;
        value: number;
    }[] = [];

    columns: TableColumn[] = [
        {
            key: 'index',
            label: 'STT',
            width: '80px',
            align: 'center'
        },
        {
            key: 'thumbnailUrl',
            label: 'Ảnh',
            width: '40px',
            align: 'center',
            type: 'image'
        },
        {
            key: 'foodName',
            label: 'Tên món',
            width: '180px',
            sortable: true
        },
        {
            key: 'price',
            label: 'Giá',
            width: '160px',
            align: 'right',
            sortable: true
        },
        {
            key: 'promotionBadge',
            label: 'Khuyến mãi',
            width: '120px',
            align: 'center',
            type: 'badge'
        },
        {
            key: 'quantity',
            label: 'Số lượng',
            width: '120px',
            align: 'center',
            sortable: true
        },
        {
            key: 'isAvailable',
            label: 'Trạng thái',
            width: '150px',
            align: 'center',
            type: 'toggle'
        },
        {
            key: 'description',
            label: 'Mô tả',
            width: '220px'
        },
    ];

    filterFields: FilterField[] = [];
    private updateFilterFields(): void {
        this.filterFields = [
            {
                key: 'foodName',
                label: 'Tên món',
                type: 'text',
                placeholder: 'Nhập tên món'
            },
            {
                key: 'categoryId',
                label: 'Danh mục',
                type: 'select',
                placeholder: 'Tất cả danh mục',
                options: this.categoryOptions
            },
            {
                key: 'isAvailable',
                label: 'Trạng thái',
                type: 'select',
                placeholder: 'Tất cả trạng thái',
                options: [
                    {
                        label: 'Đang bán',
                        value: true
                    },
                    {
                        label: 'Ngừng bán',
                        value: false
                    }
                ]
            }
        ];
    }
    constructor() {
        this.updateFilterFields();
        this.loadMyStore();

        this.realtimeService.foodQuantityChanged$
            .pipe(takeUntilDestroyed())
            .subscribe(notification => {
                if (notification.storeRefCode !== this.storeRefCode()) {
                    return;
                }

                this.storeFoods.update(list =>
                    list.map(f => f.id === notification.storeFoodId
                        ? { ...f, quantity: notification.quantity }
                        : f
                    )
                );
            });

        this.realtimeService.promotionStatusChanged$
            .pipe(takeUntilDestroyed())
            .subscribe(notification => {
                if (notification.storeRefCode !== this.storeRefCode()) {
                    return;
                }

                this.loadActivePromotions();
            });
    }

    rows(): TableRow[] {
        return this.storeFoods().map((food, index) => {
            // Bảng quản lý món của agent — không có ngữ cảnh giỏ hàng thật, nên coi như đã đạt mọi điều
            // kiện "mua tối thiểu" để agent luôn thấy giá khuyến mãi đã cấu hình cho món này.
            const pricing = getPromotionalPrice(
                food.id, food.price, this.activePromotions(),
                Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER
            );

            return {
                index: (this.page() - 1) * this.pageSize() + index + 1,
                id: food.id,
                refCode: food.refCode,
                storeRefCode: food.storeRefCode,
                thumbnailUrl: food.thumbnailUrl,
                foodName: food.foodName,
                price: pricing.hasPromotion
                    ? `${this.formatCurrency(pricing.effectivePrice)} (gốc ${this.formatCurrency(pricing.originalPrice)})`
                    : this.formatCurrency(food.price),
                promotionBadge: pricing.hasPromotion
                    ? { text: 'Đang KM', value: 'PROMO' }
                    : { text: '—', value: '' },
                quantity: food.quantity,
                description: food.description ?? '',
                isAvailable: food.isAvailable
            };
        });
    }

    loadMyStore(): void {
        this.loading.set(true);

        this.profileService.getMyProfile().subscribe({
            next: response => {
                if (!response.isSuccess || !response.data?.store?.refCode) {
                    this.loading.set(false);
                    this.toastService.error('Không tìm thấy cửa hàng của đại lý');
                    return;
                }

                this.storeRefCode.set(response.data.store.refCode);
                this.loadCategories();
                this.loadStoreFoods();
                this.loadActivePromotions();
            },
            error: () => {
                this.loading.set(false);
                this.toastService.error('Không tải được thông tin đại lý');
            }
        });
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
    }

    loadCategories(): void {
        const refCode = this.storeRefCode();

        if (!refCode) {
            return;
        }

        this.categoryService
            .getByStoreRefCode(refCode)
            .subscribe({
                next: response => {
                    if (response.isSuccess && response.data) {
                        this.categoryOptions = [
                            { label: 'Tất cả danh mục', value: '' },
                            ...response.data.map(x => ({
                                label: x.categoryName,
                                value: x.id
                            }))
                        ];

                        this.categoryDropdownOptions = response.data.map(x => ({
                            label: x.categoryName,
                            value: x.id
                        }));

                        this.updateFilterFields();
                    }
                }
            });
    }

    loadStoreFoods(): void {
        const refCode = this.storeRefCode();

        if (!refCode) {
            this.loading.set(false);
            return;
        }

        this.loading.set(true);

        this.storeFoodService.getByStoreRefCode(
            refCode,
            this.filter().categoryId || null,
            this.page(),
            this.pageSize(),
            this.sortBy() || null,
            this.asc()
        ).subscribe({
            next: response => {
                this.storeFoods.set(response.items);
                this.totalPages.set(response.totalPages);
                this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
                this.toastService.error('Không tải được danh sách món ăn');
            }
        });
    }

    openCreateModal(): void {
        this.isAddOpen.set(true);
    }

    copyOrderLink(): void {
        const refCode = this.storeRefCode();

        if (!refCode) return;

        const url = `${window.location.origin}/${URL_ENDPOINT.USER}/${URL_ENDPOINT.USER_STORE_FOODS}/${URL_ENDPOINT.USER_ORDER}?storeRefCode=${refCode}`;

        navigator.clipboard.writeText(url).then(
            () => this.toastService.success('Đã sao chép link đặt món'),
            () => this.toastService.error('Không thể sao chép link')
        );
    }

    closeCreateModal(): void {
        this.isAddOpen.set(false);
    }

    createFood(request: CreateStoreFoodRequest): void {
        this.isSubmitting.set(true);

        this.storeFoodService.create(request).subscribe({
            next: response => {
                this.isSubmitting.set(false);

                if (!response.isSuccess) {
                    this.toastService.error(response.message);
                    return;
                }

                this.toastService.success(response.message);
                this.closeCreateModal();
                this.loadStoreFoods();
            },
            error: () => {
                this.isSubmitting.set(false);
                this.toastService.error('Thêm món ăn thất bại');
            }
        });
    }

    openDetail(row: TableRow): void {
        const id = Number(row['id']);

        this.isDetailLoading.set(true);

        this.storeFoodService.getDetail(id).subscribe({
            next: response => {
                this.isDetailLoading.set(false);

                if (!response.isSuccess || !response.data) {
                    this.toastService.error(response.message);
                    return;
                }

                this.selectedFood.set(response.data);
                this.isDetailRendered.set(true);
                this.isDetailOpen.set(true);
            },
            error: () => {
                this.isDetailLoading.set(false);
                this.toastService.error('Không lấy được chi tiết món ăn');
            }
        });
    }

    closeDetail(): void {
        this.isDetailOpen.set(false);

        setTimeout(() => {
            this.isDetailRendered.set(false);
            this.selectedFood.set(null);
        }, 200);
    }

    onToggleAvailable(event: { row: TableRow; value: boolean }): void {
        const id = Number(event.row['id']);
        const food = this.storeFoods().find(f => f.id === id);

        if (!food) return;

        const previousValue = food.isAvailable;
        this.storeFoods.update(list =>
            list.map(f => f.id === id ? { ...f, isAvailable: event.value } : f)
        );

        const request: UpdateStoreFoodRequest = {
            foodName: food.foodName,
            description: food.description,
            price: food.price,
            quantity: food.quantity,
            isAvailable: event.value,
            storeFoodCategoryId: food.storeFoodCategoryId,
            optionGroups: food.optionGroups?.map(g => ({
                id: g.id,
                groupName: g.groupName,
                isRequired: g.isRequired,
                minSelect: g.minSelect,
                maxSelect: g.maxSelect,
                sortOrder: g.sortOrder,
                isDeleted: false,
                options: g.options?.map(o => ({
                    id: o.id,
                    optionName: o.optionName,
                    additionalPrice: o.additionalPrice,
                    isAvailable: o.isAvailable,
                    sortOrder: o.sortOrder,
                    isDeleted: false
                })) ?? []
            })) ?? []
        };

        this.storeFoodService.update(id, request).subscribe({
            next: response => {
                if (!response.isSuccess) {
                    this.storeFoods.update(list =>
                        list.map(f => f.id === id ? { ...f, isAvailable: previousValue } : f)
                    );
                    this.toastService.error(response.message);
                }
            },
            error: () => {
                this.storeFoods.update(list =>
                    list.map(f => f.id === id ? { ...f, isAvailable: previousValue } : f)
                );
                this.toastService.error('Cập nhật trạng thái thất bại');
            }
        });
    }

    updateFood(request: UpdateStoreFoodRequest): void {
        const food = this.selectedFood();

        if (!food) return;

        this.isSubmitting.set(true);

        this.storeFoodService.update(food.id, request).subscribe({
            next: response => {
                this.isSubmitting.set(false);

                if (!response.isSuccess) {
                    this.toastService.error(response.message);
                    return;
                }

                this.toastService.success(response.message);
                this.closeDetail();
                this.loadStoreFoods();
            },
            error: () => {
                this.isSubmitting.set(false);
                this.toastService.error('Cập nhật món ăn thất bại');
            }
        });
    }

    deleteFood(id: number): void {
        this.isSubmitting.set(true);

        this.storeFoodService.delete(id).subscribe({
            next: response => {
                this.isSubmitting.set(false);

                if (!response.isSuccess) {
                    this.toastService.error(response.message);
                    return;
                }

                this.toastService.success(response.message);
                this.closeDetail();
                this.loadStoreFoods();
            },
            error: () => {
                this.isSubmitting.set(false);
                this.toastService.error('Xóa món ăn thất bại');
            }
        });
    }

    onPageChange(page: number): void {
        this.page.set(page);
        this.loadStoreFoods();
    }

    onFilterChange(value: StoreFoodFilter): void {
        this.filter.set(value);
        this.page.set(1);
        this.loadStoreFoods();
    }

    onSortChange(key: string): void {
        if (this.sortBy() === key) {
            this.asc.set(!this.asc());
        } else {
            this.sortBy.set(key);
            this.asc.set(true);
        }

        this.page.set(1);
        this.loadStoreFoods();
    }

    private formatCurrency(value: number): string {
        return `${value.toLocaleString('vi-VN')}đ`;
    }
}