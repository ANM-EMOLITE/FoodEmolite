import { Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CreateInventoryStocktakeRequest } from '../../../../common/models/inventory.model';
import { StoreFoodResponse } from '../../../../common/models/store-food.model';
import { normalizeVnText } from '../../../../common/utils/vn-text';

interface StocktakeLine {
    food: StoreFoodResponse;
    actualQuantity: number;
    note: string;
}

@Component({
    selector: 'app-pop-up-inventory-stocktake',
    imports: [FormsModule],
    templateUrl: './pop-up-inventory-stocktake.html'
})
export class PopUpInventoryStocktakeComponent {
    readonly foods = input<StoreFoodResponse[]>([]);
    readonly isSubmitting = input(false);

    readonly closed = output<void>();
    readonly submitted = output<CreateInventoryStocktakeRequest>();

    note = '';

    readonly keyword = signal('');
    readonly onlyDifferent = signal(false);
    readonly lines = signal<StocktakeLine[]>([]);

    constructor() {
        effect(() => {
            this.lines.set(this.foods().map(food => ({ food, actualQuantity: food.quantity, note: '' })));
        });
    }

    readonly visibleLines = computed(() => {
        const q = normalizeVnText(this.keyword());

        return this.lines()
            .map((line, index) => ({ line, index }))
            .filter(({ line }) => !this.onlyDifferent() || this.difference(line) !== 0)
            .filter(({ line }) => !q || normalizeVnText(`${line.food.foodName} ${line.food.productCode}`).includes(q));
    });

    readonly changedLines = computed(() => this.lines().filter(line => this.difference(line) !== 0));
    readonly totalDifference = computed(() => this.changedLines().reduce((sum, line) => sum + this.difference(line), 0));
    readonly differenceValue = computed(() =>
        this.changedLines().reduce((sum, line) => sum + this.difference(line) * (line.food.costPrice ?? 0), 0));

    readonly isValid = computed(() =>
        this.lines().length > 0 &&
        this.lines().every(line => Number.isInteger(Number(line.actualQuantity)) && Number(line.actualQuantity) >= 0));

    difference(line: StocktakeLine): number {
        return Number(line.actualQuantity || 0) - line.food.quantity;
    }

    updateLine(index: number, patch: Partial<StocktakeLine>): void {
        this.lines.update(lines => lines.map((line, i) => i === index ? { ...line, ...patch } : line));
    }

    formatCurrency(value: number): string {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    }

    formatDifference(value: number): string {
        return value > 0 ? `+${value}` : `${value}`;
    }

    submit(): void {
        if (!this.isValid() || this.isSubmitting()) {
            return;
        }

        this.submitted.emit({
            note: this.note.trim() || null,
            items: this.lines().map(line => ({
                storeFoodId: line.food.id,
                actualQuantity: Number(line.actualQuantity),
                note: line.note.trim() || null
            }))
        });
    }
}
