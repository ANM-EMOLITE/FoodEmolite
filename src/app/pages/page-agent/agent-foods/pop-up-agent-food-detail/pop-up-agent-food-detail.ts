import { Component, EventEmitter, Input, OnChanges, Output, signal, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  StoreFoodResponse,
  UpdateStoreFoodRequest
} from '../../../../common/models/store-food.model';
import { DropdownComponent, DropdownOption } from '../../../../shared/component/dropdown/dropdown';
import { CheckboxComponent } from '../../../../shared/component/checkbox/checkbox';

@Component({
  selector: 'app-pop-up-agent-food-detail',
  imports: [FormsModule, DropdownComponent, CheckboxComponent],
  templateUrl: './pop-up-agent-food-detail.html'
})
export class PopUpAgentFoodDetailComponent implements OnChanges {
  @Input() food!: StoreFoodResponse;
  @Input() isOpen = false;
  @Input() isSubmitting = false;
  @Input() categoryOptions: DropdownOption[] = [];

  @Output() closed = new EventEmitter<void>();
  @Output() submitted = new EventEmitter<UpdateStoreFoodRequest>();
  @Output() deleted = new EventEmitter<number>();

  thumbnailPreview = signal<string | null>(null);

  form = signal<UpdateStoreFoodRequest>({
    foodName: '',
    productCode: '',
    thumbnailFile: null,
    thumbnailUrl: null,
    description: '',
    price: 0,
    quantity: 0,
    isAvailable: true,
    storeFoodCategoryId: null,
    optionGroups: []
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['food'] && this.food) {
      this.form.set({
        foodName: this.food.foodName,
        productCode: this.food.productCode,
        thumbnailFile: null,
        thumbnailUrl: this.food.thumbnailUrl,
        description: this.food.description,
        price: this.food.price,
        quantity: this.food.quantity,
        isAvailable: this.food.isAvailable,
        storeFoodCategoryId: this.food.storeFoodCategoryId ?? null,
        optionGroups: (this.food.optionGroups ?? []).map(group => ({
          id: group.id,
          groupName: group.groupName,
          isRequired: group.isRequired,
          minSelect: group.isRequired ? 1 : 0,
          maxSelect: 1,
          sortOrder: group.sortOrder,
          isDeleted: false,
          options: (group.options ?? []).map(option => ({
            id: option.id,
            optionName: option.optionName,
            additionalPrice: option.additionalPrice,
            isAvailable: option.isAvailable,
            sortOrder: option.sortOrder,
            isDeleted: false
          }))
        }))
      });

      this.thumbnailPreview.set(this.food.thumbnailUrl);
    }
  }

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
          id: null,
          groupName: '',
          isRequired: false,
          minSelect: 0,
          maxSelect: 1,
          sortOrder: value.optionGroups.length,
          isDeleted: false,
          options: []
        }
      ]
    }));
  }

  removeOptionGroup(groupIndex: number): void {
    this.form.update(value => {
      const optionGroups = [...value.optionGroups];

      optionGroups[groupIndex] = {
        ...optionGroups[groupIndex],
        isDeleted: true,
        options: optionGroups[groupIndex].options.map(option => ({
          ...option,
          isDeleted: true
        }))
      };

      return {
        ...value,
        optionGroups
      };
    });
  }

  addOption(groupIndex: number): void {
    this.form.update(value => {
      const optionGroups = [...value.optionGroups];
      const group = { ...optionGroups[groupIndex] };

      group.options = [
        ...group.options,
        {
          id: null,
          optionName: '',
          additionalPrice: 0,
          isAvailable: true,
          sortOrder: group.options.length,
          isDeleted: false
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
      const options = [...group.options];

      options[optionIndex] = {
        ...options[optionIndex],
        isDeleted: true
      };

      group.options = options;
      optionGroups[groupIndex] = group;

      return {
        ...value,
        optionGroups
      };
    });
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

  addDefaultOptions(): void {
    this.form.update(value => ({
      ...value,
      optionGroups: [
        ...value.optionGroups,
        {
          id: null,
          groupName: 'Độ ngọt',
          isRequired: true,
          minSelect: 1,
          maxSelect: 1,
          sortOrder: value.optionGroups.length,
          isDeleted: false,
          options: [
            { id: null, optionName: '0%', additionalPrice: 0, isAvailable: true, sortOrder: 0, isDeleted: false },
            { id: null, optionName: '25%', additionalPrice: 0, isAvailable: true, sortOrder: 1, isDeleted: false },
            { id: null, optionName: '50%', additionalPrice: 0, isAvailable: true, sortOrder: 2, isDeleted: false },
            { id: null, optionName: '75%', additionalPrice: 0, isAvailable: true, sortOrder: 3, isDeleted: false },
            { id: null, optionName: '100%', additionalPrice: 0, isAvailable: true, sortOrder: 4, isDeleted: false }
          ]
        },
        {
          id: null,
          groupName: 'Lượng đá',
          isRequired: true,
          minSelect: 1,
          maxSelect: 1,
          sortOrder: value.optionGroups.length + 1,
          isDeleted: false,
          options: [
            { id: null, optionName: 'Ít đá', additionalPrice: 0, isAvailable: true, sortOrder: 0, isDeleted: false },
            { id: null, optionName: 'Không đá', additionalPrice: 0, isAvailable: true, sortOrder: 1, isDeleted: false },
            { id: null, optionName: 'Nhiều đá', additionalPrice: 0, isAvailable: true, sortOrder: 2, isDeleted: false },
            { id: null, optionName: 'Bình thường', additionalPrice: 0, isAvailable: true, sortOrder: 3, isDeleted: false }
          ]
        }
      ]
    }));
  }

  submit(): void {
    this.normalizeOptionGroups();

    const request = this.form();

    this.submitted.emit({
      ...request,
      optionGroups: request.optionGroups.filter(group =>
        group.id !== null ||
        group.isDeleted ||
        group.groupName.trim() ||
        group.options.some(option =>
          option.id !== null ||
          option.isDeleted ||
          option.optionName.trim()
        )
      )
    });
  }

  delete(): void {
    this.deleted.emit(this.food.id);
  }

  close(): void {
    this.closed.emit();
  }
}