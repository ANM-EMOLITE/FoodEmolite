import { Component, input, output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

type PageItem = number | '...';
type PaginationVariant = 'user' | 'admin';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pagination.html',
  host: {
    '(document:click)': 'closeSizeMenu()',
    '(window:resize)': 'closeSizeMenu()'
  }
})
export class PaginationComponent {
  currentPage = input.required<number>();
  totalPages = input.required<number>();
  variant = input<PaginationVariant>('user');

  /** Tổng số bản ghi — truyền vào thì thanh phân trang hiện "Hiển thị x-y / tổng bản ghi". */
  totalRecords = input<number | null>(null);

  /** Số bản ghi mỗi trang — truyền cùng `totalRecords` để hiện ô chọn "N / trang". */
  pageSize = input<number | null>(null);
  pageSizeOptions = input<number[]>([20, 50, 100]);

  pageChange = output<number>();
  pageSizeChange = output<number>();

  /** Vị trí menu chọn số bản ghi/trang (fixed để không bị overflow của bảng cắt mất). */
  sizeMenu = signal<{ top: number; left: number; width: number } | null>(null);

  private readonly sizeItemHeight = 36;

  showSummary = computed(() => this.totalRecords() !== null && this.pageSize() !== null);

  rangeText = computed(() => {
    const total = this.totalRecords() ?? 0;
    const size = this.pageSize() ?? 0;

    if (total === 0) {
      return 'Không có bản ghi';
    }

    const from = (this.currentPage() - 1) * size + 1;
    const to = Math.min(this.currentPage() * size, total);

    return `Hiển thị ${from}-${to} / ${total} bản ghi`;
  });

  pages = computed<PageItem[]>(() => {
    const total = this.totalPages();
    const current = this.currentPage();

    if (total <= 5) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages: PageItem[] = [1];

    if (current > 3) pages.push('...');

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);

    for (let i = start; i <= end; i++) pages.push(i);

    if (current < total - 2) pages.push('...');

    pages.push(total);

    return pages;
  });

  go(page: PageItem) {
    if (page === '...') return;
    if (page === this.currentPage()) return;
    this.pageChange.emit(page);
  }

  prev() {
    const c = this.currentPage();
    if (c > 1) this.pageChange.emit(c - 1);
  }

  next() {
    const c = this.currentPage();
    const t = this.totalPages();
    if (c < t) this.pageChange.emit(c + 1);
  }

  toggleSizeMenu(event: Event): void {
    event.stopPropagation();

    if (this.sizeMenu()) {
      this.sizeMenu.set(null);
      return;
    }

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const menuHeight = this.pageSizeOptions().length * this.sizeItemHeight + 8;
    const openUp = rect.bottom + menuHeight + 8 > window.innerHeight;

    this.sizeMenu.set({
      top: openUp ? rect.top - menuHeight - 4 : rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 120)
    });
  }

  selectSize(size: number, event: Event): void {
    event.stopPropagation();
    this.sizeMenu.set(null);

    if (size !== this.pageSize()) {
      this.pageSizeChange.emit(size);
    }
  }

  closeSizeMenu(): void {
    if (this.sizeMenu()) {
      this.sizeMenu.set(null);
    }
  }
}
