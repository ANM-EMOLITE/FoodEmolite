import {
    Component,
    computed,
    inject,
    signal
} from '@angular/core';
import { Router } from '@angular/router';
import { OrderService } from '../../../common/services/order.service';
import { ToastService } from '../../../common/services/toast.service';
import { OrderResponse } from '../../../common/models/order.model';
import {
    getOrderDisplayStatus,
    getOrderDisplayStatusBadgeClass,
    ORDER_DISPLAY_STATUS_TEXT
} from '../../../common/utils/order-status';
import { URL_ENDPOINT } from '../../../common/constants/url-endpoint';
import { PaginationComponent } from '../../../shared/component/pagination/pagination';
import { UserOrderPaymentPopupComponent } from './user-order-payment-popup/user-order-payment-popup';

@Component({
    selector: 'app-page-user-order-history',
    imports: [
        PaginationComponent,
        UserOrderPaymentPopupComponent
    ],
    templateUrl: './user-histories.html'
})
export class PageUserOrderHistoryComponent {
    private readonly router = inject(Router);
    private readonly orderService = inject(OrderService);
    private readonly toastService = inject(ToastService);

    orders = signal<OrderResponse[]>([]);
    selectedOrder = signal<OrderResponse | null>(null);

    loading = signal(false);

    page = signal(1);
    pageSize = signal(10);
    totalRecords = signal(0);

    totalPages = computed(() =>
        Math.ceil(this.totalRecords() / this.pageSize())
    );

    constructor() {
        this.loadOrders();
    }

    loadOrders(): void {
        this.loading.set(true);

        this.orderService.getMyOrders(
            this.page(),
            this.pageSize()
        ).subscribe({
            next: response => {
                this.loading.set(false);
                this.orders.set(response.items);
                this.totalRecords.set(response.totalRecords);
            },
            error: () => {
                this.loading.set(false);
                this.toastService.error('Không tải được lịch sử đơn hàng');
            }
        });
    }

    openPayment(order: OrderResponse): void {
        this.selectedOrder.set(order);
    }

    closePayment(): void {
        this.selectedOrder.set(null);
    }

    onPageChange(page: number): void {
        this.page.set(page);
        this.loadOrders();
    }

    back(): void {
        this.router.navigate([
            '/',
            URL_ENDPOINT.USER,
            URL_ENDPOINT.USER_STORES
        ]);
    }

    formatCurrency(value: number): string {
        return `${value.toLocaleString('vi-VN')}đ`;
    }

    formatDate(value: string): string {
        return new Date(value).toLocaleString('vi-VN');
    }

    getStatusText(order: OrderResponse): string {
        return ORDER_DISPLAY_STATUS_TEXT[getOrderDisplayStatus(order)];
    }

    getStatusBadgeClass(order: OrderResponse): string {
        return getOrderDisplayStatusBadgeClass(getOrderDisplayStatus(order));
    }
}
