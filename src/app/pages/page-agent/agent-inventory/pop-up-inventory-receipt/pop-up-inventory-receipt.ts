import { Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CreateInventoryReceiptRequest } from '../../../../common/models/inventory.model';
import { StoreFoodResponse } from '../../../../common/models/store-food.model';
import { SearchSelectComponent, SearchSelectOption } from '../../../../shared/component/search-select/search-select';

interface ReceiptLine {
    food: StoreFoodResponse;
    quantity: number;
    unitCost: number;
}

@Component({
    selector: 'app-pop-up-inventory-receipt',
    imports: [FormsModule, SearchSelectComponent],
    templateUrl: './pop-up-inventory-receipt.html'
})
export class PopUpInventoryReceiptComponent {
    readonly foods = input<StoreFoodResponse[]>([]);
    readonly isSubmitting = input(false);

    readonly closed = output<void>();
    readonly submitted = output<CreateInventoryReceiptRequest>();

    supplierName = '';
    note = '';

    readonly lines = signal<ReceiptLine[]>([]);

    readonly foodOptions = computed<SearchSelectOption[]>(() => {
        const picked = new Set(this.lines().map(x => x.food.id));

        return this.foods()
            .filter(food => !picked.has(food.id))
            .map(food => ({ value: String(food.id), label: `${food.foodName} (${food.productCode})` }));
    });

    readonly totalQuantity = computed(() => this.lines().reduce((sum, x) => sum + (x.quantity || 0), 0));
    readonly totalAmount = computed(() => this.lines().reduce((sum, x) => sum + (x.quantity || 0) * (x.unitCost || 0), 0));

    readonly isValid = computed(() =>
        this.lines().length > 0 &&
        this.lines().every(x => x.quantity > 0 && x.unitCost >= 0));

    addFood(option: SearchSelectOption): void {
        const food = this.foods().find(x => String(x.id) === option.value);

        if (!food) {
            return;
        }

        this.lines.update(lines => [...lines, { food, quantity: 1, unitCost: food.costPrice ?? 0 }]);
    }

    updateLine(index: number, patch: Partial<ReceiptLine>): void {
        this.lines.update(lines => lines.map((line, i) => i === index ? { ...line, ...patch } : line));
    }

    removeLine(index: number): void {
        this.lines.update(lines => lines.filter((_, i) => i !== index));
    }

    formatCurrency(value: number): string {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    }

    submit(): void {
        if (!this.isValid() || this.isSubmitting()) {
            return;
        }

        this.submitted.emit({
            supplierName: this.supplierName.trim() || null,
            note: this.note.trim() || null,
            items: this.lines().map(x => ({
                storeFoodId: x.food.id,
                quantity: Number(x.quantity),
                unitCost: Number(x.unitCost)
            }))
        });
    }
}
