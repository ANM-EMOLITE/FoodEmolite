import { Component, computed, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { StoreFoodService } from '../../../../common/services/store-food.service';
import { FormsModule } from '@angular/forms';
import { CreateBulkStoreFoodRequest, CreateStoreFoodRequest } from '../../../../common/models/store-food.model';
import { DropdownComponent, DropdownOption } from '../../../../shared/component/dropdown/dropdown';

@Component({
  selector: 'app-pop-up-agent-food-add',
  imports: [FormsModule, DropdownComponent],
  templateUrl: './pop-up-agent-food-add.html'
})
export class PopUpAgentFoodAddComponent {
  @Input() storeRefCode = '';
  @Input() isSubmitting = false;
  @Input() categoryOptions: DropdownOption[] = [];
  
  @Output() closed = new EventEmitter<void>();
  @Output() submitted = new EventEmitter<CreateStoreFoodRequest>();
  @Output() bulkSubmitted = new EventEmitter<CreateBulkStoreFoodRequest>();

  private readonly storeFoodService = inject(StoreFoodService);

  thumbnailPreview = signal<string | null>(null);

  formError = signal<string | null>(null);
  productCodeError = signal<string | null>(null);
  isCheckingCode = signal(false);

  checkProductCode(onValid?: () => void): void {
    const code = (this.form().productCode ?? '').trim();

    this.productCodeError.set(null);

    if (!code) {
      onValid?.();
      return;
    }

    this.isCheckingCode.set(true);

    this.storeFoodService.checkProductCode(code).subscribe({
      next: response => {
        this.isCheckingCode.set(false);

        if (response.isSuccess && response.data) {
          this.productCodeError.set(`Mã "${code}" đã tồn tại`);
          return;
        }

        onValid?.();
      },
      error: () => {
        this.isCheckingCode.set(false);
        onValid?.();
      }
    });
  }

  mode = signal<'single' | 'bulk'>('single');
  bulkText = signal('');
  bulkCategoryId = signal<number>(0);

  bulkNames = computed(() => this.parseFoodNames(this.bulkText()));

  private parseFoodNames(text: string): string[] {
    const trimmed = text.trim();

    if (!trimmed) return [];

    let lines: string[];

    try {
      const parsed = JSON.parse(trimmed);
      const list = Array.isArray(parsed) ? parsed : parsed?.foodNames;
      lines = Array.isArray(list) ? list.map(x => String(x)) : trimmed.split(/\r?\n/);
    } catch {
      lines = trimmed.split(/\r?\n/);
    }

    const numberPattern = /^\s*\d+\s*[.)\-:]\s*/;
    const hasNumbered = lines.some(line => numberPattern.test(line));

    const names = lines
      .filter(line => !hasNumbered || numberPattern.test(line))
      .map(line => line.replace(numberPattern, '').trim())
      .filter(line => line.length > 0);

    return [...new Set(names)];
  }

  submitBulk(): void {
    this.bulkSubmitted.emit({
      storeFoodCategoryId: this.bulkCategoryId(),
      foodNames: this.bulkNames()
    });
  }

  form = signal<CreateStoreFoodRequest>({
    storeRefCode: '',
    foodName: '',
    productCode: '',
    thumbnailFile: null,
    description: '',
    price: 0,
    costPrice: 0,
    quantity: 0,
    storeFoodCategoryId: 0,
    isPayLater: false,
    optionGroups: []
  });

  onThumbnailChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    this.form.update(value => ({
      ...value,
      thumbnailFile: file
    }));

    this.thumbnailPreview.set(URL.createObjectURL(file));
  }

  addOptionGroup(): void {
    this.form.update(value => ({
      ...value,
      optionGroups: [
        ...value.optionGroups,
        {
          groupName: '',
          isRequired: false,
          minSelect: 0,
          maxSelect: 1,
          sortOrder: value.optionGroups.length,
          options: []
        }
      ]
    }));
  }

  removeOptionGroup(groupIndex: number): void {
    this.form.update(value => ({
      ...value,
      optionGroups: value.optionGroups.filter((_, index) => index !== groupIndex)
    }));
  }

  addOption(groupIndex: number): void {
    this.form.update(value => {
      const optionGroups = [...value.optionGroups];
      const group = { ...optionGroups[groupIndex] };

      group.options = [
        ...group.options,
        {
          optionName: '',
          additionalPrice: 0,
          isAvailable: true,
          sortOrder: group.options.length
        }
      ];

      optionGroups[groupIndex] = group;

      return {
        ...value,
        optionGroups
      };
    });
  }

  removeOption(groupIndex: number, optionIndex: number): void {
    this.form.update(value => {
      const optionGroups = [...value.optionGroups];
      const group = { ...optionGroups[groupIndex] };

      group.options = group.options.filter((_, index) => index !== optionIndex);
      optionGroups[groupIndex] = group;

      return {
        ...value,
        optionGroups
      };
    });
  }

  addDefaultOptions(): void {
    this.form.update(value => ({
      ...value,
      optionGroups: [
        ...value.optionGroups,
        {
          groupName: 'Độ ngọt',
          isRequired: true,
          minSelect: 1,
          maxSelect: 1,
          sortOrder: value.optionGroups.length,
          options: [
            { optionName: '0%', additionalPrice: 0, isAvailable: true, sortOrder: 0 },
            { optionName: '25%', additionalPrice: 0, isAvailable: true, sortOrder: 1 },
            { optionName: '50%', additionalPrice: 0, isAvailable: true, sortOrder: 2 },
            { optionName: '75%', additionalPrice: 0, isAvailable: true, sortOrder: 3 },
            { optionName: '100%', additionalPrice: 0, isAvailable: true, sortOrder: 4 }
          ]
        },
        {
          groupName: 'Lượng đá',
          isRequired: true,
          minSelect: 1,
          maxSelect: 1,
          sortOrder: value.optionGroups.length + 1,
          options: [
            { optionName: 'Ít đá', additionalPrice: 0, isAvailable: true, sortOrder: 0 },
            { optionName: 'Không đá', additionalPrice: 0, isAvailable: true, sortOrder: 1 },
            { optionName: 'Nhiều đá', additionalPrice: 0, isAvailable: true, sortOrder: 2 },
            { optionName: 'Bình thường', additionalPrice: 0, isAvailable: true, sortOrder: 3 }
          ]
        }
      ]
    }));
  }

  private normalizeOptionGroups(): void {
    this.form.update(value => ({
      ...value,
      optionGroups: value.optionGroups.map((group, groupIndex) => ({
        ...group,
        minSelect: group.isRequired ? 1 : 0,
        maxSelect: 1,
        sortOrder: groupIndex,
        options: group.options.map((option, optionIndex) => ({
          ...option,
          sortOrder: optionIndex,
          isAvailable: option.isAvailable ?? true,
          additionalPrice: option.additionalPrice ?? 0
        }))
      }))
    }));
  }

  submit(): void {
    this.formError.set(null);

    if (!this.form().foodName?.trim()) {
      this.formError.set('Vui lòng nhập tên món');
      return;
    }

    if (!this.form().storeFoodCategoryId) {
      this.formError.set('Vui lòng chọn danh mục');
      return;
    }

    this.checkProductCode(() => {
      this.normalizeOptionGroups();

      this.submitted.emit({
        ...this.form(),
        storeRefCode: this.storeRefCode
      });
    });
  }

  close(): void {
    this.closed.emit();
  }
}