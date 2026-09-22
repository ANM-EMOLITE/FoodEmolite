import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Checkbox tự thiết kế (thay cho <input type="checkbox"> mặc định của trình duyệt).
 * Không giữ state riêng: hiển thị theo `checked` / `indeterminate` truyền vào và phát `changed`
 * với giá trị mới để component cha quyết định.
 */
@Component({
  selector: 'app-checkbox',
  standalone: true,
  templateUrl: './checkbox.html'
})
export class CheckboxComponent {
  @Input() checked = false;
  @Input() indeterminate = false;
  @Input() disabled = false;

  @Output() changed = new EventEmitter<boolean>();

  get active(): boolean {
    return this.checked || this.indeterminate;
  }

  get boxClass(): string {
    const base =
      'group inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border-2 outline-none transition-all duration-150 focus-visible:ring-4 focus-visible:ring-[#6d28d9]/20';

    const state = this.active
      ? 'bg-[#6d28d9] border-[#6d28d9]'
      : this.disabled
        ? 'bg-[#ffffff] border-[#c4b5fd]'
        : 'bg-[#ffffff] border-[#c4b5fd] hover:border-[#6d28d9] hover:bg-[#f5f3ff]';

    const cursor = this.disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer';

    return `${base} ${state} ${cursor}`;
  }

  toggle(event: Event): void {
    // Không để click lan lên dòng của bảng (dòng cũng có xử lý click).
    event.stopPropagation();

    if (this.disabled) {
      return;
    }

    // Đang ở trạng thái "một phần" thì bấm vào là chọn hết, giống checkbox gốc.
    this.changed.emit(this.indeterminate ? true : !this.checked);
  }
}
