import {
    Component,
    computed,
    effect,
    inject,
    input,
    output,
    signal
} from '@angular/core';
import { OrderItemResponse, OrderResponse } from '../../../../common/models/order.model';
import { StorePaymentInfoResponse } from '../../../../common/models/profile.model';
import { ProfileService } from '../../../../common/services/profile.service';
import { ToastService } from '../../../../common/services/toast.service';

@Component({
    selector: 'app-user-order-payment-popup',
    imports: [],
    templateUrl: './user-order-payment-popup.html'
})
export class UserOrderPaymentPopupComponent {
    private readonly profileService = inject(ProfileService);
    private readonly toastService = inject(ToastService);

    order = input.required<OrderResponse>();
    closed = output<void>();

    paymentInfo = signal<StorePaymentInfoResponse | null>(null);
    loading = signal(false);

    constructor() {
        effect(() => {
            const order = this.order();

            if (!order) return;

            this.loadPaymentInfo();
        });
    }

    isCancelled = computed(() => this.order().orderStatus === 'CANCELLED');
    isCash = computed(() => this.order().paymentMethod === 'CASH');

    /** Chỉ đơn chuyển khoản, chưa thanh toán và chưa bị hủy mới cần hiện mã QR. */
    showQr = computed(() =>
        !this.isCancelled()
        && !this.isCash()
        && this.order().paymentStatus !== 'PAID'
    );

    loadPaymentInfo(): void {
        this.paymentInfo.set(null);

        // Đơn hủy / tiền mặt không có thông tin chuyển khoản để hiện (BE cũng từ chối).
        if (this.isCancelled() || this.isCash()) {
            this.loading.set(false);
            return;
        }

        this.loading.set(true);

        this.profileService.getStorePaymentInfo(
            this.order().orderCode
        ).subscribe({
            next: response => {
                this.loading.set(false);

                if (!response.isSuccess) {
                    this.toastService.error(response.message);
                    return;
                }

                this.paymentInfo.set(response.data);
            },
            error: () => {
                this.loading.set(false);
                this.toastService.error('Không tải được thông tin thanh toán');
            }
        });
    }

    getItemOptionsText(item: OrderItemResponse): string {
        if (!item.options || item.options.length === 0) {
            return '';
        }

        return item.options
            .map(option => `${option.optionGroupName}: ${option.optionName}`)
            .join(', ');
    }

    getBaseUnitPrice(item: OrderItemResponse): number {
        const optionAmount = (item.options ?? []).reduce(
            (sum, option) => sum + option.additionalPrice,
            0
        );

        return item.unitPrice - optionAmount;
    }

    close(): void {
        this.closed.emit();
    }

    formatCurrency(value: number): string {
        return `${value.toLocaleString('vi-VN')}đ`;
    }
}