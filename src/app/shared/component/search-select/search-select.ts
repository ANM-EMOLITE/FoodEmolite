import { Component, computed, ElementRef, HostListener, inject, input, output, signal, viewChild } from '@angular/core';
import { normalizeVnText } from '../../../common/utils/vn-text';

export interface SearchSelectOption {
    value: string;
    label: string;
}

/**
 * Ô chọn có tìm kiếm (không phân biệt dấu). Chỉ dùng các class màu đã được map ở cả 2 theme
 * (text-white, bg-white/5, border-white/10, bg-[#130f21]...) nên hiển thị đúng trong .user-theme-scope lẫn trang agent.
 */
@Component({
    selector: 'app-search-select',
    templateUrl: './search-select.html'
})
export class SearchSelectComponent {
    private readonly el = inject(ElementRef<HTMLElement>);

    readonly options = input<SearchSelectOption[]>([]);
    readonly value = input<string | null>(null);
    readonly placeholder = input('Chọn một giá trị');
    readonly searchPlaceholder = input('Tìm kiếm...');
    readonly disabled = input(false);
    readonly loading = input(false);

    readonly selected = output<SearchSelectOption>();

    private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

    readonly isOpen = signal(false);
    readonly query = signal('');

    readonly selectedLabel = computed(() => this.options().find(o => o.value === this.value())?.label ?? null);

    readonly filteredOptions = computed(() => {
        const q = normalizeVnText(this.query());

        return q ? this.options().filter(o => normalizeVnText(o.label).includes(q)) : this.options();
    });

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
        if (this.isOpen() && !this.el.nativeElement.contains(event.target as Node)) {
            this.close();
        }
    }

    toggle(): void {
        if (this.disabled() || this.loading()) return;

        if (this.isOpen()) {
            this.close();
            return;
        }

        this.isOpen.set(true);
        setTimeout(() => this.searchInput()?.nativeElement.focus());
    }

    choose(option: SearchSelectOption): void {
        this.selected.emit(option);
        this.close();
    }

    /** Enter chọn luôn kết quả đầu tiên, Esc đóng. */
    onSearchKeydown(event: KeyboardEvent): void {
        if (event.key === 'Enter') {
            event.preventDefault();
            const first = this.filteredOptions()[0];

            if (first) this.choose(first);
        } else if (event.key === 'Escape') {
            this.close();
        }
    }

    private close(): void {
        this.isOpen.set(false);
        this.query.set('');
    }
}
