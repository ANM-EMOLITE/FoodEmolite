import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastService } from '../../../../common/services/toast.service';
import { OrderService } from '../../../../common/services/order.service';
import { OrderResponse } from '../../../../common/models/order.model';
import { getOrderDisplayStatus, ORDER_DISPLAY_STATUS_TEXT } from '../../../../common/utils/order-status';
import { URL_ENDPOINT } from '../../../../common/constants/url-endpoint';

@Component({
    selector: 'app-page-agent-order-detail',
    imports: [],
    templateUrl: './agent-order-detail.html'
})
export class PageAgentOrderDetailComponent {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly orderService = inject(OrderService);
    private readonly toastService = inject(ToastService);

    readonly order = signal<OrderResponse | null>(null);
    readonly loading = signal(false);
    readonly isSubmitting = signal(false);

    readonly statusText = computed(() => {
        const order = this.order();

        return order ? ORDER_DISPLAY_STATUS_TEXT[getOrderDisplayStatus(order)] : '';
    });

    /** Tổng tiền đã giảm nhờ khuyến mãi = tổng (đơn giá gốc - đơn giá thực) x số lượng của từng món. */
    readonly totalDiscount = computed(() => {
        const order = this.order();

        if (!order) return 0;

        return order.items.reduce((sum, item) => sum + (item.originalUnitPrice - item.unitPrice) * item.quantity, 0);
    });

    readonly statusBadgeClass = computed(() => {
        const order = this.order();

        if (!order) return '';

        switch (getOrderDisplayStatus(order)) {
            case 'PAID':
                return 'bg-emerald-500/15 text-emerald-300';
            case 'CANCELLED':
                return 'bg-red-500/15 text-red-300';
            default:
                return 'bg-orange-500/15 text-orange-300';
        }
    });

    /** Đơn chưa huỷ, chưa hoàn thành, chưa thanh toán mới huỷ được — giống rule ở trang danh sách đơn hàng. */
    readonly canCancel = computed(() => {
        const order = this.order();

        return !!order && order.orderStatus !== 'CANCELLED' && order.orderStatus !== 'COMPLETED' && order.paymentStatus !== 'PAID';
    });

    /** Đơn chưa thanh toán và chưa huỷ mới xác nhận thanh toán được — giống rule ở trang danh sách đơn hàng. */
    readonly canConfirmPayment = computed(() => {
        const order = this.order();

        return !!order && order.paymentStatus !== 'PAID' && order.orderStatus !== 'CANCELLED';
    });

    constructor() {
        this.route.paramMap
            .pipe(takeUntilDestroyed())
            .subscribe(params => {
                const id = Number(params.get('id'));

                if (id) {
                    this.loadOrder(id);
                }
            });
    }

    private loadOrder(id: number): void {
        this.loading.set(true);

        this.orderService.getStoreDetail(id).subscribe({
            next: response => {
                this.loading.set(false);

                if (!response.isSuccess || !response.data) {
                    this.toastService.error(response.message || 'Không tìm thấy đơn hàng');
                    return;
                }

                this.order.set(response.data);
            },
            error: () => {
                this.loading.set(false);
                this.toastService.error('Không tải được thông tin đơn hàng');
            }
        });
    }

    cancelOrder(): void {
        const order = this.order();

        if (!order || !this.canCancel()) return;

        this.isSubmitting.set(true);

        this.orderService.cancelOrder(order.id).subscribe({
            next: response => {
                this.isSubmitting.set(false);

                if (!response.isSuccess) {
                    this.toastService.error(response.message);
                    return;
                }

                this.toastService.success(response.message);
                this.loadOrder(order.id);
            },
            error: () => {
                this.isSubmitting.set(false);
                this.toastService.error('Huỷ đơn hàng thất bại');
            }
        });
    }

    confirmPayment(): void {
        const order = this.order();

        if (!order || !this.canConfirmPayment()) return;

        this.isSubmitting.set(true);

        this.orderService.updatePaymentStatus(order.id, {
            newStatus: 'PAID',
            changedNote: 'Đại lý xác nhận đã thanh toán'
        }).subscribe({
            next: response => {
                this.isSubmitting.set(false);

                if (!response.isSuccess) {
                    this.toastService.error(response.message);
                    return;
                }

                this.toastService.success(response.message);
                this.loadOrder(order.id);
            },
            error: () => {
                this.isSubmitting.set(false);
                this.toastService.error('Xác nhận thanh toán thất bại');
            }
        });
    }

    goBack(): void {
        this.router.navigate(['/', URL_ENDPOINT.AGENT, URL_ENDPOINT.AGENT_ORDERS]);
    }

    formatCurrency(value: number): string {
        return `${value.toLocaleString('vi-VN')}đ`;
    }

    formatDate(value: string): string {
        return new Date(value).toLocaleString('vi-VN');
    }
}
