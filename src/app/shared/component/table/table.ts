import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener
} from '@angular/core';

import { CommonModule } from '@angular/common';
import {
  TableColumn,
  TableCellValue,
  TableRow,
  TableAction,
  TableProductValue
} from '../../../common/models/front-end/table/table-column.model';
import { PaginationComponent } from '../pagination/pagination';
import { CheckboxComponent } from '../checkbox/checkbox';
import { TooltipComponent } from '../tooltip/tooltip';

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [CommonModule, PaginationComponent, CheckboxComponent, TooltipComponent],
  templateUrl: './table.html'
})
export class AppTableComponent {
  @Input() columns: TableColumn[] = [];
  @Input() rows: TableRow[] = [];
  @Input() currentPage = 1;
  @Input() totalPages = 1;

  /** Truyền cả totalRecords + pageSize để thanh phân trang hiện tóm tắt và ô chọn số bản ghi / trang. */
  @Input() totalRecords: number | null = null;
  @Input() pageSize: number | null = null;
  @Input() loading = false;
  @Input() sortBy = '';
  @Input() asc = false;
  @Input() emptyText = 'Không có dữ liệu';

  /** Danh sách thao tác của từng dòng cho cột type 'actions' (có thể khác nhau theo trạng thái dòng). */
  @Input() rowActions: ((row: TableRow) => TableAction[]) | null = null;

  /** Bấm vào dòng sẽ tick/bỏ tick checkbox (rowCheckChange) thay vì phát rowClick. */
  @Input() rowClickToggle = false;

  /** Dòng nào được "chọn tất cả" chọn vào (dòng còn lại vẫn tick tay được). Không truyền = mọi dòng. */
  @Input() rowSelectable: ((row: TableRow) => boolean) | null = null;

  /** Dòng bị khoá hẳn checkbox: không tick được, kể cả bấm thẳng vào dòng. Không truyền = không dòng nào bị khoá. */
  @Input() rowCheckDisabled: ((row: TableRow) => boolean) | null = null;

  /** Cột type 'toggle' bị khoá, không bấm đổi được. Không truyền = không dòng nào bị khoá. */
  @Input() rowToggleDisabled: ((row: TableRow) => boolean) | null = null;

  @Output() sortChange = new EventEmitter<string>();
  @Output() rowClick = new EventEmitter<TableRow>();
  @Output() rowDblClick = new EventEmitter<TableRow>();
  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();
  @Output() toggleChange = new EventEmitter<{ row: TableRow; value: boolean }>();

  @Output() rowCheckChange = new EventEmitter<{
    row: TableRow;
    checked: boolean;
  }>();

  @Output() allCheckChange = new EventEmitter<boolean>();

  @Output() actionClick = new EventEmitter<{ row: TableRow; action: string }>();

  /** Menu thao tác đang mở — vẽ dạng fixed để không bị overflow của bảng cắt mất. */
  menu: { row: TableRow; actions: TableAction[]; top: number; left: number } | null = null;

  private readonly menuWidth = 208;
  private readonly menuItemHeight = 40;

  trackByColumn(_: number, item: TableColumn): string {
    return item.key;
  }

  getValue(row: TableRow, key: string): TableCellValue {
    return row[key];
  }

  getDisplayValue(row: TableRow, key: string): string {
    const value = row[key];

    if (
      value &&
      typeof value === 'object' &&
      'text' in value &&
      typeof value['text'] === 'string'
    ) {
      return value['text'];
    }

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return String(value);
    }

    return '';
  }

  getRawValue(row: TableRow, key: string): string {
    const value = row[key];

    if (
      value &&
      typeof value === 'object' &&
      'value' in value &&
      typeof value['value'] === 'string'
    ) {
      return value['value'];
    }

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return String(value);
    }

    return '';
  }

  getProductValue(row: TableRow, key: string): TableProductValue | null {
    const value = row[key];

    if (value && typeof value === 'object' && 'text' in value) {
      return value as TableProductValue;
    }

    return null;
  }

  getBadgeClass(row: TableRow, key: string): string {
    const value = this.getRawValue(row, key);

    switch (value) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-700';

      case 'CONFIRMED':
        return 'bg-blue-100 text-blue-700';

      case 'UNPAID':
        return 'bg-yellow-100 text-yellow-700';

      case 'CANCELLED':
        return 'bg-red-100 text-red-700';

      case 'PAID':
        return 'bg-green-100 text-green-700';

      case 'DRAFT':
        return 'bg-gray-100 text-gray-700';

      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-700';

      case 'ACTIVE':
        return 'bg-green-100 text-green-700';

      case 'PAUSED':
        return 'bg-yellow-100 text-yellow-700';

      case 'ENDED':
        return 'bg-red-100 text-red-700';

      case 'PROMO':
        return 'bg-violet-500/15 text-violet-300';

      case 'GUEST':
        return 'bg-blue-100 text-blue-700';

      case 'MEMBER':
        return 'bg-green-100 text-green-700';

      default:
        return 'bg-gray-100 text-gray-700';
    }
  }

  getDateValue(row: TableRow, key: string): string | number | Date | null {
    const value = row[key];

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      value instanceof Date
    ) {
      return value;
    }

    return null;
  }

  /** Các dòng được "chọn tất cả" tác động tới (mặc định là mọi dòng). */
  selectableRows(): TableRow[] {
    return this.rowSelectable ? this.rows.filter(row => this.rowSelectable!(row)) : this.rows;
  }

  isAllChecked(): boolean {
    const selectable = this.selectableRows();

    return selectable.length > 0 && selectable.every(row => !!row['selected']);
  }

  isIndeterminate(): boolean {
    const checkedCount = this.rows.filter(row => !!row['selected']).length;

    return checkedCount > 0 && !this.isAllChecked();
  }

  isRowCheckDisabled(row: TableRow): boolean {
    return !!this.rowCheckDisabled && this.rowCheckDisabled(row);
  }

  onToggleRow(row: TableRow, checked: boolean): void {
    if (this.isRowCheckDisabled(row)) {
      return;
    }

    this.rowCheckChange.emit({
      row,
      checked
    });
  }

  isToggleDisabled(row: TableRow): boolean {
    return !!this.rowToggleDisabled && this.rowToggleDisabled(row);
  }

  onToggle(row: TableRow, key: string, event: Event): void {
    event.stopPropagation();

    if (this.isToggleDisabled(row)) {
      return;
    }

    const current = !!row[key];
    this.toggleChange.emit({ row, value: !current });
  }

  toggleMenu(row: TableRow, event: Event): void {
    event.stopPropagation();

    if (this.menu?.row === row) {
      this.menu = null;
      return;
    }

    const actions = this.rowActions?.(row) ?? [];

    if (actions.length === 0) {
      this.menu = null;
      return;
    }

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const menuHeight = actions.length * this.menuItemHeight + 12;
    const openUp = rect.bottom + menuHeight + 8 > window.innerHeight;

    this.menu = {
      row,
      actions,
      top: openUp ? rect.top - menuHeight - 4 : rect.bottom + 4,
      left: Math.max(8, rect.right - this.menuWidth)
    };
  }

  onActionSelect(action: TableAction, event: Event): void {
    event.stopPropagation();

    if (!this.menu) {
      return;
    }

    const row = this.menu.row;
    this.menu = null;
    this.actionClick.emit({ row, action: action.key });
  }

  getActionClass(action: TableAction): string {
    switch (action.tone) {
      case 'info':
        return 'text-blue-600 hover:bg-blue-50';
      case 'success':
        return 'text-green-700 hover:bg-green-50';
      case 'danger':
        return 'text-red-600 hover:bg-red-50';
      default:
        return 'text-gray-700 hover:bg-gray-100';
    }
  }

  @HostListener('document:click')
  @HostListener('window:resize')
  closeMenu(): void {
    this.menu = null;
  }

  onToggleAll(checked: boolean): void {
    this.allCheckChange.emit(checked);
  }

  onRowClick(row: TableRow): void {
    // Chế độ chọn dòng: bấm vào dòng = tick/bỏ tick checkbox thay vì mở chi tiết.
    if (this.rowClickToggle) {
      if (this.isRowCheckDisabled(row)) {
        return;
      }

      this.rowCheckChange.emit({ row, checked: !row['selected'] });
      return;
    }

    this.rowClick.emit(row);
  }

  onRowDblClick(row: TableRow): void {
    this.rowDblClick.emit(row);
  }

  onPageChange(page: number): void {
    this.pageChange.emit(page);
  }

  onPageSizeChange(size: number): void {
    this.pageSizeChange.emit(size);
  }

  onSort(column: TableColumn): void {
    if (!column.sortable || column.type === 'checkbox') {
      return;
    }

    this.sortChange.emit(column.key);
  }
}