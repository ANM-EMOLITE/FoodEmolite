import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CustomerService } from '../../../../common/services/customer.service';
import { OrderService } from '../../../../common/services/order.service';
import { ToastService } from '../../../../common/services/toast.service';
import { CustomerDetail } from '../../../../common/models/customer.model';
import { OrderResponse } from '../../../../common/models/order.model';
import { TableColumn, TableRow } from '../../../../common/models/front-end/table/table-column.model';
import { URL_ENDPOINT } from '../../../../common/constants/url-endpoint';
import { ORDER_SOURCE_TEXT, ORDER_TYPE_TEXT, OrderStatus, OrderType, PaymentStatus } from '../../../../common/enums/order.enum';
import { getOrderDisplayStatus, ORDER_DISPLAY_STATUS_TEXT, OrderDisplayStatus } from '../../../../common/utils/order-status';
import { AppTableComponent } from '../../../../shared/component/table/table';

type CustomerDetailTab = 'info' | 'orders';

@Component({
    selector: 'app-page-agent-customer-detail',
    imports: [DatePipe, AppTableComponent],
    templateUrl: './agent-customer-detail.html'
})
export class PageAgentCustomerDetailComponent {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly customerService = inject(CustomerService);
    private readonly orderService = inject(OrderService);
    private readonly toastService = inject(ToastService);

    private readonly refCode = this.route.snapshot.paramMap.get('refCode') ?? '';
    private readonly isGuest = this.route.snapshot.queryParamMap.get('guest') === 'true';

    readonly tabs: { key: CustomerDetailTab; label: string }[] = [
        { key: 'info', label: 'Thông tin' },
        { key: 'orders', label: 'Đơn hàng' }
    ];

    readonly activeTab = signal<CustomerDetailTab>('info');

    readonly customer = signal<CustomerDetail | null>(null);
    readonly loadingCustomer = signal(true);

    readonly orders = signal<OrderResponse[]>([]);
    readonly loading = signal(false);
    readonly page = signal(1);
    readonly pageSize = signal(20);
    readonly totalPages = signal(1);
    readonly totalRecords = signal(0);
    readonly sortBy = signal('createdAt');
    readonly asc = signal(false);
    readonly ordersLoaded = signal(false);

    readonly columns: TableColumn[] = [
        { key: 'orderCode', label: 'Mã đơn', width: '140px' },
        { key: 'createdAt', label: 'Thời gian', width: '170px', type: 'date', sortable: true },
        { key: 'orderType', label: 'Loại đơn', width: '120px' },
        { key: 'totalAmount', label: 'Tổng tiền', width: '150px', align: 'right', sortable: true },
        { key: 'statusText', label: 'Trạng thái', width: '160px', align: 'center', type: 'badge' },
        { key: 'orderSourceText', label: 'Nguồn đơn', width: '170px', align: 'center', type: 'badge' },
        { key: 'note', label: 'Ghi chú' }
    ];

    constructor() {
        this.loadCustomer();
    }

    rows(): TableRow[] {
        return this.orders().map(order => ({
            id: order.id,
            orderCode: order.orderCode,
            createdAt: order.createdAt,
            orderType: ORDER_TYPE_TEXT[order.orderType] ?? order.orderType,
            totalAmount: this.formatCurrency(order.totalAmount),
            statusText: { text: ORDER_DISPLAY_STATUS_TEXT[getOrderDisplayStatus(order)], value: getOrderDisplayStatus(order) },
            orderSourceText: { text: ORDER_SOURCE_TEXT[order.orderSource] ?? order.orderSource, value: order.orderSource },
            note: order.note ?? ''
        }));
    }

    loadCustomer(): void {
        this.customerService.getAgentCustomerDetail(this.refCode, this.isGuest).subscribe({
            next: response => {
                this.loadingCustomer.set(false);

                if (!response.isSuccess || !response.data) {
                    this.toastService.error(response.message || 'Không tìm thấy khách hàng');
                    return;
                }

                this.customer.set(response.data);
            },
            error: () => {
                this.loadingCustomer.set(false);
                this.toastService.error('Không tải được khách hàng');
            }
        });
    }

    switchTab(tab: CustomerDetailTab): void {
        this.activeTab.set(tab);

        if (tab === 'orders' && !this.ordersLoaded()) {
            this.loadOrders();
        }
    }

    loadOrders(): void {
        this.loading.set(true);

        this.orderService.getByStoreRefCode({
            page: this.page(),
            pageSize: this.pageSize(),
            sortBy: this.sortBy(),
            asc: this.asc(),
            searchParams: { customerRefCode: this.refCode, isGuestCustomer: this.isGuest }
        }).subscribe({
            next: response => {
                this.loading.set(false);
                this.ordersLoaded.set(true);
                this.orders.set(response.items ?? []);
                this.totalPages.set(response.totalPages);
                this.totalRecords.set(response.totalRecords);
            },
            error: () => {
                this.loading.set(false);
                this.toastService.error('Không tải được đơn hàng');
            }
        });
    }

    onPageChange(page: number): void {
        this.page.set(page);
        this.loadOrders();
    }

    onPageSizeChange(size: number): void {
        this.pageSize.set(size);
        this.page.set(1);
        this.loadOrders();
    }

    onSortChange(key: string): void {
        if (this.sortBy() === key) {
            this.asc.set(!this.asc());
        } else {
            this.sortBy.set(key);
            this.asc.set(false);
        }

        this.page.set(1);
        this.loadOrders();
    }

    openOrder(id: number | string | undefined): void {
        if (id) {
            this.router.navigate(['/', URL_ENDPOINT.AGENT, URL_ENDPOINT.AGENT_ORDERS, id]);
        }
    }

    goBack(): void {
        this.router.navigate(['/', URL_ENDPOINT.AGENT, URL_ENDPOINT.AGENT_CUSTOMERS]);
    }

    displayStatus(order: { orderStatus: OrderStatus; paymentStatus: PaymentStatus }): OrderDisplayStatus {
        return getOrderDisplayStatus(order);
    }

    statusText(status: OrderDisplayStatus): string {
        return ORDER_DISPLAY_STATUS_TEXT[status];
    }

    orderTypeText(type: OrderType): string {
        return ORDER_TYPE_TEXT[type] ?? type;
    }


    formatCurrency(value: number): string {
        return `${value.toLocaleString('vi-VN')}đ`;
    }
}
