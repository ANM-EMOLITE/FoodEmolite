import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { RealtimeService } from '../../../common/services/realtime.service';
import { NotificationSoundService } from '../../../common/services/notification-sound.service';
import { ProfileService } from '../../../common/services/profile.service';
import { PosSearchService } from '../../../common/services/pos-search.service';
import { StoreNotificationService } from '../../../common/services/store-notification.service';
import { StoreNotificationResponse } from '../../../common/models/store-notification.model';
import { URL_ENDPOINT } from '../../../common/constants/url-endpoint';

const NOTIFICATION_PAGE_SIZE = 20;

@Component({
  selector: 'app-agent-topbar',
  imports: [],
  templateUrl: './agent-topbar.html'
})
export class AgentTopbarComponent {
  private readonly router = inject(Router);
  private readonly realtimeService = inject(RealtimeService);
  private readonly notificationSoundService = inject(NotificationSoundService);

  private readonly profileService = inject(ProfileService);
  readonly posSearchService = inject(PosSearchService);
  private readonly storeNotificationService = inject(StoreNotificationService);

  title = signal('');

  /** Thông báo đã lưu ở BE (mới nhất trước) — tải lại mỗi khi topbar được tạo nên không mất khi reload / chuyển agent ↔ POS. */
  notifications = signal<StoreNotificationResponse[]>([]);
  /** Dùng chung với sidebar (badge mục "Thông Báo") qua StoreNotificationService. */
  unreadCount = this.storeNotificationService.unreadCount;
  isNotificationsOpen = signal(false);

  storeRefCode = signal<string | null>(null);
  storeName = signal('');
  isPosMode = signal(this.isPosUrl(this.router.url));

  constructor() {
    queueMicrotask(() => this.setHeader());

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(event => {
        this.isPosMode.set(this.isPosUrl((event as NavigationEnd).urlAfterRedirects));

        if (!this.isPosMode()) {
          this.posSearchService.keyword.set('');
        }

        this.setHeader();
      });

    this.profileService.getMyProfile().subscribe({
      next: response => {
        const store = response.data?.store;

        if (response.isSuccess && store) {
          this.storeRefCode.set(store.refCode);
          this.storeName.set(store.storeName);
        }
      }
    });

    this.loadNotifications();

    // Trang Thông báo đánh dấu đã đọc → tải lại để số trên chuông khớp.
    this.storeNotificationService.changed$
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.loadNotifications());

    this.realtimeService.newOrder$.pipe(takeUntilDestroyed()).subscribe(notification => {
      // Đã có trong danh sách (vd: vừa tải lại từ BE) thì bỏ qua để không đếm trùng.
      if (this.notifications().some(n => n.id === notification.notificationId)) {
        return;
      }

      const item: StoreNotificationResponse = {
        id: notification.notificationId,
        type: 'NEW_ORDER',
        orderId: notification.orderId,
        orderCode: notification.orderCode,
        storeRefCode: notification.storeRefCode,
        customerName: notification.customerName,
        totalAmount: notification.totalAmount,
        isRead: false,
        createdAt: notification.createdAt
      };

      this.notifications.update(list => [item, ...list].slice(0, NOTIFICATION_PAGE_SIZE));
      this.unreadCount.update(count => count + 1);
      this.notificationSoundService.playNewOrder();

      // Đang mở sẵn danh sách thì coi như đã xem luôn.
      if (this.isNotificationsOpen()) {
        this.markAllRead();
      }
    });
  }

  private loadNotifications(): void {
    this.storeNotificationService.getMyStore(1, NOTIFICATION_PAGE_SIZE).subscribe({
      next: response => {
        if (!response.isSuccess || !response.data) {
          return;
        }

        this.notifications.set(response.data.items);
        this.unreadCount.set(response.data.unreadCount);
      }
    });
  }

  private markAllRead(): void {
    if (this.unreadCount() === 0) {
      return;
    }

    this.notifications.update(list => list.map(n => ({ ...n, isRead: true })));
    this.unreadCount.set(0);
    this.storeNotificationService.markAllRead().subscribe();
  }

  viewAllNotifications(): void {
    this.isNotificationsOpen.set(false);
    this.router.navigate(['/', URL_ENDPOINT.AGENT, URL_ENDPOINT.AGENT_NOTIFICATIONS]);
  }

  openNotification(notification: StoreNotificationResponse): void {
    this.isNotificationsOpen.set(false);

    if (!notification.orderId) {
      return;
    }

    this.router.navigate(['/', URL_ENDPOINT.AGENT, URL_ENDPOINT.AGENT_ORDERS, notification.orderId]);
  }

  togglePosMode(): void {
    if (this.isPosMode()) {
      this.router.navigate(['/', URL_ENDPOINT.AGENT]);
      return;
    }

    const refCode = this.storeRefCode();

    if (!refCode) {
      return;
    }

    this.router.navigate(['/', URL_ENDPOINT.POS], { queryParams: { storeRefCode: refCode } });
  }

  private isPosUrl(url: string): boolean {
    return url.split('?')[0].split('#')[0] === `/${URL_ENDPOINT.POS}`;
  }

  toggleNotifications(): void {
    this.isNotificationsOpen.update(value => !value);

    if (this.isNotificationsOpen()) {
      this.markAllRead();
    }
  }

  formatCurrency(value: number | null): string {
    return `${(value ?? 0).toLocaleString('vi-VN')}đ`;
  }

  /** Hôm nay chỉ hiện giờ, ngày khác hiện kèm ngày — vì thông báo giờ được lưu lại lâu dài. */
  formatTime(value: string): string {
    const date = new Date(value);
    const time = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    if (date.toDateString() === new Date().toDateString()) {
      return time;
    }

    return `${time} ${date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`;
  }

  private setHeader(): void {
    let route = this.router.routerState.root;

    while (route.firstChild) {
      route = route.firstChild;
    }

    this.title.set(route.snapshot.data?.['title'] ?? '');
  }
}