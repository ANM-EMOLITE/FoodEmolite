import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { StoreNotificationService } from '../../../common/services/store-notification.service';
import { RealtimeService } from '../../../common/services/realtime.service';
import { ToastService } from '../../../common/services/toast.service';
import { StoreNotificationResponse } from '../../../common/models/store-notification.model';
import { URL_ENDPOINT } from '../../../common/constants/url-endpoint';

/** Trang Thông báo chỉ hiện thông báo trong N ngày gần nhất. */
const NOTIFICATION_DAYS = 30;
const PAGE_SIZE = 20;

interface NotificationGroup {
    label: string;
    items: StoreNotificationResponse[];
}

@Component({
    selector: 'app-page-agent-notifications',
    imports: [],
    templateUrl: './agent-notifications.html'
})
export class PageAgentNotificationsComponent {
    private readonly storeNotificationService = inject(StoreNotificationService);
    private readonly realtimeService = inject(RealtimeService);
    private readonly toastService = inject(ToastService);
    private readonly router = inject(Router);

    readonly days = NOTIFICATION_DAYS;

    notifications = signal<StoreNotificationResponse[]>([]);
    loading = signal(false);
    loadingMore = signal(false);
    isSubmitting = signal(false);

    page = signal(1);
    totalRecords = signal(0);
    unreadCount = signal(0);

    readonly hasMore = computed(() => this.notifications().length < this.totalRecords());

    /** Nhóm theo ngày: Hôm nay / Hôm qua / dd/MM/yyyy — danh sách đã sắp mới nhất trước. */
    readonly groups = computed<NotificationGroup[]>(() => {
        const groups: NotificationGroup[] = [];

        for (const notification of this.notifications()) {
            const label = this.getDayLabel(notification.createdAt);
            const last = groups[groups.length - 1];

            if (last?.label === label) {
                last.items.push(notification);
            } else {
                groups.push({ label, items: [notification] });
            }
        }

        return groups;
    });

    constructor() {
        this.loadFirstPage();

        // Có đơn mới trong lúc đang xem trang thì tải lại để thấy ngay.
        this.realtimeService.newOrder$
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.loadFirstPage());
    }

    loadFirstPage(): void {
        this.page.set(1);
        this.loading.set(true);
        this.fetch(1, items => this.notifications.set(items), () => this.loading.set(false));
    }

    loadMore(): void {
        if (this.loadingMore() || !this.hasMore()) return;

        const nextPage = this.page() + 1;

        this.loadingMore.set(true);
        this.fetch(nextPage, items => {
            this.page.set(nextPage);
            // Bỏ trùng phòng khi có thông báo mới chen vào làm lệch trang
            const existing = new Set(this.notifications().map(x => x.id));
            this.notifications.update(list => [...list, ...items.filter(x => !existing.has(x.id))]);
        }, () => this.loadingMore.set(false));
    }

    /** Bấm 1 lần: chỉ đánh dấu đã đọc. */
    markRead(notification: StoreNotificationResponse): void {
        const current = this.notifications().find(x => x.id === notification.id);

        if (!current || current.isRead) return;

        this.notifications.update(list => list.map(x => x.id === notification.id ? { ...x, isRead: true } : x));
        this.unreadCount.update(count => Math.max(0, count - 1));

        this.storeNotificationService.markRead(notification.id).subscribe({
            next: () => this.storeNotificationService.notifyChanged()
        });
    }

    /** Bấm đúp: mở chi tiết đơn hàng (lần bấm đầu đã đánh dấu đã đọc). */
    openOrder(notification: StoreNotificationResponse): void {
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
                this.notifications.update(list => list.map(x => ({ ...x, isRead: true })));
                this.unreadCount.set(0);
            },
            error: () => {
                this.isSubmitting.set(false);
                this.toastService.error('Thao tác thất bại');
            }
        });
    }

    getTitle(notification: StoreNotificationResponse): string {
        switch (notification.type) {
            case 'NEW_ORDER':
                return 'Có đơn hàng mới';
            default:
                return notification.type;
        }
    }

    formatCurrency(value: number | null): string {
        return value === null ? '' : `${value.toLocaleString('vi-VN')}đ`;
    }

    /** "Vừa xong", "5 phút trước", "3 giờ trước"; quá 1 ngày thì hiện giờ:phút. */
    getTimeText(createdAt: string): string {
        const date = new Date(createdAt);
        const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);

        if (diffMinutes < 1) return 'Vừa xong';
        if (diffMinutes < 60) return `${diffMinutes} phút trước`;
        if (diffMinutes < 24 * 60) return `${Math.floor(diffMinutes / 60)} giờ trước`;

        return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    }

    private fetch(page: number, onItems: (items: StoreNotificationResponse[]) => void, done: () => void): void {
        this.storeNotificationService.getMyStore(page, PAGE_SIZE, null, NOTIFICATION_DAYS).subscribe({
            next: response => {
                done();

                if (!response.isSuccess || !response.data) {
                    this.toastService.error(response.message || 'Không tải được thông báo');
                    return;
                }

                onItems(response.data.items);
                this.totalRecords.set(response.data.totalRecords);
                this.unreadCount.set(response.data.unreadCount);
            },
            error: () => {
                done();
                this.toastService.error('Không tải được thông báo');
            }
        });
    }

    private getDayLabel(createdAt: string): string {
        const date = new Date(createdAt);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return 'Hôm nay';
        if (date.toDateString() === yesterday.toDateString()) return 'Hôm qua';

        return date.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
    }
}
