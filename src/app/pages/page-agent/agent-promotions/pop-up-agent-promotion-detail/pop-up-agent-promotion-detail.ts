import { Component, effect, inject, input, output, signal } from '@angular/core';
import { PromotionResponse, PromotionStatsResponse } from '../../../../common/models/promotion.model';
import { PromotionService } from '../../../../common/services/promotion.service';

const DAY_MS = 24 * 60 * 60 * 1000;

interface TimeProgress {
    percent: number;
    label: string;
}

const DAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

@Component({
    selector: 'app-pop-up-agent-promotion-detail',
    imports: [],
    templateUrl: './pop-up-agent-promotion-detail.html'
})
export class PopUpAgentPromotionDetailComponent {
    promotion = input.required<PromotionResponse>();
    isOpen = input.required<boolean>();
    isSubmitting = input.required<boolean>();

    closed = output<void>();
    pause = output<number>();
    resume = output<number>();
    cancel = output<number>();
    delete = output<number>();
    edit = output<PromotionResponse>();

    private readonly promotionService = inject(PromotionService);

    readonly stats = signal<PromotionStatsResponse | null>(null);
    readonly statsLoading = signal(false);

    private loadedStatsId: number | null = null;

    constructor() {
        // Chỉ tải lại thống kê khi đổi sang chương trình khác (cập nhật trạng thái realtime không cần gọi lại).
        effect(() => {
            const id = this.promotion().id;

            if (id === this.loadedStatsId) {
                return;
            }

            this.loadedStatsId = id;
            this.loadStats(id);
        });
    }

    private loadStats(id: number): void {
        this.stats.set(null);
        this.statsLoading.set(true);

        this.promotionService.getStats(id).subscribe({
            next: response => {
                if (this.promotion().id !== id) {
                    return;
                }

                this.stats.set(response.isSuccess ? response.data : null);
                this.statsLoading.set(false);
            },
            error: () => {
                this.statsLoading.set(false);
            }
        });
    }

    /** Tiến độ thời gian chạy chương trình — chỉ có khi chương trình có ngày kết thúc. */
    getTimeProgress(promotion: PromotionResponse): TimeProgress | null {
        if (!promotion.endDate) {
            return null;
        }

        const start = new Date(`${promotion.startDate}T00:00:00`).getTime();
        const end = new Date(`${promotion.endDate}T00:00:00`).getTime() + DAY_MS;
        const now = Date.now();
        const totalDays = Math.max(1, Math.round((end - start) / DAY_MS));

        if (now < start) {
            return { percent: 0, label: `Bắt đầu sau ${Math.ceil((start - now) / DAY_MS)} ngày · tổng ${totalDays} ngày` };
        }

        if (now >= end) {
            return { percent: 100, label: `Đã hết hạn · ${totalDays} ngày` };
        }

        const elapsedDays = Math.floor((now - start) / DAY_MS) + 1;

        return {
            percent: Math.min(100, Math.round((now - start) / (end - start) * 100)),
            label: `Ngày ${elapsedDays}/${totalDays} · còn ${Math.ceil((end - now) / DAY_MS)} ngày`
        };
    }

    close(): void {
        this.closed.emit();
    }

    onEdit(): void {
        this.edit.emit(this.promotion());
    }

    onPause(): void {
        this.pause.emit(this.promotion().id);
    }

    onResume(): void {
        this.resume.emit(this.promotion().id);
    }

    onCancel(): void {
        this.cancel.emit(this.promotion().id);
    }

    onDelete(): void {
        this.delete.emit(this.promotion().id);
    }

    getPromotionTypeText(type: string): string {
        switch (type) {
            case 'FIXED_PRICE':
                return 'Đồng giá';
            case 'PRODUCT_DISCOUNT':
                return 'Giảm giá sản phẩm';
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

    getConditionText(promotion: PromotionResponse): string {
        switch (promotion.conditionType) {
            case 'MIN_ORDER_AMOUNT':
                return `Đơn hàng tối thiểu ${this.formatCurrency(promotion.conditionMinAmount ?? 0)}`;
            case 'MIN_QUANTITY':
                return `Mua tối thiểu ${promotion.conditionMinQuantity ?? 0} món`;
            default:
                return 'Không yêu cầu điều kiện';
        }
    }

    getDaysOfWeekText(mask: number): string {
        if (mask >= 127) {
            return 'Tất cả các ngày trong tuần';
        }

        const days = DAY_LABELS.filter((_, index) => (mask & (1 << index)) !== 0);

        return days.length ? days.join(', ') : 'Không có ngày áp dụng';
    }

    getTimeRangeText(promotion: PromotionResponse): string {
        if (!promotion.startTime || !promotion.endTime) {
            return 'Cả ngày';
        }

        return `${promotion.startTime.slice(0, 5)} - ${promotion.endTime.slice(0, 5)}`;
    }

    formatDate(value: string): string {
        return new Date(value).toLocaleDateString('vi-VN');
    }

    formatCurrency(value: number): string {
        return `${value.toLocaleString('vi-VN')}đ`;
    }
}
