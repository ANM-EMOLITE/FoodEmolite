import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AppTableComponent } from '../../../shared/component/table/table';
import { FilterComponent } from '../../../shared/component/filter/filter';
import { FilterField } from '../../../common/models/front-end/filter/filter-field.model';
import { TableColumn, TableRow } from '../../../common/models/front-end/table/table-column.model';
import { StoreNotificationService } from '../../../common/services/store-notification.service';
import { RealtimeService } from '../../../common/services/realtime.service';
import { ToastService } from '../../../common/services/toast.service';
import { StoreNotificationResponse } from '../../../common/models/store-notification.model';
import { URL_ENDPOINT } from '../../../common/constants/url-endpoint';

interface NotificationFilter {
    status: string;
}

@Component({
    selector: 'app-page-agent-notifications',
    imports: [AppTableComponent, FilterComponent],
    templateUrl: './agent-notifications.html'
})
export class PageAgentNotificationsComponent {
    private readonly storeNotificationService = inject(StoreNotificationService);
    private readonly realtimeService = inject(RealtimeService);
    private readonly toastService = inject(ToastService);
    private readonly router = inject(Router);

    notifications = signal<StoreNotificationResponse[]>([]);
    loading = signal(false);
    isSubmitting = signal(false);

    page = signal(1);
    pageSize = signal(20);
    totalPages = signal(1);
    totalRecords = signal(0);
    unreadCount = signal(0);

    filter = signal<NotificationFilter>({ status: '' });

    filterFields: FilterField[] = [
        {
            key: 'status',
            label: 'Trạng thái',
            type: 'select',
            placeholder: 'Tất cả',
            options: [
                { label: 'Chưa đọc', value: 'UNREAD' },
                { label: 'Đã đọc', value: 'READ' }
            ]
        }
    ];

    columns: TableColumn[] = [
        {
            key: 'createdAt',
            label: 'Thời gian',
            width: '180px',
            type: 'date'
        },
        {
            key: 'content',
            label: 'Nội dung'
        },
        {
            key: 'orderCode',
            label: 'Mã đơn hàng',
            width: '160px'
        },
        {
            key: 'customerName',
            label: 'Khách hàng',
            width: '180px'
        },
        {
            key: 'totalAmount',
            label: 'Tổng tiền',
            width: '140px',
            align: 'right'
        },
        {
            key: 'statusText',
            label: 'Trạng thái',
            width: '130px',
            align: 'center',
            type: 'badge'
        }
    ];

    constructor() {
        this.loadNotifications();

        // Có đơn mới trong lúc đang xem trang thì tải lại trang đầu để thấy ngay.
        this.realtimeService.newOrder$
            .pipe(takeUntilDestroyed())
            .subscribe(() => {
                if (this.page() === 1) {
                    this.loadNotifications();
                }
            });
    }

    rows(): TableRow[] {
        return this.notifications().map(notification => ({
            id: notification.id,
            createdAt: notification.createdAt,
            content: this.getContent(notification),
            orderCode: notification.orderCode ?? '—',
            customerName: notification.customerName || '—',
            totalAmount: this.formatCurrency(notification.totalAmount),
            statusText: {
                text: notification.isRead ? 'Đã đọc' : 'Chưa đọc',
                value: notification.isRead ? 'DRAFT' : 'SCHEDULED'
            }
        }));
    }

    loadNotifications(): void {
        this.loading.set(true);

        const status = this.filter().status;
        const isRead = status === 'READ' ? true : status === 'UNREAD' ? false : null;

        this.storeNotificationService.getMyStore(this.page(), this.pageSize(), isRead).subscribe({
            next: response => {
                this.loading.set(false);

                if (!response.isSuccess || !response.data) {
                    this.toastService.error(response.message || 'Không tải được thông báo');
                    return;
                }

                const { items, totalRecords, unreadCount } = response.data;

                this.notifications.set(items);
                this.totalRecords.set(totalRecords);
                this.totalPages.set(Math.max(1, Math.ceil(totalRecords / this.pageSize())));
                this.unreadCount.set(unreadCount);
            },
            error: () => {
                this.loading.set(false);
                this.toastService.error('Không tải được thông báo');
            }
        });
    }

    /** Bấm vào 1 dòng: đánh dấu đã đọc rồi mở chi tiết đơn hàng. */
    openNotification(row: TableRow): void {
        const notification = this.notifications().find(x => x.id === Number(row['id']));

        if (!notification) {
            return;
        }

        if (!notification.isRead) {
            this.storeNotificationService.markRead(notification.id).subscribe({
                next: () => this.storeNotificationService.notifyChanged()
            });
        }

        if (notification.orderId) {
            this.router.navigate(['/', URL_ENDPOINT.AGENT, URL_ENDPOINT.AGENT_ORDERS, notification.orderId]);
        }
    }

    markAllRead(): void {
        if (!this.unreadCount() || this.isSubmitting()) {
            return;
        }

        this.isSubmitting.set(true);

        this.storeNotificationService.markAllRead().subscribe({
            next: response => {
                this.isSubmitting.set(false);

                if (!response.isSuccess) {
                    this.toastService.error(response.message);
                    return;
                }

                this.toastService.success(response.message);
                this.storeNotificationService.notifyChanged();
                this.loadNotifications();
            },
            error: () => {
                this.isSubmitting.set(false);
                this.toastService.error('Thao tác thất bại');
            }
        });
    }

    onFilterChange(value: NotificationFilter): void {
        this.filter.set(value);
        this.page.set(1);
        this.loadNotifications();
    }

    onPageChange(page: number): void {
        this.page.set(page);
        this.loadNotifications();
    }

    onPageSizeChange(size: number): void {
        this.pageSize.set(size);
        this.page.set(1);
        this.loadNotifications();
    }

    private getContent(notification: StoreNotificationResponse): string {
        switch (notification.type) {
            case 'NEW_ORDER':
                return 'Có đơn hàng mới';
            default:
                return notification.type;
        }
    }

    private formatCurrency(value: number | null): string {
        return value === null ? '—' : `${value.toLocaleString('vi-VN')}đ`;
    }
}
