import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AppTableComponent } from '../../../shared/component/table/table';
import { FilterComponent } from '../../../shared/component/filter/filter';
import { ToastService } from '../../../common/services/toast.service';
import { OrderService } from '../../../common/services/order.service';
import { ProfileService } from '../../../common/services/profile.service';
import { RealtimeService } from '../../../common/services/realtime.service';
import { FilterField } from '../../../common/models/front-end/filter/filter-field.model';
import {
    TableAction,
    TableColumn,
    TableRow
} from '../../../common/models/front-end/table/table-column.model';
import {
    OrderResponse,
    OrderSearchRequest,
    UpdatePaymentStatusRequest
} from '../../../common/models/order.model';
import { buildOrdersInvoiceDocument, downloadOrdersInvoicePdf } from '../../../common/utils/order-invoice';
import { getOrderDisplayStatus, ORDER_DISPLAY_STATUS_OPTIONS, ORDER_DISPLAY_STATUS_TEXT } from '../../../common/utils/order-status';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { BaseSearchRequest } from '../../../common/models/base-search.model';
import { URL_ENDPOINT } from '../../../common/constants/url-endpoint';

interface OrderFilter {
    status: string;
    fromDate: string;
    toDate: string;
    keyword: string;
}

@Component({
    selector: 'app-page-agent-orders',
    imports: [
        AppTableComponent,
        FilterComponent
    ],
    templateUrl: './agent-orders.html'
})
export class PageAgentOrdersComponent {
    private readonly orderService = inject(OrderService);
    private readonly profileService = inject(ProfileService);
    private readonly toastService = inject(ToastService);
    private readonly sanitizer = inject(DomSanitizer);
    private readonly realtimeService = inject(RealtimeService);
    private readonly router = inject(Router);

    orders = signal<OrderResponse[]>([]);
    selectedOrderIds = signal<number[]>([]);
    storeRefCode = signal<string | null>(null);
    readonly isInvoicePreviewOpen = signal(false);
    readonly invoicePreviewUrl = signal<SafeResourceUrl | null>(null);

    private invoiceOrders: OrderResponse[] = [];
    private invoiceObjectUrl: string | null = null;

    page = signal(1);
    pageSize = signal(20);
    totalPages = signal(1);
    totalRecords = signal(0);
    loading = signal(false);
    isSubmitting = signal(false);

    selectedOrders = computed(() => {
        const ids = this.selectedOrderIds();

        return this.orders().filter(order => ids.includes(order.id));
    });

    // Nút xác nhận thanh toán hàng loạt chỉ bật khi có chọn dòng và tất cả đơn đã chọn đều còn chưa thanh toán (ngược lại bị disable).
    canBulkConfirmPayment = computed(() => this.selectedOrders().length > 0 && this.selectedOrders().every(o => this.canConfirmPayment(o)));

    sortBy = signal('');
    asc = signal(false);
    private readonly today = new Date().toISOString().split('T')[0];
    filter = signal<OrderFilter>({
        status: '',
        fromDate: this.today,
        toDate: this.today,
        keyword: ''
    });

    columns: TableColumn[] = [
        {
            key: 'selected',
            label: '',
            width: '60px',
            align: 'center',
            type: 'checkbox'
        },
        {
            key: 'orderCode',
            label: 'Mã đơn hàng',
            width: '140px',
            align: 'left'
        },
        {
            key: 'customerName',
            label: 'Tên khách hàng',
            width: '140px',
            align: 'left'
        },
        {
            key: 'totalAmount',
            label: 'Tổng tiền',
            width: '140px',
            align: 'right',
            sortable: true
        },
        {
            key: 'promotionNames',
            label: 'Khuyến mãi',
            width: '160px'
        },
        {
            key: 'note',
            label: 'Ghi chú',
            width: '220px'
        },
        {
            key: 'statusText',
            label: 'Trạng thái',
            width: '160px',
            align: 'center',
            type: 'badge'
        },
        {
            key: 'createdAt',
            label: 'Ngày tạo',
            width: '180px',
            sortable: true
        },
        {
            key: 'actions',
            label: 'Thao tác',
            width: '100px',
            align: 'center',
            type: 'actions'
        }
    ];

    filterFields: FilterField[] = [
        {
            key: 'keyword',
            label: 'Tìm kiếm',
            type: 'text',
            placeholder: 'Tìm kiếm ...'
        },
        {
            key: 'fromDate',
            label: 'Từ ngày',
            type: 'date',
            placeholder: 'Từ ngày'
        },
        {
            key: 'toDate',
            label: 'Đến ngày',
            type: 'date',
            placeholder: 'Đến ngày'
        },
        {
            key: 'status',
            label: 'Trạng thái',
            type: 'select',
            placeholder: 'Tất cả trạng thái',
            options: ORDER_DISPLAY_STATUS_OPTIONS
        }
    ];

    constructor() {
        this.loadMyStore();

        this.realtimeService.newOrder$
            .pipe(takeUntilDestroyed())
            .subscribe(notification => {
                if (notification.storeRefCode !== this.storeRefCode()) {
                    return;
                }

                this.toastService.success(`Đơn hàng mới: ${notification.orderCode}`);

                if (this.page() === 1) {
                    this.loadOrders();
                }
            });
    }

    rows(): TableRow[] {
        return this.orders().map(order => ({
            selected: this.isSelected(order.id),
            id: order.id,
            orderCode: order.orderCode,
            refCode: order.refCode,
            customerName: order.customerName,
            storeRefCode: order.storeRefCode,
            totalAmount: this.formatCurrency(order.totalAmount),
            promotionNames: this.getPromotionNames(order),
            statusText: {
                text: ORDER_DISPLAY_STATUS_TEXT[getOrderDisplayStatus(order)],
                value: getOrderDisplayStatus(order)
            },
            note: order.note ?? '',
            createdAt: this.formatDate(order.createdAt)
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
                this.loadOrders();
            },
            error: () => {
                this.loading.set(false);
                this.toastService.error('Không tải được thông tin đại lý');
            }
        });
    }

    loadOrders(): void {
        const refCode = this.storeRefCode();

        if (!refCode) {
            this.loading.set(false);
            return;
        }

        this.loading.set(true);

        const request: BaseSearchRequest<OrderSearchRequest> = {
            page: this.page(),
            pageSize: this.pageSize(),
            sortBy: this.sortBy() || null,
            asc: this.asc(),
            searchParams: {
                storeRefCode: refCode,
                keyword: this.filter().keyword || null,
                status: this.filter().status || null,
                fromDate: this.filter().fromDate || null,
                toDate: this.filter().toDate || null
            }
        };

        this.orderService.getByStoreRefCode(request).subscribe({
            next: response => {
                this.orders.set(response.items);
                this.totalPages.set(response.totalPages);
                this.totalRecords.set(response.totalRecords);
                this.selectedOrderIds.set([]);
                this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
                this.toastService.error('Không tải được danh sách đơn hàng');
            }
        });
    }

    openDetail(row: TableRow): void {
        const id = Number(row['id']);

        if (!id) {
            return;
        }

        this.router.navigate(['/', URL_ENDPOINT.AGENT, URL_ENDPOINT.AGENT_ORDERS, id]);
    }

    /** Xem trước hoá đơn của các đơn đã chọn — hoá đơn dựng ngay ở FE từ dữ liệu đơn đang có (không gọi BE). */
    previewInvoiceSelected(): void {
        const orders = this.selectedOrders();

        if (orders.length === 0) return;

        this.clearInvoiceObjectUrl();

        this.invoiceOrders = orders;
        this.invoiceObjectUrl = URL.createObjectURL(
            new Blob([buildOrdersInvoiceDocument(orders)], { type: 'text/html;charset=utf-8' })
        );

        this.invoicePreviewUrl.set(
            this.sanitizer.bypassSecurityTrustResourceUrl(this.invoiceObjectUrl)
        );

        this.isInvoicePreviewOpen.set(true);
    }

    downloadInvoiceSelected(): void {
        this.downloadInvoice(this.selectedOrders());
    }

    downloadCurrentPreviewInvoice(): void {
        this.downloadInvoice(this.invoiceOrders);
    }

    private downloadInvoice(orders: OrderResponse[]): void {
        if (orders.length === 0) return;

        this.isSubmitting.set(true);

        downloadOrdersInvoicePdf(orders)
            .catch(error => {
                console.error('Xuất hoá đơn PDF thất bại', error);
                this.toastService.error('Không tạo được file hoá đơn');
            })
            .finally(() => this.isSubmitting.set(false));
    }

    printCurrentPreviewInvoice(): void {
        if (!this.invoiceObjectUrl) return;

        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = this.invoiceObjectUrl;

        document.body.appendChild(iframe);

        iframe.onload = () => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();

            setTimeout(() => {
                document.body.removeChild(iframe);
            }, 1000);
        };
    }

    closeInvoicePreview(): void {
        this.isInvoicePreviewOpen.set(false);
        this.invoicePreviewUrl.set(null);
        this.invoiceOrders = [];
        this.clearInvoiceObjectUrl();
    }

    private clearInvoiceObjectUrl(): void {
        if (this.invoiceObjectUrl) {
            URL.revokeObjectURL(this.invoiceObjectUrl);
            this.invoiceObjectUrl = null;
        }
    }

    toggleSelected(row: TableRow, checked: boolean): void {
        const id = Number(row['id']);

        if (!id || (checked && this.isRowCheckDisabled(row))) {
            return;
        }

        if (checked) {
            this.selectedOrderIds.set([
                ...new Set([...this.selectedOrderIds(), id])
            ]);
            return;
        }

        this.selectedOrderIds.set(
            this.selectedOrderIds().filter(selectedId => selectedId !== id)
        );
    }

    toggleAllSelected(checked: boolean): void {
        if (!checked) {
            this.selectedOrderIds.set([]);
            return;
        }

        // "Chọn tất cả" chỉ tick các đơn đang chờ thanh toán; đơn đã thanh toán / đã huỷ bỏ qua.
        const ids = this.rows()
            .filter(row => this.isSelectableRow(row))
            .map(row => Number(row['id']))
            .filter(id => !!id);

        this.selectedOrderIds.set(ids);
    }

    /** Đơn đã huỷ bị khoá hẳn checkbox (không tick được). Đơn đã thanh toán vẫn tick riêng được, chỉ không bị "chọn tất cả" chọn vào. */
    readonly isRowCheckDisabled = (row: TableRow): boolean => {
        const order = this.orders().find(x => x.id === Number(row['id']));

        return !order || order.orderStatus === 'CANCELLED';
    };

    readonly isSelectableRow = (row: TableRow): boolean => {
        const order = this.orders().find(x => x.id === Number(row['id']));

        return !!order && this.canConfirmPayment(order);
    };

    /** Menu thao tác của từng dòng: Xem chi tiết (luôn có) và Huỷ đơn (nếu còn huỷ được). Xác nhận thanh toán ở nút phía trên. */
    readonly rowActions = (row: TableRow): TableAction[] => {
        const order = this.orders().find(x => x.id === Number(row['id']));

        if (!order) {
            return [];
        }

        const actions: TableAction[] = [
            {
                key: 'DETAIL',
                label: 'Xem chi tiết',
                icon: [
                    'M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0',
                    'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z'
                ]
            }
        ];

        if (this.canCancel(order)) {
            actions.push({
                key: 'CANCEL',
                label: 'Huỷ đơn hàng',
                tone: 'danger',
                icon: [
                    'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z',
                    'm15 9-6 6',
                    'm9 9 6 6'
                ]
            });
        }

        return actions;
    };

    onRowAction(event: { row: TableRow; action: string }): void {
        if (event.action === 'DETAIL') {
            this.openDetail(event.row);
            return;
        }

        const order = this.orders().find(x => x.id === Number(event.row['id']));

        if (!order || event.action !== 'CANCEL') {
            return;
        }

        this.bulkCancel([order.id]);
    }

    /** Xác nhận thanh toán các đơn đã chọn — chạy ngay, không hỏi lại. */
    confirmPaymentSelected(): void {
        this.bulkUpdatePayment(this.selectedOrders().map(order => order.id), {
            newStatus: 'PAID',
            changedNote: 'Đại lý xác nhận đã thanh toán'
        });
    }

    private bulkUpdatePayment(ids: number[], request: UpdatePaymentStatusRequest): void {
        if (!ids.length) {
            return;
        }

        this.isSubmitting.set(true);

        let completed = 0;
        let failed = 0;

        ids.forEach(id => {
            this.orderService.updatePaymentStatus(id, request).subscribe({
                next: response => {
                    completed++;

                    if (!response.isSuccess) {
                        failed++;
                    }

                    this.finishBulkUpdate(completed, failed, ids.length);
                },
                error: () => {
                    completed++;
                    failed++;
                    this.finishBulkUpdate(completed, failed, ids.length);
                }
            });
        });
    }

    private bulkCancel(ids: number[]): void {
        if (!ids.length) {
            return;
        }

        this.isSubmitting.set(true);

        let completed = 0;
        let failed = 0;

        ids.forEach(id => {
            this.orderService.cancelOrder(id).subscribe({
                next: response => {
                    completed++;

                    if (!response.isSuccess) {
                        failed++;
                    }

                    this.finishBulkUpdate(completed, failed, ids.length);
                },
                error: () => {
                    completed++;
                    failed++;
                    this.finishBulkUpdate(completed, failed, ids.length);
                }
            });
        });
    }

    private finishBulkUpdate(completed: number, failed: number, total: number): void {
        if (completed < total) {
            return;
        }

        this.isSubmitting.set(false);
        this.selectedOrderIds.set([]);

        if (failed) {
            this.toastService.error(`Có ${failed} đơn cập nhật thất bại`);
        } else {
            this.toastService.success('Cập nhật đơn hàng thành công');
        }

        this.loadOrders();
    }

    canConfirmPayment(order: OrderResponse): boolean {
        return order.paymentStatus !== 'PAID' && order.orderStatus !== 'CANCELLED';
    }

    canCancel(order: OrderResponse): boolean {
        return order.orderStatus !== 'CANCELLED' && order.orderStatus !== 'COMPLETED' && order.paymentStatus !== 'PAID';
    }

    private isSelected(orderId: number): boolean {
        return this.selectedOrderIds().includes(orderId);
    }

    onPageSizeChange(size: number): void {
        this.pageSize.set(size);
        this.page.set(1);
        this.selectedOrderIds.set([]);
        this.loadOrders();
    }

    onPageChange(page: number): void {
        this.page.set(page);
        this.selectedOrderIds.set([]);
        this.loadOrders();
    }

    onFilterChange(value: OrderFilter): void {
        this.filter.set(value);
        this.page.set(1);
        this.selectedOrderIds.set([]);
        this.loadOrders();
    }

    onSortChange(key: string): void {
        if (this.sortBy() === key) {
            this.asc.set(!this.asc());
        } else {
            this.sortBy.set(key);
            this.asc.set(true);
        }

        this.page.set(1);
        this.selectedOrderIds.set([]);
        this.loadOrders();
    }

    private formatCurrency(value: number): string {
        return `${value.toLocaleString('vi-VN')}đ`;
    }

    /** Tên các chương trình khuyến mãi đã áp dụng cho đơn (gộp theo từng món, không lặp lại). */
    private getPromotionNames(order: OrderResponse): string {
        const names = new Set(
            order.items
                .map(item => item.promotionName)
                .filter((name): name is string => !!name)
        );

        return [...names].join(', ');
    }

    private formatDate(value: string): string {
        return new Date(value).toLocaleString('vi-VN');
    }
}