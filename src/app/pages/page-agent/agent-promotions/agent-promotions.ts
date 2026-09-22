import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AppTableComponent } from '../../../shared/component/table/table';
import { FilterComponent } from '../../../shared/component/filter/filter';
import { ConfirmPopupComponent } from '../../../shared/component/confirm-popup/confirm-popup';
import { ToastService } from '../../../common/services/toast.service';
import { PromotionService } from '../../../common/services/promotion.service';
import { ProfileService } from '../../../common/services/profile.service';
import { StoreFoodService } from '../../../common/services/store-food.service';
import { RealtimeService } from '../../../common/services/realtime.service';
import { FilterField } from '../../../common/models/front-end/filter/filter-field.model';
import {
    TableColumn,
    TableRow
} from '../../../common/models/front-end/table/table-column.model';
import {
    CreatePromotionRequest,
    PromotionResponse,
    PromotionSearchRequest
} from '../../../common/models/promotion.model';
import { BaseSearchRequest } from '../../../common/models/base-search.model';
import { DropdownOption } from '../../../shared/component/dropdown/dropdown';
import { PopUpAgentPromotionAddComponent } from './pop-up-agent-promotion-add/pop-up-agent-promotion-add';
import { PopUpAgentPromotionDetailComponent } from './pop-up-agent-promotion-detail/pop-up-agent-promotion-detail';

interface PromotionFilter {
    keyword: string;
    promotionType: string;
    status: string;
}

type ConfirmActionType = 'PAUSE' | 'RESUME' | 'CANCEL' | 'DELETE';

@Component({
    selector: 'app-page-agent-promotions',
    imports: [
        AppTableComponent,
        FilterComponent,
        ConfirmPopupComponent,
        PopUpAgentPromotionAddComponent,
        PopUpAgentPromotionDetailComponent
    ],
    templateUrl: './agent-promotions.html'
})
export class PageAgentPromotionsComponent {
    private readonly promotionService = inject(PromotionService);
    private readonly profileService = inject(ProfileService);
    private readonly storeFoodService = inject(StoreFoodService);
    private readonly toastService = inject(ToastService);
    private readonly realtimeService = inject(RealtimeService);

    promotions = signal<PromotionResponse[]>([]);
    selectedPromotion = signal<PromotionResponse | null>(null);
    editingPromotion = signal<PromotionResponse | null>(null);
    storeRefCode = signal<string | null>(null);
    foodOptions = signal<DropdownOption[]>([]);

    page = signal(1);
    pageSize = signal(20);
    totalPages = signal(1);
    totalRecords = signal(0);
    loading = signal(false);
    isSubmitting = signal(false);

    isAddOpen = signal(false);
    isDetailOpen = signal(false);
    isDetailRendered = signal(false);

    isConfirmOpen = signal(false);
    confirmTitle = signal('');
    confirmMessage = signal('');
    confirmAction = signal<ConfirmActionType | null>(null);
    confirmPromotionId = signal<number | null>(null);

    sortBy = signal('');
    asc = signal(false);

    filter = signal<PromotionFilter>({
        keyword: '',
        promotionType: '',
        status: ''
    });

    columns: TableColumn[] = [
        {
            key: 'index',
            label: 'STT',
            width: '60px',
            align: 'center'
        },
        {
            key: 'name',
            label: 'Tên chương trình',
            width: '200px',
            sortable: true
        },
        {
            key: 'promotionCode',
            label: 'Mã KM',
            width: '140px'
        },
        {
            key: 'promotionTypeText',
            label: 'Loại',
            width: '150px',
            align: 'center',
            type: 'badge'
        },
        {
            key: 'schedule',
            label: 'Thời gian áp dụng',
            width: '220px'
        },
        {
            key: 'statusText',
            label: 'Trạng thái',
            width: '140px',
            align: 'center',
            type: 'badge'
        },
        {
            key: 'createdAt',
            label: 'Ngày tạo',
            width: '160px',
            sortable: true
        }
    ];

    filterFields: FilterField[] = [
        {
            key: 'keyword',
            label: 'Tìm kiếm',
            type: 'text',
            placeholder: 'Tên hoặc mã KM'
        },
        {
            key: 'promotionType',
            label: 'Loại chương trình',
            type: 'select',
            placeholder: 'Tất cả loại',
            options: [
                { label: 'Đồng giá', value: 'FIXED_PRICE' },
                { label: 'Giảm giá sản phẩm', value: 'PRODUCT_DISCOUNT' },
                { label: 'Mua X tặng Y', value: 'BUY_X_GET_Y' }
            ]
        },
        {
            key: 'status',
            label: 'Trạng thái',
            type: 'select',
            placeholder: 'Tất cả trạng thái',
            options: [
                { label: 'Nháp', value: 'DRAFT' },
                { label: 'Sắp diễn ra', value: 'SCHEDULED' },
                { label: 'Đang diễn ra', value: 'ACTIVE' },
                { label: 'Tạm dừng', value: 'PAUSED' },
                { label: 'Kết thúc', value: 'ENDED' }
            ]
        }
    ];

    constructor() {
        this.loadMyStore();

        this.realtimeService.promotionStatusChanged$
            .pipe(takeUntilDestroyed())
            .subscribe(notification => {
                if (notification.storeRefCode !== this.storeRefCode()) {
                    return;
                }

                this.promotions.update(list =>
                    list.map(p => p.id === notification.promotionId
                        ? { ...p, status: notification.status as PromotionResponse['status'] }
                        : p
                    )
                );

                const selected = this.selectedPromotion();

                if (selected && selected.id === notification.promotionId) {
                    this.selectedPromotion.set({
                        ...selected,
                        status: notification.status as PromotionResponse['status']
                    });
                }
            });
    }

    rows(): TableRow[] {
        return this.promotions().map((promotion, index) => ({
            index: (this.page() - 1) * this.pageSize() + index + 1,
            id: promotion.id,
            name: promotion.name,
            promotionCode: promotion.promotionCode ?? '—',
            promotionTypeText: {
                text: this.getPromotionTypeText(promotion.promotionType),
                value: promotion.promotionType
            },
            schedule: this.formatSchedule(promotion),
            statusText: {
                text: this.getStatusText(promotion.status),
                value: promotion.status
            },
            createdAt: this.formatDate(promotion.createdAt)
        }));
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
                this.loadFoodOptions();
                this.loadPromotions();
            },
            error: () => {
                this.loading.set(false);
                this.toastService.error('Không tải được thông tin đại lý');
            }
        });
    }

    loadFoodOptions(): void {
        const refCode = this.storeRefCode();

        if (!refCode) {
            return;
        }

        this.storeFoodService.getByStoreRefCode(refCode, null, 1, 200).subscribe({
            next: response => {
                this.foodOptions.set(
                    response.items.map(food => ({
                        label: `${food.foodName} (${this.formatCurrency(food.price)})`,
                        value: food.id
                    }))
                );
            }
        });
    }

    loadPromotions(): void {
        const refCode = this.storeRefCode();

        if (!refCode) {
            this.loading.set(false);
            return;
        }

        this.loading.set(true);

        const request: BaseSearchRequest<PromotionSearchRequest> = {
            page: this.page(),
            pageSize: this.pageSize(),
            sortBy: this.sortBy() || null,
            asc: this.asc(),
            searchParams: {
                keyword: this.filter().keyword || null,
                promotionType: this.filter().promotionType || null,
                status: this.filter().status || null
            }
        };

        this.promotionService.search(request).subscribe({
            next: response => {
                this.promotions.set(response.items);
                this.totalPages.set(response.totalPages);
                this.totalRecords.set(response.totalRecords);
                this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
                this.toastService.error('Không tải được danh sách khuyến mãi');
            }
        });
    }

    openCreateModal(): void {
        this.editingPromotion.set(null);
        this.isAddOpen.set(true);
    }

    openEditFromDetail(promotion: PromotionResponse): void {
        this.closeDetail();
        this.editingPromotion.set(promotion);
        this.isAddOpen.set(true);
    }

    closeCreateModal(): void {
        this.isAddOpen.set(false);
        this.editingPromotion.set(null);
    }

    savePromotion(request: CreatePromotionRequest): void {
        const editing = this.editingPromotion();

        this.isSubmitting.set(true);

        const save$ = editing
            ? this.promotionService.update(editing.id, request)
            : this.promotionService.create(request);

        save$.subscribe({
            next: response => {
                this.isSubmitting.set(false);

                if (!response.isSuccess) {
                    this.toastService.error(response.message);
                    return;
                }

                this.toastService.success(response.message);
                this.closeCreateModal();
                this.loadPromotions();
            },
            error: () => {
                this.isSubmitting.set(false);
                this.toastService.error(editing ? 'Cập nhật chương trình khuyến mãi thất bại' : 'Tạo chương trình khuyến mãi thất bại');
            }
        });
    }

    openDetail(row: TableRow): void {
        const id = Number(row['id']);
        const promotion = this.promotions().find(x => x.id === id);

        if (!promotion) {
            return;
        }

        this.selectedPromotion.set(promotion);
        this.isDetailRendered.set(true);
        this.isDetailOpen.set(true);
    }

    closeDetail(): void {
        this.isDetailOpen.set(false);

        setTimeout(() => {
            this.isDetailRendered.set(false);
            this.selectedPromotion.set(null);
        }, 200);
    }

    requestPause(id: number): void {
        this.openConfirm(
            'PAUSE',
            id,
            'Tạm dừng chương trình',
            'Bạn có chắc muốn tạm dừng chương trình khuyến mãi này không?'
        );
    }

    requestResume(id: number): void {
        this.openConfirm(
            'RESUME',
            id,
            'Tiếp tục chương trình',
            'Bạn có chắc muốn tiếp tục chương trình khuyến mãi này không?'
        );
    }

    requestCancel(id: number): void {
        this.openConfirm(
            'CANCEL',
            id,
            'Huỷ chương trình',
            'Bạn có chắc muốn huỷ chương trình khuyến mãi này không? Hành động này không thể hoàn tác.'
        );
    }

    requestDelete(id: number): void {
        this.openConfirm(
            'DELETE',
            id,
            'Xoá bản nháp',
            'Bạn có chắc muốn xoá bản nháp này không?'
        );
    }

    closeConfirm(): void {
        if (this.isSubmitting()) {
            return;
        }

        this.isConfirmOpen.set(false);
        this.confirmAction.set(null);
        this.confirmPromotionId.set(null);
    }

    submitConfirm(): void {
        const action = this.confirmAction();
        const id = this.confirmPromotionId();

        this.isConfirmOpen.set(false);

        if (!action || !id) {
            return;
        }

        this.isSubmitting.set(true);

        const request$ =
            action === 'PAUSE' ? this.promotionService.pause(id) :
            action === 'RESUME' ? this.promotionService.resume(id) :
            action === 'CANCEL' ? this.promotionService.cancel(id) :
            this.promotionService.delete(id);

        request$.subscribe({
            next: response => {
                this.isSubmitting.set(false);

                if (!response.isSuccess) {
                    this.toastService.error(response.message);
                    return;
                }

                this.toastService.success(response.message);
                this.closeDetail();
                this.loadPromotions();
            },
            error: () => {
                this.isSubmitting.set(false);
                this.toastService.error('Thao tác thất bại');
            }
        });
    }

    onPageSizeChange(size: number): void {
        this.pageSize.set(size);
        this.page.set(1);
        this.loadPromotions();
    }

    onPageChange(page: number): void {
        this.page.set(page);
        this.loadPromotions();
    }

    onFilterChange(value: PromotionFilter): void {
        this.filter.set(value);
        this.page.set(1);
        this.loadPromotions();
    }

    onSortChange(key: string): void {
        if (this.sortBy() === key) {
            this.asc.set(!this.asc());
        } else {
            this.sortBy.set(key);
            this.asc.set(true);
        }

        this.loadPromotions();
    }

    getPromotionTypeText(type: string): string {
        switch (type) {
            case 'FIXED_PRICE':
                return 'Đồng giá';
            case 'PRODUCT_DISCOUNT':
                return 'Giảm giá SP';
            case 'BUY_X_GET_Y':
                return 'Mua X tặng Y';
            default:
                return type;
        }
    }

    getStatusText(status: string): string {
        switch (status) {
            case 'DRAFT':
                return 'Nháp';
            case 'SCHEDULED':
                return 'Sắp diễn ra';
            case 'ACTIVE':
                return 'Đang diễn ra';
            case 'PAUSED':
                return 'Tạm dừng';
            case 'ENDED':
                return 'Kết thúc';
            default:
                return status;
        }
    }

    formatSchedule(promotion: PromotionResponse): string {
        const start = this.formatShortDate(promotion.startDate);
        const end = promotion.endDate ? this.formatShortDate(promotion.endDate) : 'Không giới hạn';

        return `${start} → ${end}`;
    }

    private openConfirm(action: ConfirmActionType, id: number, title: string, message: string): void {
        this.confirmTitle.set(title);
        this.confirmMessage.set(message);
        this.confirmAction.set(action);
        this.confirmPromotionId.set(id);
        this.isConfirmOpen.set(true);
    }

    private formatShortDate(value: string): string {
        return new Date(value).toLocaleDateString('vi-VN');
    }

    private formatCurrency(value: number): string {
        return `${value.toLocaleString('vi-VN')}đ`;
    }

    private formatDate(value: string): string {
        return new Date(value).toLocaleString('vi-VN');
    }
}
