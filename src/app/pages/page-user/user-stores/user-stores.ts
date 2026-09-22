import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { StoreService } from '../../../common/services/store.service';
import { ToastService } from '../../../common/services/toast.service';
import { StoreResponse } from '../../../common/models/store.model';
import { URL_ENDPOINT } from '../../../common/constants/url-endpoint';
import { SelectedStoreService } from '../../../common/services/selectedstore.service';

@Component({
  selector: 'app-page-user-stores',
  imports: [],
  templateUrl: './user-stores.html'
})
export class PageUserStoresComponent {
  private readonly storeService = inject(StoreService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly selectedStoreService = inject(SelectedStoreService);

  stores = signal<StoreResponse[]>([]);
  loading = signal(false);
  keyword = signal('');

  page = signal(1);
  pageSize = signal(20);

  featuredStore = computed<StoreResponse | null>(() => this.stores()[0] ?? null);

  filteredStores = computed<StoreResponse[]>(() => {
    const keyword = this.normalize(this.keyword());

    if (!keyword) {
      return this.stores();
    }

    return this.stores().filter(store =>
      this.normalize(`${store.storeName} ${store.address ?? ''} ${store.description ?? ''}`).includes(keyword)
    );
  });

  readonly steps = [
    { title: 'Chọn cửa hàng', desc: 'Tìm quán bạn thích trong danh sách bên dưới.' },
    { title: 'Chọn món', desc: 'Xem thực đơn, thêm món và nhận khuyến mãi.' },
    { title: 'Đặt & thanh toán', desc: 'Tiền mặt hoặc quét mã QR chuyển khoản.' }
  ];

  constructor() {
    this.loadStores();
  }

  loadStores(): void {
    this.loading.set(true);

    this.storeService.getAll(
      this.page(),
      this.pageSize()
    ).subscribe({
      next: response => {
        this.loading.set(false);
        this.stores.set(
          response.items.filter(store => store.isActive)
        );
      },
      error: () => {
        this.loading.set(false);
        this.toastService.error('Không tải được danh sách cửa hàng');
      }
    });
  }

  onKeywordInput(event: Event): void {
    this.keyword.set((event.target as HTMLInputElement).value);
  }

  clearKeyword(): void {
    this.keyword.set('');
  }

  openStoreFoods(store: StoreResponse): void {
    this.selectedStoreService.setStore(store);
    this.router.navigate([
      '/',
      URL_ENDPOINT.USER,
      URL_ENDPOINT.USER_STORE_FOODS,
      URL_ENDPOINT.USER_ORDER
    ]);
  }

  /** Bỏ dấu + hạ chữ thường để tìm kiếm tiếng Việt không phân biệt dấu. */
  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .trim();
  }
}
