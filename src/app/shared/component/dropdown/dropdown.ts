import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  HostListener,
  ElementRef,
  forwardRef,
  inject
} from '@angular/core';

import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR
} from '@angular/forms';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FilterValue } from '../../../common/models/front-end/filter/filter-field.model';
import { normalizeVnText } from '../../../common/utils/vn-text';

export interface DropdownOption {
  label: string;
  value: FilterValue;
  disabled?: boolean;
}

@Component({
  selector: 'app-dropdown',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './dropdown.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DropdownComponent),
      multi: true
    }
  ]
})
export class DropdownComponent
  implements OnInit, OnChanges, ControlValueAccessor {
  @Input() options: DropdownOption[] = [];
  @Input() placeholder = 'Chọn một giá trị';
  @Input() searchable = false;
  @Input() searchPlaceholder = 'Tìm kiếm...';
  @Input() disabled = false;
  @Input() value: FilterValue = null;

  @Output() changed =
    new EventEmitter<DropdownOption | null>();

  private readonly el = inject(ElementRef<HTMLElement>);

  isOpen = false;
  searchQuery = '';
  filteredOptions: DropdownOption[] = [];
  selectedOption: DropdownOption | null = null;

  private onChange: (value: FilterValue) => void = () => {};
  private onTouched: () => void = () => {};

  ngOnInit(): void {
    this.filteredOptions = [...this.options];

    this.selectedOption =
      this.options.find(o => o.value === this.value)
      ?? null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['options']) {
      this.filteredOptions = [...this.options];
    }

    if (changes['value'] || changes['options']) {
      this.selectedOption =
        this.options.find(o => o.value === this.value)
        ?? null;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent): void {
    if (!this.el.nativeElement.contains(e.target as Node)) {
      this.isOpen = false;
      this.resetSearch();
    }
  }

  toggle(): void {
    if (this.disabled) {
      return;
    }

    this.isOpen = !this.isOpen;

    if (!this.isOpen) {
      this.resetSearch();
    }
  }

  select(option: DropdownOption): void {
    if (option.disabled) {
      return;
    }

    this.value = option.value;
    this.selectedOption = option;
    this.isOpen = false;

    this.resetSearch();

    this.onChange(this.value);
    this.onTouched();

    this.changed.emit(option);
  }

  onSearch(): void {
    const q = normalizeVnText(this.searchQuery);

    this.filteredOptions = q
      ? this.options.filter(o =>
          normalizeVnText(o.label).includes(q))
      : [...this.options];
  }

  writeValue(value: FilterValue): void {
    this.value = value;

    this.selectedOption =
      this.options.find(o => o.value === value)
      ?? null;
  }

  registerOnChange(
    fn: (value: FilterValue) => void
  ): void {
    this.onChange = fn;
  }

  registerOnTouched(
    fn: () => void
  ): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled = disabled;
  }

  private resetSearch(): void {
    this.searchQuery = '';
    this.filteredOptions = [...this.options];
  }
}